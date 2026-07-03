const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.cliente.count()
  if (count === 0) { console.log('No hay clientes para limpiar.'); return }

  console.log(`Eliminando ${count} clientes...`)
  await prisma.$transaction([
    prisma.rutaParada.deleteMany(),
    prisma.clienteAcceso.deleteMany(),
  ])
  const result = await prisma.cliente.deleteMany()
  console.log(`✓ ${result.count} clientes eliminados.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
