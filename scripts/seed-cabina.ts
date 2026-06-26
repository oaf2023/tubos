import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const CABINAS = [
  { codigo: 'CAB-001', nombre: 'Cabina Principal — Planta Baja', ubicacion: 'San Nicolás, Planta Baja' },
  { codigo: 'CAB-002', nombre: 'Cabina Secundaria — Depósito', ubicacion: 'San Nicolás, Depósito Este' },
]

const SENSORES_POR_CABINA = [
  { cabinaCodigo: 'CAB-001', tipo: 'RFID', codigo: 'SNS-RFID-C01', config: '{"modelo":"UR-300","frecuencia":"UHF"}' },
  { cabinaCodigo: 'CAB-001', tipo: 'BALANZA', codigo: 'SNS-PESO-C01', config: '{"maxKg":200,"precision":0.1}' },
  { cabinaCodigo: 'CAB-001', tipo: 'CAMARA', codigo: 'SNS-CAM-C01', config: '{"resolucion":"1080p"}' },
  { cabinaCodigo: 'CAB-002', tipo: 'RFID', codigo: 'SNS-RFID-C02', config: '{"modelo":"UR-300","frecuencia":"UHF"}' },
  { cabinaCodigo: 'CAB-002', tipo: 'BALANZA', codigo: 'SNS-PESO-C02', config: '{"maxKg":200,"precision":0.1}' },
]

async function main() {
  for (const c of CABINAS) {
    await db.cabina.upsert({
      where: { codigo: c.codigo },
      update: { nombre: c.nombre, ubicacion: c.ubicacion },
      create: c,
    })
    console.log(`  ✓ Cabina: ${c.codigo} — ${c.nombre}`)
  }

  for (const s of SENSORES_POR_CABINA) {
    const cabina = await db.cabina.findUnique({ where: { codigo: s.cabinaCodigo } })
    if (!cabina) continue
    const existing = await db.sensorCabina.findFirst({ where: { codigo: s.codigo } })
    if (existing) {
      await db.sensorCabina.update({ where: { id: existing.id }, data: { tipo: s.tipo, cabinaId: cabina.id, configuracion: s.config } })
    } else {
      await db.sensorCabina.create({ data: { codigo: s.codigo, tipo: s.tipo, cabinaId: cabina.id, configuracion: s.config } })
    }
    console.log(`  ✓ Sensor: ${s.codigo} (${s.tipo})`)
  }

  // Crear reglas de peso para gases
  const gases = await db.gas.findMany()
  for (const gas of gases) {
    const taras: Record<string, number> = { AR: 52, CO2: 45, O2: 50, C2H2: 65, N2: 48, He: 42, H2: 38, 'MIX-7525': 50, 'AR-HE': 48 }
    const llenos: Record<string, number> = { AR: 70, CO2: 55, O2: 65, C2H2: 80, N2: 55, He: 45, H2: 42, 'MIX-7525': 62, 'AR-HE': 60 }
    const tara = taras[gas.codigo] || 50
    const lleno = llenos[gas.codigo] || 65
    await db.reglaPeso.upsert({
      where: { gasId: gas.id },
      update: { pesoTaraKg: tara, pesoLlenoKg: lleno, pesoMinKg: tara * 0.9, pesoMaxKg: lleno * 1.1 },
      create: { gasId: gas.id, pesoTaraKg: tara, pesoLlenoKg: lleno, pesoMinKg: tara * 0.9, pesoMaxKg: lleno * 1.1 },
    })
    console.log(`  ✓ Regla peso: ${gas.codigo} (tara: ${tara}kg, lleno: ${lleno}kg)`)
  }

  console.log('\n✅ Cabina seed completada')
}

main().catch(console.error).finally(() => db.$disconnect())
