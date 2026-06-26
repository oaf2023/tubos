const { join } = require('path')
const { existsSync } = require('fs')
const { spawn, execSync } = require('child_process')

const root = __dirname
const standaloneDir = join(root, '.next', 'standalone')
const serverPath = join(standaloneDir, 'server.js')
const dbDir = join(root, 'prisma', 'db')
const dbPath = join(dbDir, 'custom.db')

if (!existsSync(serverPath)) {
  console.error('ERROR: Standalone server not found at', serverPath)
  console.error('Run "npm run build" first.')
  process.exit(1)
}

process.env.NODE_ENV = 'production'

// Detect database type
const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')

if (isPostgres) {
  console.log(`[start] Database: PostgreSQL (${process.env.DATABASE_URL.split('@')[1] || 'remote'})`)
  console.log(`[start] Server: ${serverPath}`)
  console.log(`[start] Port: ${process.env.PORT || 3000}`)

  // Regenerate Prisma client for PostgreSQL (engine binary differs from SQLite)
  try {
    execSync(`npx prisma generate --schema=prisma/schema.postgres.prisma 2>&1`, {
      cwd: root,
      env: { ...process.env },
      stdio: 'inherit',
    })
    console.log('[start] Prisma client regenerated for PostgreSQL')
  } catch (e) {
    console.warn('[start] Prisma generate failed:', e.message || e)
  }

  // Run controlled migrations for PostgreSQL
  try {
    execSync(`npx prisma migrate deploy --schema=prisma/schema.postgres.prisma 2>&1`, {
      cwd: root,
      env: { ...process.env },
      stdio: 'inherit',
    })
    console.log('[start] PostgreSQL migrations applied')
  } catch (e) {
    console.warn('[start] Migration failed, trying db push:', e.message || e)
    try {
      execSync(`npx prisma db push --schema=prisma/schema.postgres.prisma 2>&1`, {
        cwd: root,
        env: { ...process.env },
        stdio: 'inherit',
      })
      console.log('[start] PostgreSQL schema synced')
    } catch (e2) {
      console.warn('[start] PostgreSQL sync failed:', e2.message || e2)
    }
  }

  // Seed initial admin user if database is empty
  try {
    execSync(`node -e "
      const { PrismaClient } = require('@prisma/client')
      const bcrypt = require('bcryptjs')
      async function seed() {
        const p = new PrismaClient()
        const count = await p.usuario.count()
        if (count === 0) {
          const hash = await bcrypt.hash('admin123', 10)
          await p.usuario.create({
            data: { nombre: 'Administrador', usuario: 'admin', password: hash, nivelAcceso: 5, activo: true },
          })
          console.log('[seed] Admin user created: admin / admin123')
        } else {
          console.log('[seed] Users exist (' + count + '), skipping seed')
        }
        await p.\$disconnect()
      }
      seed().catch(e => { console.error('[seed] Error:', e.message); process.exit(1) })
    "`, {
      cwd: root,
      env: { ...process.env },
      stdio: 'inherit',
    })
    console.log('[start] Seed check complete')
  } catch (e) {
    console.warn('[start] Seed check failed (non-fatal):', e.message || e)
  }
} else {
  // SQLite fallback
  if (!existsSync(dbDir)) {
    const { mkdirSync } = require('fs')
    mkdirSync(dbDir, { recursive: true })
  }
  process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${dbPath}`

  console.log(`[start] Database: ${process.env.DATABASE_URL}`)
  console.log(`[start] Server: ${serverPath}`)
  console.log(`[start] Port: ${process.env.PORT || 3000}`)

  try {
    execSync(`npx prisma db push --skip-generate 2>&1`, {
      cwd: root,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    })
    console.log('[start] SQLite schema synced')
  } catch (e) {
    console.warn('[start] SQLite sync failed:', e.message || e)
  }
}

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
})

server.on('exit', (code) => process.exit(code))
server.on('error', (err) => { console.error(err); process.exit(1) })
