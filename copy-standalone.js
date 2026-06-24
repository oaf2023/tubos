const { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

const root = __dirname
const standalone = join(root, '.next', 'standalone')

// 1. Copy public/ folder (PWA assets, etc.)
const publicSrc = join(root, 'public')
const publicDst = join(standalone, 'public')
if (existsSync(publicSrc) && !existsSync(publicDst)) {
  cpSync(publicSrc, publicDst, { recursive: true })
  console.log('  ✓ public/ copied')
}

// 2. Copy db/ folder (SQLite database)
const dbSrc = join(root, 'db')
const dbDst = join(standalone, 'db')
if (existsSync(dbSrc) && !existsSync(dbDst)) {
  cpSync(dbSrc, dbDst, { recursive: true })
  console.log('  ✓ db/ copied')
}

// 3. Copy prisma/schema.prisma for runtime generation if needed
const prismaSrc = join(root, 'prisma', 'schema.prisma')
const prismaDstDir = join(standalone, 'prisma')
const prismaDst = join(prismaDstDir, 'schema.prisma')
if (existsSync(prismaSrc) && !existsSync(prismaDst)) {
  if (!existsSync(prismaDstDir)) mkdirSync(prismaDstDir, { recursive: true })
  cpSync(prismaSrc, prismaDst)
  console.log('  ✓ prisma/schema.prisma copied')
}

// 4. Copy .env (always overwrite to pick up changes)
const envSrc = join(root, '.env')
const envDst = join(standalone, '.env')
if (existsSync(envSrc)) {
  cpSync(envSrc, envDst)
  console.log('  ✓ .env copied')
}

console.log('copy-standalone: done')
