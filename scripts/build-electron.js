const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

function run(cmd) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
}

function main() {
  console.log('=== GasTrack AR - Electron Build ===\n')

  // 1. Build Next.js standalone
  console.log('[1/3] Building Next.js...')
  run('npx next build')

  // 2. Copy static and public to standalone
  console.log('[2/3] Copying assets to standalone...')
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')

  const staticSrc = path.join(__dirname, '..', '.next', 'static')
  const staticDest = path.join(standaloneDir, '.next', 'static')
  if (fs.existsSync(staticDest)) {
    fs.rmSync(staticDest, { recursive: true, force: true })
  }
  fs.cpSync(staticSrc, staticDest, { recursive: true })

  const publicSrc = path.join(__dirname, '..', 'public')
  const publicDest = path.join(standaloneDir, 'public')
  if (fs.existsSync(publicDest)) {
    fs.rmSync(publicDest, { recursive: true, force: true })
  }
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true })
  }

  // 3. Run electron-builder
  console.log('[3/3] Packaging Electron app...')
  run('npx electron-builder --win portable')
  
  console.log('\n=== Build complete! ===')
  console.log('Check the dist/ folder for the executable.')
}

main()
