import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const gases = await p.gas.findMany()
  for (const g of gases) {
    await p.alertConfig.upsert({
      where: { gasId: g.id },
      update: {},
      create: {
        gasId: g.id,
        diasAlertaRetest: g.codigo === 'C2H2' ? 90 : g.codigo === 'O2' ? 45 : 60,
        diasMaxCliente: g.codigo === 'C2H2' ? 60 : 90,
        alertaPH: true,
        activo: true,
      },
    })
  }
  console.log('✓ AlertConfig seeded for ' + gases.length + ' gases')
}
main().finally(() => p.$disconnect())
