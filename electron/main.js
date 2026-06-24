const { app, BrowserWindow, dialog } = require('electron')
const { fork } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

const PORT = 3000
const SERVER_URL = `http://localhost:${PORT}`

let mainWindow = null
let serverProcess = null

const isDev = !app.isPackaged

function getResourcesPath() {
  if (isDev) {
    return path.join(__dirname, '..')
  }
  return process.resourcesPath
}

function getUserDataPath() {
  return app.getPath('userData')
}

function ensureUserDataFiles() {
  const userData = getUserDataPath()
  const resources = getResourcesPath()

  const dbDir = path.join(userData, 'db')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const destDb = path.join(dbDir, 'custom.db')
  if (!fs.existsSync(destDb)) {
    const srcDb = path.join(resources, 'db', 'custom.db')
    if (fs.existsSync(srcDb)) {
      fs.copyFileSync(srcDb, destDb)
      console.log('Copied database to userData')
    } else {
      console.warn('No source database found at:', srcDb)
    }
  }

  const destConfig = path.join(userData, 'config.json')
  if (!fs.existsSync(destConfig)) {
    const srcConfig = path.join(resources, 'config.json')
    if (fs.existsSync(srcConfig)) {
      fs.copyFileSync(srcConfig, destConfig)
      console.log('Copied config to userData')
    }
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const resources = getResourcesPath()
    const standaloneDir = path.join(resources, '.next', 'standalone')
    const serverScript = path.join(standaloneDir, 'server.js')

    if (!fs.existsSync(serverScript)) {
      console.error('Server script not found at:', serverScript)
      reject(new Error(`Server script not found at ${serverScript}`))
      return
    }

    const userData = getUserDataPath()

    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DATABASE_URL: `file:${path.join(userData, 'db', 'custom.db')}`,
    }

    console.log('Starting server with:')
    console.log('  Script:', serverScript)
    console.log('  DB:', env.DATABASE_URL)

    serverProcess = fork(serverScript, [], {
      env,
      cwd: standaloneDir,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })

    serverProcess.stdout.on('data', (data) => {
      console.log(`[server] ${data.toString().trim()}`)
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`[server:err] ${data.toString().trim()}`)
    })

    serverProcess.on('exit', (code) => {
      console.log(`Server exited with code ${code}`)
      serverProcess = null
    })

    let attempts = 0
    const maxAttempts = 60

    const poll = () => {
      attempts++
      const req = http.get(SERVER_URL, (res) => {
        res.resume()
        console.log('Server is ready after', attempts, 'attempts')
        resolve()
      })
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Server did not start in time'))
          return
        }
        setTimeout(poll, 1000)
      })
      req.setTimeout(2000, () => {
        req.destroy()
        if (attempts >= maxAttempts) {
          reject(new Error('Server did not start in time'))
          return
        }
        setTimeout(poll, 1000)
      })
    }

    poll()
  })
}

function createWindow() {
  const iconPath = path.join(getResourcesPath(), 'resources', 'icon.png')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'GasTrack AR',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  })

  mainWindow.loadURL(SERVER_URL)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  ensureUserDataFiles()

  try {
    console.log('Starting Next.js server...')
    await startServer()
    console.log('Server is ready')
    createWindow()
  } catch (err) {
    console.error('Failed to start:', err)
    dialog.showErrorBox(
      'Error al iniciar',
      `No se pudo iniciar el servidor:\n${err.message}`
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }
})

app.on('activate', () => {
  if (mainWindow === null && serverProcess) {
    createWindow()
  }
})
