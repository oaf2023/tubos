import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const GEO1 = {
  nombre: 'Depósito Central',
  tipo: 'DEPOSITO',
  lat: -33.3293,
  lng: -60.2244,
  radioMetros: 500,
  color: '#ea580c',
  regla: '{"entrada":"notificar","salida":"alertar"}',
}

const GEO2 = {
  nombre: 'Zona Clientes — Rosario',
  tipo: 'ENTREGA',
  lat: -32.9468,
  lng: -60.6393,
  radioMetros: 3000,
  color: '#3b82f6',
  regla: '{"entrada":"notificar"}',
}

const GEO3_RADIO = 200

async function main() {
  // Geocercas
  for (const g of [GEO1, GEO2]) {
    const existing = await db.geocerca.findFirst({ where: { nombre: g.nombre } })
    if (!existing) {
      await db.geocerca.create({
        data: {
          nombre: g.nombre,
          tipo: g.tipo,
          lat: g.lat,
          lng: g.lng,
          radioMetros: g.radioMetros,
          color: g.color,
          regla: g.regla,
        },
      })
      console.log(`  ✓ Geocerca: ${g.nombre}`)
    }
  }

  // Geocercas por cliente (de locations existentes)
  const locations = await db.location.findMany({
    where: { esBase: false },
    take: 10,
  })
  for (const loc of locations) {
    const existing = await db.geocerca.findFirst({ where: { nombre: `${loc.nombre} — Geo` } })
    if (!existing) {
      await db.geocerca.create({
        data: {
          nombre: `${loc.nombre} — Geo`,
          tipo: 'CLIENTE',
          lat: loc.lat,
          lng: loc.lng,
          radioMetros: GEO3_RADIO,
          color: '#22c55e',
        },
      })
      console.log(`  ✓ Geocerca cliente: ${loc.nombre}`)
    }
  }

  // Actualizar costoPorKm en camiones existentes (5 vehículos del seed de logística)
  const vehiculos = await db.vehiculo.findMany({ where: { estado: 'ACTIVO' }, take: 5 })
  const costos = [450, 380, 520, 410, 350] // ARS/km según tipo
  for (let i = 0; i < vehiculos.length; i++) {
    const v = vehiculos[i]
    const c = await db.vehiculo.update({
      where: { id: v.id },
      data: { costoPorKm: costos[i % costos.length] },
    })
    console.log(`  ✓ ${v.patente} — costo/km: $${c.costoPorKm}`)
  }

  console.log('\n✅ Logística Sprint 5 seed completada')
}

main().catch(console.error).finally(() => db.$disconnect())
