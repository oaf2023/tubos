const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const roles = await prisma.rol.findMany()
  console.log('Roles existentes:', JSON.stringify(roles, null, 2))

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, usuario: true, rolId: true, activo: true },
    take: 20
  })
  console.log('Usuarios existentes:', JSON.stringify(usuarios, null, 2))

  const count = await prisma.usuario.count()
  console.log('Total usuarios:', count)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
