const { join } = require('path')
const { existsSync } = require('fs')
const { spawn, execSync } = require('child_process')

const root = __dirname
const standaloneDir = join(root, '.next', 'standalone')
const serverPath = join(standaloneDir, 'server.js')
const dbDir = join(root, 'prisma', 'db')
const dbPath = join(dbDir, 'custom.db')
const prismaSchema = join(root, 'prisma', 'schema.prisma')

if (!existsSync(serverPath)) {
  console.error('ERROR: Standalone server not found at', serverPath)
  console.error('Run "npm run build" first.')
  process.exit(1)
}

if (!existsSync(dbDir)) {
  const { mkdirSync } = require('fs')
  mkdirSync(dbDir, { recursive: true })
}

process.env.DATABASE_URL = `file:${dbPath}`
process.env.NODE_ENV = 'production'

console.log(`[start] Database: ${dbPath}`)
console.log(`[start] Server: ${serverPath}`)
console.log(`[start] Port: ${process.env.PORT || 3000}`)

// Sync database schema (creates missing tables)
try {
  const prismaBin = join(root, 'node_modules', '.bin', 'prisma')
  execSync(`${prismaBin} db push --skip-generate --accept-data-loss 2>&1`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit',
  })
  console.log('[start] Database schema synced')
} catch {
  console.warn('[start] Database sync failed (non-fatal, continuing)')
}

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
})

server.on('exit', (code) => process.exit(code))
server.on('error', (err) => { console.error(err); process.exit(1) })
