const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.cliente.count()
  console.log('Total clientes:', count)

  if (count > 0) {
    const clients = await prisma.cliente.findMany({ take: 5, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, taxId: true, activo: true } })
    console.log('Muestra:', JSON.stringify(clients, null, 2))
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
