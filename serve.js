// serve.js - Production server for PythonAnywhere deployment
// Sets absolute DATABASE_URL then starts the standalone Next.js server.
// Usage: node serve.js

const { spawn } = require('child_process')
const { existsSync } = require('fs')
const { join } = require('path')

const PORT = process.env.PORT || 8080
const root = __dirname
const STANDALONE_DIR = join(root, '.next', 'standalone')
const DB_PATH = join(root, 'db', 'custom.db')

// Use absolute path so Prisma works regardless of CWD changes
process.env.DATABASE_URL = `file:${DB_PATH}`

async function start() {
  if (!existsSync(DB_PATH)) {
    console.warn(`[serve] Database not found at ${DB_PATH}`)
  }

  // Step 1: Ensure database schema is up to date
  console.log('[serve] Running prisma db push...')
  await run('npx', ['prisma', 'db', 'push', '--accept-data-loss'])

  // Step 2: Generate Prisma client (in case schema changed)
  console.log('[serve] Running prisma generate...')
  await run('npx', ['prisma', 'generate'])

  // Step 3: Start Next.js standalone server
  const serverPath = join(STANDALONE_DIR, 'server.js')
  if (!existsSync(serverPath)) {
    console.error(`[serve] ERROR: Standalone server not found at ${serverPath}`)
    console.error('[serve] Run "npm run build" first.')
    process.exit(1)
  }

  console.log(`[serve] Starting server on port ${PORT}...`)
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT), HOSTNAME: '0.0.0.0' },
    shell: true,
  })

  server.on('exit', (code) => process.exit(code ?? 0))
  server.on('error', (err) => { console.error(err); process.exit(1) })

  process.on('SIGTERM', () => server.kill('SIGTERM'))
  process.on('SIGINT', () => server.kill('SIGINT'))
}

function run(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env }, shell: true })
    proc.on('exit', (code) => {
      if (code !== 0) console.warn(`[serve] ${cmd} exited with code ${code}`)
      resolve()
    })
    proc.on('error', () => resolve())
  })
}

start().catch((err) => { console.error('[serve] Fatal:', err); process.exit(1) })
