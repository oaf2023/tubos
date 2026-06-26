const { join } = require('path')
const { existsSync } = require('fs')
const { spawn, execSync } = require('child_process')

const root = __dirname
const standaloneDir = join(root, '.next', 'standalone')
const serverPath = join(standaloneDir, 'server.js')

if (!existsSync(serverPath)) {
  console.error('ERROR: Standalone server not found at', serverPath)
  console.error('Run "npm run build" first.')
  process.exit(1)
}

process.env.NODE_ENV = 'production'
const schema = join(root, 'prisma', 'schema.prisma')

console.log(`[start] Database: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[0] + '@...' : 'not set'}`)
console.log(`[start] Server: ${serverPath}`)
console.log(`[start] Port: ${process.env.PORT || 3000}`)

// Always regenerate Prisma client (ensures correct engine for platform)
try {
  execSync(`npx prisma generate --schema="${schema}"`, {
    cwd: root, env: { ...process.env }, stdio: 'inherit',
  })
  console.log('[start] Prisma client generated')
} catch (e) {
  console.warn('[start] Prisma generate failed:', e.message || e)
}

// Sync schema to database
let schemaSynced = false

try {
  execSync(`npx prisma db push --schema="${schema}"`, {
    cwd: root, env: { ...process.env }, stdio: 'inherit',
  })
  console.log('[start] Schema synced via db push')
  schemaSynced = true
} catch (e) {
  console.warn('[start] db push failed, trying diff+execute:', e.message)
}

if (!schemaSynced) try {
  const diffScript = join(root, 'prisma', 'sync.sql')
  execSync(
    `npx prisma migrate diff --from-empty --to-schema-datamodel "${schema}" --script > "${diffScript}"`,
    { cwd: root, env: { ...process.env }, shell: true, stdio: 'inherit' }
  )
  execSync(`npx prisma db execute --schema="${schema}" --file="${diffScript}"`, {
    cwd: root, env: { ...process.env }, stdio: 'inherit',
  })
  console.log('[start] Schema synced via execute')
  schemaSynced = true
} catch (e) {
  console.warn('[start] All sync methods failed:', e.message || e)
}

// Seed admin if database is empty
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

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
})

server.on('exit', (code) => process.exit(code))
server.on('error', (err) => { console.error(err); process.exit(1) })
