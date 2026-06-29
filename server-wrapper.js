const http = require('http')
const path = require('path')
const cp = require('child_process')
const fs = require('fs')

const PORT = parseInt(process.env.PORT, 10) || 3000
const serverPath = path.join(process.cwd(), '.next', 'standalone', 'server.js')

// Start Next.js as a child process
const child = cp.fork(serverPath, [], {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  env: { ...process.env }
})

let childError = ''
let childStarted = false

child.stdout.on('data', (d) => {
  const text = d.toString()
  process.stdout.write(text)
  if (text.includes('Ready') || text.includes('Listening')) {
    childStarted = true
  }
})

child.stderr.on('data', (d) => {
  const text = d.toString()
  process.stderr.write(text)
  childError += text
})

child.on('exit', (code) => {
  console.error(`[wrapper] Next.js exited with code ${code}`)
  childError += `\n[wrapper] Next.js exited with code ${code}`
  startFallbackServer()
})

child.on('error', (err) => {
  childError = err.stack || err.message
  console.error('[wrapper] Next.js error:', childError)
  startFallbackServer()
})

// Give Next.js time to start, then fallback if not ready
setTimeout(() => {
  if (!childStarted) {
    console.error('[wrapper] Timeout waiting for Next.js to start')
    childError += '\n[wrapper] Timeout waiting for Next.js to start'
    startFallbackServer()
  }
}, 30000)

function startFallbackServer() {
  const server = http.createServer((req, res) => {
    if (childError) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(childError)
    } else {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end('Next.js server is not ready yet')
    }
  })
  server.listen(PORT, () => {
    console.log(`[wrapper] Fallback server listening on ${PORT}`)
  })
  server.on('error', (err) => {
    console.error('[wrapper] Fallback error:', err)
  })
}
