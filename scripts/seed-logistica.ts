// Script: poblar datos de prueba para Logística (carga de tubos)
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('🚛 Poblando datos de prueba para Logística...\n')

  // 1. Asignar diametroMm a cilindros que no tengan (según capacidad)
  console.log(' → Asignando diámetros a cilindros...')
  const sinDiametro = await db.cylinder.findMany({ where: { diametroMm: null } })
  for (const c of sinDiametro) {
    const diam = c.capacidadLitros <= 10 ? randomInt(120, 160)
      : c.capacidadLitros <= 20 ? randomInt(180, 230)
      : c.capacidadLitros <= 40 ? randomInt(230, 280)
      : randomInt(280, 350)
    await db.cylinder.update({ where: { id: c.id }, data: { diametroMm: diam } })
  }
  console.log(`   ✓ ${sinDiametro.length} cilindros actualizados con diámetro`)

  // 2. Crear vehículos de prueba con configuración de carga si no existen
  console.log(' → Creando vehículos de prueba...')
  const existing = await db.vehiculo.count()
  if (existing === 0) {
    const vehiculos = [
      { codigo: 'VH-001', patente: 'AA123BB', marca: 'Mercedes-Benz', modelo: 'Sprinter 516', anio: 2022, tipo: 'CAMIONETA', combustible: 'GASOIL', kmActual: 45230, estado: 'ACTIVO', largoCajaCm: 430, anchoCajaCm: 210, altoCajaCm: 220, maxTubos: 16, orientacionTubos: 'PARADOS', conductorAsignado: 'Carlos López' },
      { codigo: 'VH-002', patente: 'AC456CD', marca: 'Ford', modelo: 'F-350', anio: 2023, tipo: 'CAMIONETA', combustible: 'GASOIL', kmActual: 28150, estado: 'ACTIVO', largoCajaCm: 380, anchoCajaCm: 200, altoCajaCm: 200, maxTubos: 12, orientacionTubos: 'PARADOS', conductorAsignado: 'Miguel Rodríguez' },
      { codigo: 'VH-003', patente: 'AD789EF', marca: 'Iveco', modelo: 'Daily 70C18', anio: 2021, tipo: 'CAMION', combustible: 'GASOIL', kmActual: 72300, estado: 'ACTIVO', largoCajaCm: 520, anchoCajaCm: 220, altoCajaCm: 240, maxTubos: 24, orientacionTubos: 'PARADOS', conductorAsignado: 'Juan Pérez' },
      { codigo: 'VH-004', patente: 'AE012GH', marca: 'Toyota', modelo: 'Hilux 4x4', anio: 2024, tipo: 'CAMIONETA', combustible: 'GASOIL', kmActual: 12400, estado: 'ACTIVO', largoCajaCm: 310, anchoCajaCm: 185, altoCajaCm: 180, maxTubos: 8, orientacionTubos: 'ACOSTADOS', conductorAsignado: 'Pedro Gómez' },
      { codigo: 'VH-005', patente: 'AF345IJ', marca: 'Scania', modelo: 'G410', anio: 2020, tipo: 'CAMION', combustible: 'GASOIL', kmActual: 156800, estado: 'EN_TALLER', largoCajaCm: 680, anchoCajaCm: 250, altoCajaCm: 270, maxTubos: 36, orientacionTubos: 'PARADOS', conductorAsignado: '' },
    ]
    for (const v of vehiculos) {
      await db.vehiculo.create({ data: v })
    }
    console.log(`   ✓ ${vehiculos.length} vehículos creados`)
  } else {
    // Actualizar vehículos existentes con configuración de carga si no tienen
    const sinConfig = await db.vehiculo.findMany({ where: { largoCajaCm: null } })
    for (const v of sinConfig) {
      await db.vehiculo.update({
        where: { id: v.id },
        data: {
          largoCajaCm: 480,
          anchoCajaCm: 210,
          altoCajaCm: 220,
          maxTubos: v.tipo === 'CAMION' ? 24 : 12,
          orientacionTubos: 'PARADOS',
        },
      })
    }
    if (sinConfig.length > 0) console.log(`   ✓ ${sinConfig.length} vehículos actualizados con configuración de carga`)
    else console.log('   → Todos los vehículos ya tienen configuración')
  }

  // 3. Mostrar resumen
  const totalVeh = await db.vehiculo.count()
  const totalCyl = await db.cylinder.count()
  const cylConDiam = await db.cylinder.count({ where: { NOT: { diametroMm: null } } })
  const vehConCaja = await db.vehiculo.count({ where: { NOT: { largoCajaCm: null } } })

  console.log('\n📊 Resumen:')
  console.log(`   - ${totalVeh} vehículos (${vehConCaja} con configuración de carga)`)
  console.log(`   - ${totalCyl} cilindros (${cylConDiam} con diámetro asignado)`)
  console.log('\n✅ Datos de Logística cargados correctamente!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
