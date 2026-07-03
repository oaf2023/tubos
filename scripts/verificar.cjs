const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const total = await prisma.cliente.count()
  const byProvincia = await prisma.cliente.groupBy({ by: ['provincia'], _count: true, orderBy: { _count: { provincia: 'desc' } } })
  const byIva = await prisma.cliente.groupBy({ by: ['condicionIva'], _count: true, orderBy: { _count: { condicionIva: 'desc' } } })
  const conSaldo = await prisma.cliente.count({ where: { estadoCuenta: 'PENDIENTE' } })
  const muestra = await prisma.cliente.findMany({ take: 3, orderBy: { nombre: 'asc' }, select: { nombre: true, ciudad: true, condicionIva: true } })

  console.log(`Total clientes: ${total}`)
  console.log(`Con saldo pendiente: ${conSaldo}`)
  console.log('\nPor provincia:')
  byProvincia.forEach(p => console.log(`  ${p.provincia || '—'}: ${p._count}`))
  console.log('\nPor condición IVA:')
  byIva.forEach(i => console.log(`  ${i.condicionIva || '—'}: ${i._count}`))
  console.log('\nMuestra:', JSON.stringify(muestra, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
