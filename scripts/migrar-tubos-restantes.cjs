const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DATA_PATH = 'C:\\Users\\Usuario\\Downloads\\tubos-data.json'
const BATCH_SIZE = 200
const DEFAULT_LAT = -33.361664
const DEFAULT_LNG = -60.186145
const DEFAULT_PROVINCIA = 'BUENOS AIRES'

const MAP_TIPO_CARGA_TO_GAS = {
  'Oxigeno': 'O2', 'CO2': 'CO2', 'Argon': 'AR', 'Nitrogeno': 'N2',
  'Acetileno': 'C2H2', 'Agamix20': 'MIX-7525', 'ARGON 5.0': 'AR',
  'Gas * 30': 'G30', 'Gas * 45': 'G45', 'Gas * 10': 'G10', 'Gas * 15': 'G15',
  'StarFlame': 'SF', 'GAS YALE': 'YALE', 'Thermolene': 'THERMO', 'GAS P10': 'P10'
}

const GAS_CAPACIDAD = { O2:10, CO2:15, AR:10, N2:10, C2H2:40, 'MIX-7525':10, G30:30, G45:45, G10:10, G15:15, SF:10, YALE:30, THERMO:10, P10:10 }
const GAS_PRESION = { O2:200, CO2:60, AR:200, N2:200, C2H2:20, 'MIX-7525':200, G30:8, G45:8, G10:8, G15:8, SF:200, YALE:8, THERMO:200, P10:200 }
const MAP_ESTADO = { 'Vacío': 'VACIO', 'LLeno': 'LLENO', 'En recarga': 'EN_CARGA', 'Lleno': 'LLENO' }

function limpiarCodigo(raw) {
  let c = (raw || '').trim()
  if (c.startsWith('="') && c.endsWith('"')) c = c.slice(2, -1)
  if (c.endsWith('.')) c = c.slice(0, -1)
  return c
}

function parseFecha(str) {
  if (!str || str.trim() === '') return null
  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  const d = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T12:00:00Z`)
  return isNaN(d.getTime()) ? null : d
}

function safeDate(str, fallback) {
  const d = parseFecha(str)
  return d || fallback || new Date()
}

async function main() {
  console.log('=== CONTINUAR MIGRACIÓN TUBOS ===')

  // Get existing series
  const existing = await prisma.cylinder.findMany({ select: { numeroSerie: true } })
  const existingSet = new Set(existing.map(e => e.numeroSerie))
  console.log(`Ya existen en DB: ${existingSet.size} cylinders`)

  // Get gas lookup
  const gases = await prisma.gas.findMany({ select: { id: true, codigo: true } })
  const gasMap = {}
  gases.forEach(g => { gasMap[g.codigo] = g.id })
  console.log(`Gases disponibles: ${Object.keys(gasMap).length}`)

  // Load XLS data
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
  console.log(`Registros totales XLS: ${raw.length}`)

  const pendientes = raw.filter(r => !existingSet.has(limpiarCodigo(r.codigo)))
  console.log(`Pendientes de migrar: ${pendientes.length}`)

  if (pendientes.length === 0) {
    console.log('Todo migrado!')
    return
  }

  let creados = 0
  let errores = 0

  for (let i = 0; i < pendientes.length; i += BATCH_SIZE) {
    const batch = pendientes.slice(i, i + BATCH_SIZE)
    const toCreate = []

    for (const row of batch) {
      try {
        const numeroSerie = limpiarCodigo(row.codigo)
        const gasCod = MAP_TIPO_CARGA_TO_GAS[row.tipo_carga]
        const gasId = gasMap[gasCod]
        if (!gasId) { console.error(`  [ERR] Gas ${gasCod} no encontrado`); errores++; continue }

        const estadoStr = row.estado.replace(/\uFFFD/g, 'í').trim()
        const estado = MAP_ESTADO[estadoStr] || 'VACIO'
        const fechaAlta = safeDate(row.fecha_alta)
        const fechaProximoRetest = safeDate(row.fecha_venc, new Date(fechaAlta.getTime() + 5 * 365 * 24 * 60 * 60 * 1000))
        const capacidad = GAS_CAPACIDAD[gasCod] || 10
        const presionBar = GAS_PRESION[gasCod] || 200
        const propParts = (row.propiedad || '').split(/,\s*/)
        const propNombre = propParts.slice(1).join(', ').trim()

        toCreate.push({
          numeroSerie,
          capacidadLitros: capacidad,
          fechaProximoRetest,
          gasId,
          presionActualBar: presionBar,
          estado,
          ubicacionLat: DEFAULT_LAT,
          ubicacionLng: DEFAULT_LNG,
          ubicacionNombre: row.ubicacion || 'DEPOSITO',
          provincia: DEFAULT_PROVINCIA,
          propietario: propNombre || null,
          cliente: propNombre || null,
          createdAt: fechaAlta,
          updatedAt: new Date()
        })
      } catch (err) {
        console.error(`  [ERR] ${row.codigo}: ${err.message}`)
        errores++
      }
    }

    if (toCreate.length > 0) {
      try {
        await prisma.cylinder.createMany({ data: toCreate, skipDuplicates: true })
        creados += toCreate.length
        console.log(`  [BATCH] ${i + 1}-${Math.min(i + BATCH_SIZE, pendientes.length)}/${pendientes.length}: ${toCreate.length} creados`)
      } catch (err) {
        console.error(`  [BATCH ERR] ${err.message}`)
        errores += toCreate.length
      }
    }
  }

  console.log()
  console.log('=== CONTINUACIÓN COMPLETADA ===')
  console.log(`Creados: ${creados}`)
  console.log(`Errores: ${errores}`)

  const final = await prisma.cylinder.count()
  console.log(`Total final en DB: ${final}`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) }).finally(() => prisma.$disconnect())
