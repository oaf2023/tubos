const { cpSync, existsSync, mkdirSync, rmSync } = require('fs')
const { join } = require('path')

const root = __dirname
const standalone = join(root, '.next', 'standalone')

// 1. Copy .next/static into standalone (always refresh for new hashes)
const staticSrc = join(root, '.next', 'static')
const staticDst = join(standalone, '.next', 'static')
if (existsSync(staticSrc)) {
  if (existsSync(staticDst)) rmSync(staticDst, { recursive: true })
  cpSync(staticSrc, staticDst, { recursive: true })
  console.log('  ✓ .next/static copied')
}

// 2. Copy public/ folder (always refresh)
const publicSrc = join(root, 'public')
const publicDst = join(standalone, 'public')
if (existsSync(publicSrc)) {
  if (existsSync(publicDst)) rmSync(publicDst, { recursive: true })
  cpSync(publicSrc, publicDst, { recursive: true })
  console.log('  ✓ public/ copied')
}

// 3. Copy db/ folder (always refresh)
const dbSrc = join(root, 'db')
const dbDst = join(standalone, 'db')
if (existsSync(dbSrc)) {
  if (existsSync(dbDst)) rmSync(dbDst, { recursive: true })
  cpSync(dbSrc, dbDst, { recursive: true })
  console.log('  ✓ db/ copied')
}

// 4. Copy prisma/schema.prisma (always refresh)
const prismaSrc = join(root, 'prisma', 'schema.prisma')
const prismaDstDir = join(standalone, 'prisma')
const prismaDst = join(prismaDstDir, 'schema.prisma')
if (existsSync(prismaSrc)) {
  if (!existsSync(prismaDstDir)) mkdirSync(prismaDstDir, { recursive: true })
  cpSync(prismaSrc, prismaDst)
  console.log('  ✓ prisma/schema.prisma copied')
}

// 5. Copy .env (always overwrite)
const envSrc = join(root, '.env')
const envDst = join(standalone, '.env')
if (existsSync(envSrc)) {
  cpSync(envSrc, envDst)
  console.log('  ✓ .env copied')
}

// 6. Copy config.json (always overwrite)
const cfgSrc = join(root, 'config.json')
const cfgDst = join(standalone, 'config.json')
if (existsSync(cfgSrc)) {
  cpSync(cfgSrc, cfgDst)
  console.log('  ✓ config.json copied')
}

// 7. Copy start.js (convenience for standalone)
const startSrc = join(root, 'start.js')
const startDst = join(standalone, 'start.js')
if (existsSync(startSrc)) {
  cpSync(startSrc, startDst)
  console.log('  ✓ start.js copied')
}

console.log('copy-standalone: done')
