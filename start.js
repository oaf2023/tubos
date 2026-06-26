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

  // Regenerate Prisma client for PostgreSQL
  try {
    execSync(`npx prisma generate --schema=prisma/schema.postgres.prisma`, {
      cwd: root, env: { ...process.env }, stdio: 'inherit',
    })
    console.log('[start] Prisma client regenerated for PostgreSQL')
  } catch (e) {
    console.warn('[start] Prisma generate failed:', e.message || e)
  }

  // Sync schema — try 3 methods in order of reliability
  let schemaSynced = false

  // Method 1: prisma migrate deploy (for existing migrations)
  if (!schemaSynced) try {
    execSync(`npx prisma migrate deploy --schema=prisma/schema.postgres.prisma`, {
      cwd: root, env: { ...process.env }, stdio: 'inherit',
    })
    console.log('[start] PostgreSQL migrations applied')
    schemaSynced = true
  } catch (e) { /* fall through */ }

  // Method 2: prisma db push (fast, no migration files needed)
  if (!schemaSynced) try {
    execSync(`npx prisma db push --schema=prisma/schema.postgres.prisma`, {
      cwd: root, env: { ...process.env }, stdio: 'inherit',
    })
    console.log('[start] PostgreSQL schema synced via db push')
    schemaSynced = true
  } catch (e) { console.warn('[start] db push failed, trying execute:', e.message) }

  // Method 3: prisma migrate diff + execute (most compatible)
  if (!schemaSynced) try {
    const diffScript = join(root, 'prisma', 'pg-sync.sql')
    execSync(
      `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.postgres.prisma --script > "${diffScript}"`,
      { cwd: root, env: { ...process.env }, stdio: 'inherit' }
    )
    execSync(`npx prisma db execute --schema=prisma/schema.postgres.prisma --file="${diffScript}"`, {
      cwd: root, env: { ...process.env }, stdio: 'inherit',
    })
    console.log('[start] PostgreSQL schema synced via execute')
    schemaSynced = true
  } catch (e) {
    console.warn('[start] All PostgreSQL sync methods failed:', e.message || e)
  }

  // Seed admin user if database is empty
  if (schemaSynced) try {
    const seedScript = join(root, 'scripts', 'seed-pg-admin.mjs')
    if (existsSync(seedScript)) {
      execSync(`node "${seedScript}"`, {
        cwd: root, env: { ...process.env }, stdio: 'inherit',
      })
      console.log('[start] Seed check complete')
    }
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
