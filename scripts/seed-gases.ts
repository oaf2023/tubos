import { PrismaClient } from '@prisma/client'
import { GASES } from '../src/lib/catalogo'
const p = new PrismaClient()
async function main() {
  for (const g of GASES) {
    await p.gas.upsert({
      where: { codigo: g.codigo },
      update: {
        nombre: g.nombre,
        descripcion: g.descripcion,
        presionBar: g.presionBar,
        colorHex: g.colorHex,
        usoPrincipal: g.usoPrincipal,
        categoria: g.categoria,
        peligro: g.peligro,
      },
      create: {
        codigo: g.codigo,
        nombre: g.nombre,
        descripcion: g.descripcion,
        presionBar: g.presionBar,
        colorHex: g.colorHex,
        usoPrincipal: g.usoPrincipal,
        categoria: g.categoria,
        peligro: g.peligro,
      },
    })
  }
  console.log('✓ Gases re-seeded (' + GASES.length + ')')
}
main().finally(() => p.$disconnect())
