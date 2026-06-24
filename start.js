const { join } = require('path')
const { existsSync } = require('fs')
const { spawn } = require('child_process')

const root = __dirname
const standaloneDir = join(root, '.next', 'standalone')
const serverPath = join(standaloneDir, 'server.js')
const dbPath = join(root, 'db', 'custom.db')

if (!existsSync(serverPath)) {
  console.error('ERROR: Standalone server not found at', serverPath)
  console.error('Run "npm run build" first.')
  process.exit(1)
}

if (!existsSync(dbPath)) {
  console.warn('WARN: Database file not found at', dbPath)
  console.warn('Run "npx prisma db push && npx tsx scripts/seed.ts" or use an existing database.')
}

process.env.DATABASE_URL = `file:${dbPath}`
process.env.NODE_ENV = 'production'

console.log(`[start] Database: ${dbPath}`)
console.log(`[start] Server: ${serverPath}`)
console.log(`[start] Port: ${process.env.PORT || 3000}`)

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
})

server.on('exit', (code) => process.exit(code))
server.on('error', (err) => { console.error(err); process.exit(1) })
