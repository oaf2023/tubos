const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const roles = await prisma.rol.findMany()
  console.log('Roles:', JSON.stringify(roles, null, 2))

  const total = await prisma.usuario.count()
  console.log(`Total usuarios: ${total}`)

  const vendedores = await prisma.usuario.findMany({
    where: { rol: { nombre: 'vendedor' } },
    select: { id: true, nombre: true, usuario: true, activo: true, nivelAcceso: true, rolId: true }
  })
  console.log(`\nVendedores (${vendedores.length}):`)
  vendedores.forEach(v => console.log(`  ${v.usuario} → ${v.nombre} (activo: ${v.activo ? 'SÍ' : 'NO'})`))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
