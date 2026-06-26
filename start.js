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

if (!existsSync(dbDir)) {
  const { mkdirSync } = require('fs')
  mkdirSync(dbDir, { recursive: true })
}

process.env.DATABASE_URL = `file:${dbPath}`
process.env.NODE_ENV = 'production'

console.log(`[start] Database: ${dbPath}`)
console.log(`[start] Server: ${serverPath}`)
console.log(`[start] Port: ${process.env.PORT || 3000}`)

// Sync database schema (dev mode only — safe push without accept-data-loss)
try {
  execSync(`npx prisma db push --skip-generate 2>&1`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit',
  })
  console.log('[start] Database schema synced')
} catch (e) {
  console.warn('[start] Database sync failed:', e.message || e)
}

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
})

server.on('exit', (code) => process.exit(code))
server.on('error', (err) => { console.error(err); process.exit(1) })
