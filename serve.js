// serve.js - Production server for PythonAnywhere deployment
// Usage: node serve.js
// Listens on process.env.PORT (PythonAnywhere default: 8080)

const { spawn } = require('child_process')
const { existsSync } = require('fs')
const { join } = require('path')

const PORT = process.env.PORT || 8080
const STANDALONE_DIR = join(__dirname, '.next', 'standalone')

async function start() {
  // Step 1: Ensure database schema is up to date
  console.log('[serve] Running prisma db push...')
  const push = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
  })
  await new Promise((resolve, reject) => {
    push.on('exit', (code) => {
      if (code === 0) {
        console.log('[serve] Database schema up to date')
        resolve()
      } else {
        console.warn(`[serve] prisma db push exited with code ${code}, continuing...`)
        resolve()
      }
    })
    push.on('error', reject)
  })

  // Step 2: Generate Prisma client (in case schema changed)
  console.log('[serve] Running prisma generate...')
  const generate = spawn('npx', ['prisma', 'generate'], {
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
  })
  await new Promise((resolve, reject) => {
    generate.on('exit', (code) => {
      if (code === 0) resolve()
      else console.warn(`[serve] prisma generate exited with code ${code}`)
      resolve()
    })
    generate.on('error', reject)
  })

  // Step 3: Start Next.js standalone server
  const serverPath = join(STANDALONE_DIR, 'server.js')

  if (!existsSync(serverPath)) {
    console.error('[serve] ERROR: Standalone server not found. Run "npm run build" first.')
    console.error(`[serve] Expected at: ${serverPath}`)
    process.exit(1)
  }

  console.log(`[serve] Starting server on port ${PORT}...`)
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'production',
    },
    shell: true,
  })

  server.on('exit', (code) => {
    console.error(`[serve] Server exited with code ${code}`)
    process.exit(code)
  })

  server.on('error', (err) => {
    console.error('[serve] Failed to start server:', err)
    process.exit(1)
  })

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[serve] SIGTERM received, shutting down...')
    server.kill('SIGTERM')
  })

  process.on('SIGINT', () => {
    console.log('[serve] SIGINT received, shutting down...')
    server.kill('SIGINT')
  })
}

start().catch((err) => {
  console.error('[serve] Fatal error:', err)
  process.exit(1)
})
