const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DATA_PATH = 'C:\\Users\\Usuario\\Downloads\\tubos-data.json'
const DRY_RUN = !process.argv.includes('--live')
const DEFAULT_LAT = -33.361664
const DEFAULT_LNG = -60.186145
const DEFAULT_PROVINCIA = 'BUENOS AIRES'
const BATCH_SIZE = 100

const MAP_TIPO_CARGA_TO_GAS = {
  'Oxigeno': { codigo: 'O2', buscar: true },
  'CO2': { codigo: 'CO2', buscar: true },
  'Argon': { codigo: 'AR', buscar: true },
  'Nitrogeno': { codigo: 'N2', buscar: true },
  'Acetileno': { codigo: 'C2H2', buscar: true },
  'Agamix20': { codigo: 'MIX-7525', buscar: true },
  'ARGON 5.0': { codigo: 'AR', buscar: true },
  'Gas * 30': {
    codigo: 'G30',
    nombre: 'Gas Envasado 30kg',
    descripcion: 'Gas licuado de petróleo envasado 30kg',
    presionBar: 8,
    colorHex: '#FF6600',
    usoPrincipal: 'Combustible doméstico e industrial',
    categoria: 'COMBUSTIBLE',
    peligro: 'INFLAMABLE'
  },
  'Gas * 45': {
    codigo: 'G45',
    nombre: 'Gas Envasado 45kg',
    descripcion: 'Gas licuado de petróleo envasado 45kg',
    presionBar: 8,
    colorHex: '#FF6600',
    usoPrincipal: 'Combustible doméstico e industrial',
    categoria: 'COMBUSTIBLE',
    peligro: 'INFLAMABLE'
  },
  'Gas * 10': {
    codigo: 'G10',
    nombre: 'Gas Envasado 10kg',
    descripcion: 'Gas licuado de petróleo envasado 10kg',
    presionBar: 8,
    colorHex: '#FF6600',
    usoPrincipal: 'Combustible doméstico',
    categoria: 'COMBUSTIBLE',
    peligro: 'INFLAMABLE'
  },
  'Gas * 15': {
    codigo: 'G15',
    nombre: 'Gas Envasado 15kg',
    descripcion: 'Gas licuado de petróleo envasado 15kg',
    presionBar: 8,
    colorHex: '#FF6600',
    usoPrincipal: 'Combustible doméstico',
    categoria: 'COMBUSTIBLE',
    peligro: 'INFLAMABLE'
  },
  'StarFlame': {
    codigo: 'SF',
    nombre: 'StarFlame',
    descripcion: 'Mezcla especial para soldadura con llama reductora',
    presionBar: 200,
    colorHex: '#FF0000',
    usoPrincipal: 'Soldadura oxigas',
    categoria: 'COMBUSTIBLE',
    peligro: 'INFLAMABLE'
  },
  'GAS YALE': {
    codigo: 'YALE',
    nombre: 'Gas Yale',
    descripcion: 'Gas especial para autoelevadores Yale',
    presionBar: 8,
    colorHex: '#FFD700',
    usoPrincipal: 'Combustible para autoelevadores',
    categoria: 'COMBUSTIBLE',
    peligro: 'INFLAMABLE'
  },
  'Thermolene': {
    codigo: 'THERMO',
    nombre: 'Thermolene',
    descripcion: 'Gas especial Thermolene para tratamiento térmico',
    presionBar: 200,
    colorHex: '#8B0000',
    usoPrincipal: 'Tratamiento térmico',
    categoria: 'ACTIVO',
    peligro: 'GAS_PRESION'
  },
  'GAS P10': {
    codigo: 'P10',
    nombre: 'Gas P10',
    descripcion: 'Mezcla gaseosa especial P10',
    presionBar: 200,
    colorHex: '#800080',
    usoPrincipal: 'Aplicaciones especiales',
    categoria: 'ACTIVO',
    peligro: 'GAS_PRESION'
  }
}

const MAP_ESTADO = {
  'Vacío': 'VACIO',
  'LLeno': 'LLENO',
  'En recarga': 'EN_CARGA',
  'Lleno': 'LLENO'
}

const GAS_CAPACIDAD_LITROS = {
  'O2': 10,
  'CO2': 15,
  'AR': 10,
  'N2': 10,
  'C2H2': 40,
  'MIX-7525': 10,
  'G30': 30,
  'G45': 45,
  'G10': 10,
  'G15': 15,
  'SF': 10,
  'YALE': 30,
  'THERMO': 10,
  'P10': 10
}

const GAS_PRESION_BAR = {
  'O2': 200,
  'CO2': 60,
  'AR': 200,
  'N2': 200,
  'C2H2': 20,
  'MIX-7525': 200,
  'G30': 8,
  'G45': 8,
  'G10': 8,
  'G15': 8,
  'SF': 200,
  'YALE': 8,
  'THERMO': 200,
  'P10': 200
}

function limpiarCodigo(raw) {
  let c = (raw || '').trim()
  if (c.startsWith('="') && c.endsWith('"')) {
    c = c.slice(2, -1)
  }
  return c
}

function parseFecha(str) {
  if (!str || str.trim() === '') return null
  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  const d = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T12:00:00Z`)
  return isNaN(d.getTime()) ? null : d
}

async function getOrCreateGas(tipoCarga) {
  const def = MAP_TIPO_CARGA_TO_GAS[tipoCarga]
  if (!def) {
    throw new Error(`Tipo de carga desconocido: ${tipoCarga}`)
  }

  if (def.buscar) {
    const gas = await prisma.gas.findUnique({ where: { codigo: def.codigo } })
    if (!gas) throw new Error(`Gas ${def.codigo} no encontrado en DB para ${tipoCarga}`)
    return gas
  }

  // Crear nuevo gas
  const existing = await prisma.gas.findUnique({ where: { codigo: def.codigo } })
  if (existing) return existing

  const gas = await prisma.gas.create({
    data: {
      codigo: def.codigo,
      nombre: def.nombre,
      descripcion: def.descripcion,
      presionBar: def.presionBar,
      colorHex: def.colorHex,
      usoPrincipal: def.usoPrincipal,
      categoria: def.categoria,
      peligro: def.peligro
    }
  })
  console.log(`  [GAS] Creado ${gas.codigo} → ${gas.nombre}`)
  return gas
}

async function findClientePorNombre(nombre) {
  if (!nombre) return null
  const clean = nombre.trim().toUpperCase().replace(/\./g, '')

  // Try exact match with ignorePunctuation
  let c = await prisma.cliente.findFirst({
    where: { nombre: { contains: clean, mode: 'insensitive' } },
    select: { id: true, nombre: true }
  })
  if (c) return c

  // Try first 3+ words
  const words = clean.split(/\s+/).filter(w => w.length > 2)
  if (words.length >= 3) {
    c = await prisma.cliente.findFirst({
      where: { nombre: { contains: words[0], mode: 'insensitive' } },
      select: { id: true, nombre: true }
    })
    if (c) return c
  }

  return null
}

async function main() {
  console.log('=== MIGRACIÓN TUBOS.XLS → CYLINDER ===')
  console.log(`DRY RUN: ${DRY_RUN ? 'SÍ' : 'NO'}`)
  console.log()

  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
  console.log(`Registros cargados: ${raw.length}`)
  console.log()

  // Find unique gas types
  const tipos = [...new Set(raw.map(r => r.tipo_carga))]
  console.log(`Tipos de carga únicos: ${tipos.length}`)
  console.log(`  ${tipos.join(', ')}`)
  console.log()

  if (!DRY_RUN) {
    // Create/verify gases
    for (const tipo of tipos) {
      const gas = await getOrCreateGas(tipo)
      console.log(`  [GAS] ${tipo} → ${gas.codigo} (${gas.id})`)
    }
    console.log()
  }

  // Process cylinders
  let creados = 0
  let existentes = 0
  let errores = 0
  let conCliente = 0
  const batch = []

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i]
    const numeroSerie = limpiarCodigo(row.codigo)
    const estadoStr = row.estado.replace(/\uFFFD/g, 'í').trim()
    const estado = MAP_ESTADO[estadoStr] || 'VACIO'

    // Parse propiedad: "1, Julio Conti SRL" or "7174, PAVESE LEONARDO"
    const propParts = (row.propiedad || '').split(/,\s*/)
    const propId = propParts[0] || ''
    const propNombre = propParts.slice(1).join(', ').trim()

    // Get gas
    const def = MAP_TIPO_CARGA_TO_GAS[row.tipo_carga]
    const gasCodigo = def.codigo
    const capacidad = GAS_CAPACIDAD_LITROS[gasCodigo] || 10
    const presionBar = GAS_PRESION_BAR[gasCodigo] || 200

    // Parse dates
    const fechaAlta = parseFecha(row.fecha_alta) || new Date()
    const fechaVenc = parseFecha(row.fecha_venc)
    const fechaUltMov = parseFecha(row.fecha_ultmov)

    // Default retest: if venc exists use it, else +5 years from alta
    const fechaProximoRetest = fechaVenc || new Date(fechaAlta.getTime() + 5 * 365 * 24 * 60 * 60 * 1000)

    if (DRY_RUN) {
      console.log(`  [DRY] ${i + 1}/${raw.length}: ${numeroSerie} → ${row.tipo_carga} (${estadoStr} → ${estado})`)
      continue
    }

    batch.push({
      numeroSerie,
      gasCodigo,
      estado,
      propNombre,
      ubicacion: row.ubicacion || 'DEPOSITO',
      fechaAlta,
      fechaUltMov,
      fechaProximoRetest,
      capacidad,
      presionBar
    })

    // Execute in batches
    if (batch.length >= BATCH_SIZE || i === raw.length - 1) {
      try {
        for (const b of batch) {
          const existing = await prisma.cylinder.findUnique({ where: { numeroSerie: b.numeroSerie } })
          if (existing) {
            console.log(`  [SKIP] ${b.numeroSerie} — ya existe`)
            existentes++
            continue
          }

          const gas = await prisma.gas.findUnique({ where: { codigo: b.gasCodigo } })
          if (!gas) {
            console.error(`  [ERR] ${b.numeroSerie} — Gas ${b.gasCodigo} no encontrado`)
            errores++
            continue
          }

          // Find client
          let cliente = null
          if (b.propNombre) {
            cliente = await findClientePorNombre(b.propNombre)
          }

          await prisma.cylinder.create({
            data: {
              numeroSerie: b.numeroSerie,
              capacidadLitros: b.capacidad,
              fechaProximoRetest: b.fechaProximoRetest,
              gasId: gas.id,
              presionActualBar: b.presionBar,
              estado: b.estado,
              ubicacionLat: DEFAULT_LAT,
              ubicacionLng: DEFAULT_LNG,
              ubicacionNombre: b.ubicacion,
              provincia: DEFAULT_PROVINCIA,
              propietario: b.propNombre || null,
              cliente: b.propNombre || null,
              clienteId: cliente ? cliente.id : null,
              createdAt: b.fechaAlta
            }
          })
          if (cliente) conCliente++
          creados++
          const cli = cliente ? ` (cliente: ${cliente.nombre})` : ''
          console.log(`  [OK] ${b.numeroSerie} → ${gas.codigo} ${b.estado}${cli}`)
        }
      } catch (err) {
        console.error(`  [BATCH ERR] ${err.message}`)
        errores += batch.length
      }
      batch.length = 0
    }
  }

  console.log()
  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETADO ===')
    console.log(`Se procesarían ${raw.length} registros`)
    console.log('Ejecutá con --live para migrar realmente')
    process.exit(0)
  }

  console.log('=== MIGRACIÓN COMPLETADA ===')
  console.log(`Creados: ${creados}`)
  console.log(`Ya existían: ${existentes}`)
  console.log(`Con cliente vinculado: ${conCliente}`)
  console.log(`Errores: ${errores}`)
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
