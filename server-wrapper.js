const http = require('http')
const path = require('path')

const PORT = parseInt(process.env.PORT, 10) || 3000
const serverPath = path.join(process.cwd(), '.next', 'standalone', 'server.js')
let startupError = ''

function startHTTPServer() {
  const server = http.createServer((req, res) => {
    if (startupError) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(startupError)
    } else {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end('Server started but no response from Next.js')
    }
  })
  server.listen(PORT, () => {
    console.log(`[wrapper] HTTP fallback listening on ${PORT}`)
  })
  server.on('error', (err) => {
    console.error('[wrapper] HTTP server error:', err)
  })
  return server
}

startHTTPServer()

try {
  require(serverPath)
} catch (e) {
  startupError = e.stack || e.message
  console.error('[wrapper] Failed to load server:', startupError)
}

process.on('uncaughtException', (err) => {
  startupError = err.stack || err.message
  console.error('[wrapper] Uncaught exception:', startupError)
})

process.on('unhandledRejection', (err) => {
  startupError = err?.stack || err?.message || String(err)
  console.error('[wrapper] Unhandled rejection:', startupError)
})
