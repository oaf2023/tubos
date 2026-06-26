import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ZONAS = [
  { codigo: 'Z-VACIOS', nombre: 'Depósito de Vacíos', tipo: 'VACIOS', descripcion: 'Recepción y almacenamiento de cilindros vacíos' },
  { codigo: 'Z-LLENOS', nombre: 'Depósito de Llenos', tipo: 'LLENOS', descripcion: 'Almacenamiento de cilindros llenos' },
  { codigo: 'Z-SALIDA', nombre: 'Salida a Reparto', tipo: 'SALIDA_REPARTO', descripcion: 'Zona de carga para salida a reparto' },
  { codigo: 'Z-ENVIO-CARGA', nombre: 'Envío a Carga', tipo: 'ENVIO_CARGA', descripcion: 'Zona de envío a planta de carga' },
  { codigo: 'Z-RECEPCION', nombre: 'Recepción de Carga', tipo: 'RECEPCION_CARGA', descripcion: 'Zona de recepción desde planta de carga' },
  { codigo: 'Z-MANTENIMIENTO', nombre: 'Taller Mantenimiento', tipo: 'MANTENIMIENTO', descripcion: 'Zona de ingreso a mantenimiento' },
  { codigo: 'Z-BAJA', nombre: 'Descarte / Baja', tipo: 'BAJA', descripcion: 'Zona de descarte de cilindros' },
]

const LECTORES = [
  { codigo: 'LEC-ESP32-01', nombre: 'Lector Entrada Vacíos', tipo: 'ESP32', zonaCodigo: 'Z-VACIOS', ip: '192.168.1.101' },
  { codigo: 'LEC-ESP32-02', nombre: 'Lector Salida Llenos', tipo: 'ESP32', zonaCodigo: 'Z-LLENOS', ip: '192.168.1.102' },
  { codigo: 'LEC-RPI-01', nombre: 'Gateway Reparto', tipo: 'RPI', zonaCodigo: 'Z-SALIDA', ip: '192.168.1.201' },
  { codigo: 'LEC-ESP32-03', nombre: 'Lector Envío Carga', tipo: 'ESP32', zonaCodigo: 'Z-ENVIO-CARGA', ip: '192.168.1.103' },
  { codigo: 'LEC-ESP32-04', nombre: 'Lector Recepción Carga', tipo: 'ESP32', zonaCodigo: 'Z-RECEPCION', ip: '192.168.1.104' },
  { codigo: 'LEC-RPI-02', nombre: 'Gateway Mantenimiento', tipo: 'RPI', zonaCodigo: 'Z-MANTENIMIENTO', ip: '192.168.1.202' },
]

async function main() {
  // Crear zonas
  for (const z of ZONAS) {
    await db.zonaLectura.upsert({
      where: { codigo: z.codigo },
      update: { nombre: z.nombre, tipo: z.tipo, descripcion: z.descripcion },
      create: z,
    })
    console.log(`  ✓ Zona: ${z.codigo} — ${z.nombre}`)
  }

  // Crear lectores
  for (const l of LECTORES) {
    const zona = await db.zonaLectura.findUnique({ where: { codigo: l.zonaCodigo } })
    if (!zona) continue
    await db.lectorIoT.upsert({
      where: { codigo: l.codigo },
      update: { nombre: l.nombre, tipo: l.tipo, zonaLecturaId: zona.id, ip: l.ip },
      create: {
        codigo: l.codigo,
        nombre: l.nombre,
        tipo: l.tipo,
        zonaLecturaId: zona.id,
        ip: l.ip,
      },
    })
    console.log(`  ✓ Lector: ${l.codigo} — ${l.nombre}`)
  }

  // Asociar tags RFID a cilindros existentes (simulación)
  const cylinders = await db.cylinder.findMany({ take: 30 })
  for (let i = 0; i < cylinders.length; i++) {
    const tid = `E200${String(i + 1).padStart(10, '0')}`
    await db.tagRFID.upsert({
      where: { tid },
      update: { cylinderId: cylinders[i].id, activo: true },
      create: {
        tid,
        cylinderId: cylinders[i].id,
        fechaAsociacion: new Date(),
      },
    })
  }
  console.log(`  ✓ ${cylinders.length} tags RFID asociados a cilindros`)

  console.log('\n✅ RFID seed completada')
  console.log(`   - ${ZONAS.length} zonas de lectura`)
  console.log(`   - ${LECTORES.length} lectores IoT`)
  console.log(`   - ${cylinders.length} tags RFID`)
}

main().catch(console.error).finally(() => db.$disconnect())
