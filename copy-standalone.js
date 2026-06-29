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

// 3. Copy prisma/ folder (schema)
const prismaSrcDir = join(root, 'prisma')
const prismaDstDir = join(standalone, 'prisma')
if (existsSync(prismaSrcDir)) {
  if (existsSync(prismaDstDir)) rmSync(prismaDstDir, { recursive: true })
  cpSync(prismaSrcDir, prismaDstDir, { recursive: true })
  console.log('  ✓ prisma/ copied')
}

// 4. Copy .env (always overwrite)
// NOT copied — secrets must be set via environment variables in the platform
// const envSrc = join(root, '.env')
// const envDst = join(standalone, '.env')
// if (existsSync(envSrc)) {
//   cpSync(envSrc, envDst)
//   console.log('  ✓ .env copied')
// }

// 5. Copy config.json (always overwrite)
const cfgSrc = join(root, 'config.json')
const cfgDst = join(standalone, 'config.json')
if (existsSync(cfgSrc)) {
  cpSync(cfgSrc, cfgDst)
  console.log('  ✓ config.json copied')
}

// 6. Copy start.js (convenience for standalone)
const startSrc = join(root, 'start.js')
const startDst = join(standalone, 'start.js')
if (existsSync(startSrc)) {
  cpSync(startSrc, startDst)
  console.log('  ✓ start.js copied')
}

// 7. Copy prisma CLI (needed by start.js for npx prisma)
const prismaCliSrc = join(root, 'node_modules', 'prisma')
const prismaCliDst = join(standalone, 'node_modules', 'prisma')
if (existsSync(prismaCliSrc)) {
  if (existsSync(prismaCliDst)) rmSync(prismaCliDst, { recursive: true })
  cpSync(prismaCliSrc, prismaCliDst, { recursive: true })
  console.log('  ✓ node_modules/prisma copied')
}

// 8. Copy .prisma/client
const prismaClientSrc = join(root, 'node_modules', '.prisma')
const prismaClientDst = join(standalone, 'node_modules', '.prisma')
if (existsSync(prismaClientSrc)) {
  if (existsSync(prismaClientDst)) rmSync(prismaClientDst, { recursive: true })
  cpSync(prismaClientSrc, prismaClientDst, { recursive: true })
  console.log('  ✓ .prisma/client copied')
}

// 9. Copy bcryptjs (needed by seed)
const bcryptSrc = join(root, 'node_modules', 'bcryptjs')
const bcryptDst = join(standalone, 'node_modules', 'bcryptjs')
if (existsSync(bcryptSrc)) {
  if (existsSync(bcryptDst)) rmSync(bcryptDst, { recursive: true })
  cpSync(bcryptSrc, bcryptDst, { recursive: true })
  console.log('  ✓ node_modules/bcryptjs copied')
}

// 10. Copy scripts/ (seed)
const scriptsSrc = join(root, 'scripts')
const scriptsDst = join(standalone, 'scripts')
if (existsSync(scriptsSrc)) {
  if (existsSync(scriptsDst)) rmSync(scriptsDst, { recursive: true })
  cpSync(scriptsSrc, scriptsDst, { recursive: true })
  console.log('  ✓ scripts/ copied')
}

console.log('copy-standalone: done')
