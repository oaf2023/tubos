// Script de semilla - carga gases, ubicaciones y tubos con datos normativos completos
// ISO 18119, NTC 5719, Resolución 2876/2013
import { PrismaClient } from '@prisma/client'
import {
  GASES,
  CIUDADES_ARGENTINA,
  CAPACIDADES_LITROS,
  CLIENTES_EJEMPLO,
  ESTADOS,
} from '../src/lib/catalogo'

const db = new PrismaClient()

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 1): number {
  const v = Math.random() * (max - min) + min
  return parseFloat(v.toFixed(decimals))
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Datos normativos
const FABRICANTES = [
  'Matheson Tri-Gas',
  'Air Liquide Argentina',
  'Indura S.A.',
  'Praxair Argentina',
  'Cryogas',
  'Aldo Tochi S.A.',
]
const PAISES = ['AR', 'BR', 'US', 'DE', 'CN']
const NORMAS = ['ISO 9809-1', 'ISO 9809-3', 'DOT 3AA', 'TC-3WM', 'EN 1964-1']
const ROSCAS = ['25E', '3/4-14 NGT', '18NEF', '1"-11.5 UNS', '25E ISO']
const MATERIALES = ['Acero 4130 (H)', 'Acero 4130 (HG)', 'Aluminio 6061', 'Aluminio 6061-T6']
const INSPECTORES = ['INTI-ENM', 'LITORAL GAS', 'CITAC', 'IRAM-SEPCA', 'TÜV-AR']
const LABORATORIOS = [
  'Laboratorio INTI-Mecánica',
  'Citac Córdoba',
  'Ensayos Hidrostáticos Rosario',
  'Laboratorio Litoral',
]
const METODOS = ['HIDROSTATICA', 'ULTRASONIDO', 'PRESION_PRUEBA']
const RESULTADOS = ['APROBADO', 'APROBADO', 'APROBADO', 'APROBADO', 'RECHAZADO']

async function main() {
  console.log('🌱 Iniciando semilla con datos normativos...')

  // 1. Cargar gases
  console.log(' → Cargando tipos de gases...')
  for (const g of GASES) {
    await db.gas.upsert({
      where: { codigo: g.codigo },
      update: {},
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
  console.log(`   ✓ ${GASES.length} gases cargados`)

  // 1b. Crear configuración de alertas por defecto para cada gas
  console.log(' → Creando configuración de alertas...')
  const allGases = await db.gas.findMany()
  for (const g of allGases) {
    await db.alertConfig.upsert({
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
  console.log(`   ✓ ${allGases.length} configuraciones de alertas creadas`)

  // 2. Cargar ubicaciones
  console.log(' → Cargando ciudades de distribución...')
  for (const c of CIUDADES_ARGENTINA) {
    await db.location.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: {
        nombre: c.nombre,
        provincia: c.provincia,
        lat: c.lat,
        lng: c.lng,
        esBase: c.tipo === 'BASE',
        tipo: c.tipo,
        direccion: c.tipo === 'BASE' ? 'Planta Industrial - Acceso Norte' : null,
        telefono: c.tipo === 'BASE' ? '+54 336 442-2200' : null,
      },
    })
  }
  console.log(`   ✓ ${CIUDADES_ARGENTINA.length} ubicaciones cargadas`)

  // 3. Generar tubos con datos normativos completos
  console.log(' → Generando tubos con datos normativos...')
  await db.cylinderMovimiento.deleteMany({})
  await db.cylinder.deleteMany({})

  const gases = await db.gas.findMany()
  const base = CIUDADES_ARGENTINA[0]
  const destinos = CIUDADES_ARGENTINA.slice(1)

  const cantidadTubos = 80
  const hoy = new Date()

  for (let i = 0; i < cantidadTubos; i++) {
    const gas = randomFrom(gases)
    const capacidad = randomFrom(CAPACIDADES_LITROS)
    const estado = randomFrom(ESTADOS as unknown as string[])

    const enBase = Math.random() < 0.7
    let ubicacion = base
    if (!enBase) ubicacion = randomFrom(destinos)

    // Presión según estado
    let presionActual = gas.presionBar
    if (estado === 'VACIO') presionActual = 0
    else if (estado === 'EN_USO') presionActual = Math.floor(gas.presionBar * 0.4)
    else if (estado === 'MANTENIMIENTO') presionActual = 0
    else if (estado === 'TRANSITO') presionActual = gas.presionBar

    const anio = randomInt(2019, 2025)
    const serie = `SN-${anio}-${String(i + 1).padStart(4, '0')}`

    // Pesos según capacidad
    const pesoVacio = randomFloat(capacidad * 0.7, capacidad * 1.1, 1)
    const pesoTara = pesoVacio + randomFloat(2.0, 4.5, 1)
    const pesoMaxLlenado = gas.codigo === 'CO2' ? randomFloat(capacidad * 0.6, capacidad * 0.7, 2) : null

    // Inspección
    const fechaEnsayoInicial = `${String(randomInt(1, 12)).padStart(2, '0')}/${anio - randomInt(2, 6)}`
    const fechaUltimo = new Date(hoy)
    fechaUltimo.setFullYear(hoy.getFullYear() - randomInt(0, 3))
    const fechaProximo = new Date(fechaUltimo)
    fechaProximo.setFullYear(fechaUltimo.getFullYear() + 5)

    const resultado = randomFrom(RESULTADOS)
    const inspector = randomFrom(INSPECTORES)
    const laboratorio = randomFrom(LABORATORIOS)
    const metodo = randomFrom(METODOS)

    // Cliente solo si no está en base y no está vacío/mantenimiento
    let cliente: string | null = null
    if (!enBase && estado !== 'MANTENIMIENTO') {
      cliente = randomFrom(CLIENTES_EJEMPLO)
    }

    // Específicos para acetileno
    const esAcetileno = gas.codigo === 'C2H2'
    const masaPorosaId = esAcetileno ? `MP-${randomInt(100, 999)}` : null
    const tipoSolvente = esAcetileno ? (Math.random() < 0.85 ? 'ACETONA' : 'DMF') : null
    const solventeMasaKg = esAcetileno ? randomFloat(8, 15, 2) : null

    // Compatibilidad H2 (solo si el gas es H2)
    const compatibleH2 = gas.codigo === 'H2' ? true : false

    // Vida útil límite (solo para algunos tubos compuestos)
    const vidaUtilLimite = Math.random() < 0.15
      ? (() => {
          const d = new Date(hoy)
          d.setFullYear(d.getFullYear() + randomInt(3, 12))
          return d
        })()
      : null

    const cyl = await db.cylinder.create({
      data: {
        numeroSerie: serie,
        // Identificación
        propietario: 'GasTrack AR S.A.',
        fabricante: randomFrom(FABRICANTES),
        paisFabricacion: randomFrom(PAISES),
        marcaUN: Math.random() < 0.85,
        // Especificaciones
        normaFabricacion: randomFrom(NORMAS),
        presionTrabajoBar: gas.presionBar,
        roscacilindro: randomFrom(ROSCAS),
        espesorMinParedMm: randomFloat(3.5, 6.5, 2),
        materialAleacion: randomFrom(MATERIALES),
        // Pesos
        capacidadLitros: capacidad,
        pesoVacioKg: pesoVacio,
        pesoTaraKg: pesoTara,
        pesoMaxLlenadoKg: pesoMaxLlenado,
        // Inspección
        presionEnsayoBar: Math.floor(gas.presionBar * 1.5),
        fechaEnsayoInicial,
        fechaUltimoRetest: fechaUltimo,
        fechaProximoRetest: fechaProximo,
        resultadoInspeccion: resultado,
        inspectorId: inspector,
        laboratorio,
        metodoPrueba: metodo,
        // Gas
        gasId: gas.id,
        presionActualBar: presionActual,
        // Específicos acetileno
        masaPorosaId,
        tipoSolvente,
        solventeMasaKg,
        // Vida útil
        vidaUtilLimite,
        // Operativo
        estado,
        ubicacionLat: ubicacion.lat + (Math.random() - 0.5) * 0.05,
        ubicacionLng: ubicacion.lng + (Math.random() - 0.5) * 0.05,
        ubicacionNombre: ubicacion.nombre,
        provincia: ubicacion.provincia,
        cliente,
        fechaCarga: estado !== 'VACIO' ? (() => {
          const d = new Date(hoy)
          d.setDate(hoy.getDate() - randomInt(1, 90))
          return d
        })() : null,
        compatibleH2,
        // Observaciones aleatorias
        observaciones: Math.random() < 0.1 ? 'Posición vertical obligatoria' : null,
      },
    })

    // Movimiento inicial de alta
    await db.cylinderMovimiento.create({
      data: {
        cylinderId: cyl.id,
        tipo: 'ALTA',
        descripcion: `Alta inicial - ${gas.nombre} ${capacidad}L - ${ubicacion.nombre}`,
        usuario: 'sistema-seed',
        ubicacion: ubicacion.nombre,
        latDestino: cyl.ubicacionLat,
        lngDestino: cyl.ubicacionLng,
      },
    })

    // 30% de los tubos tienen un movimiento adicional
    if (Math.random() < 0.3) {
      const fechaMov = new Date(hoy)
      fechaMov.setDate(hoy.getDate() - randomInt(1, 60))
      await db.cylinderMovimiento.create({
        data: {
          cylinderId: cyl.id,
          tipo: randomFrom(['CARGA', 'DESCARGA', 'TRASLADO', 'INSPECCION']),
          descripcion: `Movimiento automático de seed - ${randomFrom(['carga completa', 'descarga parcial', 'traslado a cliente', 'inspección visual OK'])}`,
          usuario: 'sistema-seed',
          fecha: fechaMov,
          ubicacion: ubicacion.nombre,
        },
      })
    }
  }
  console.log(`   ✓ ${cantidadTubos} tubos con datos normativos generados`)

  // 4. Cargar clientes con perfil técnico detallado
  console.log(' → Cargando clientes con perfil técnico...')
  const CLIENTES_DETALLE = [
    { nombre: 'Metalúrgica San Martín S.A.', taxId: '30-71234567-8', tipologia: 'Metalúrgica Pesada', procesoSoldadura: 'MIG/MAG + TIG', materialesBase: 'Acero carbono, inoxidable', gasesConsumo: 'MIX-7525, AR, CO2', modoEnvasado: 'Cilindros', nivelesStockCritico: 10, estadoCuenta: 'AL_DIA' },
    { nombre: 'Construcciones del Plata S.R.L.', taxId: '30-72345678-9', tipologia: 'Construcción Pesada', procesoSoldadura: 'Electrodo + Oxicorte', materialesBase: 'Acero estructural', gasesConsumo: 'C2H2, O2', modoEnvasado: 'Cilindros', nivelesStockCritico: 8, estadoCuenta: 'AL_DIA' },
    { nombre: 'Taller Soldadura Rossi Hnos.', taxId: '30-73456789-0', tipologia: 'Taller Metalúrgico', procesoSoldadura: 'TIG + MIG/MAG', materialesBase: 'Aluminio, acero inoxidable', gasesConsumo: 'AR, AR-HE, N2', modoEnvasado: 'Cilindros', nivelesStockCritico: 15, estadoCuenta: 'AL_DIA' },
    { nombre: 'Herrería Artística Belgrano', taxId: '30-74567890-1', tipologia: 'Herrería Artística', procesoSoldadura: 'MIG/MAG + Electrodo', materialesBase: 'Acero, hierro forjado', gasesConsumo: 'MIX-7525, CO2', modoEnvasado: 'Cilindros', nivelesStockCritico: 5, estadoCuenta: 'AL_DIA' },
    { nombre: 'Estructuras Metálicas del Litoral', taxId: '30-75678901-2', tipologia: 'Estructuras Metálicas', procesoSoldadura: 'MIG/MAG + TIG', materialesBase: 'Acero carbono, galvanizado', gasesConsumo: 'MIX-7525, AR', modoEnvasado: 'Bloques', nivelesStockCritico: 12, estadoCuenta: 'PENDIENTE' },
    { nombre: 'Calderas y Tanques Argentina', taxId: '30-76789012-3', tipologia: 'Calderería', procesoSoldadura: 'TIG + Electrodo', materialesBase: 'Acero inoxidable, carbono', gasesConsumo: 'AR, N2, MIX-7525', modoEnvasado: 'Cilindros', nivelesStockCritico: 20, estadoCuenta: 'AL_DIA' },
    { nombre: 'Ferretería Industrial El Torno', taxId: '30-77890123-4', tipologia: 'Comercio Industrial', procesoSoldadura: 'MIG/MAG', materialesBase: 'Acero', gasesConsumo: 'MIX-7525, O2, C2H2', modoEnvasado: 'Cilindros', nivelesStockCritico: 6, estadoCuenta: 'AL_DIA' },
    { nombre: 'Soldaduras y Servicios Pérez', taxId: '30-78901234-5', tipologia: 'Servicios de Soldadura', procesoSoldadura: 'TIG + MIG/MAG + Oxicorte', materialesBase: 'Acero, inox, aluminio', gasesConsumo: 'AR, MIX-7525, O2, C2H2', modoEnvasado: 'Cilindros', nivelesStockCritico: 8, estadoCuenta: 'AL_DIA' },
    { nombre: 'Metalfor S.A.I.C.', taxId: '30-79012345-6', tipologia: 'Industria Metalúrgica', procesoSoldadura: 'MIG/MAG + TIG', materialesBase: 'Acero, aluminio', gasesConsumo: 'AR, MIX-7525, HE', modoEnvasado: 'Microgranel', nivelesStockCritico: 25, estadoCuenta: 'AL_DIA' },
    { nombre: 'Aceros Bragado S.A.', taxId: '30-80123456-7', tipologia: 'Aceros', procesoSoldadura: 'Electrodo + Oxicorte', materialesBase: 'Acero carbono', gasesConsumo: 'O2, C2H2', modoEnvasado: 'Cilindros', nivelesStockCritico: 4, estadoCuenta: 'MOROSO' },
    { nombre: 'Industrias Metalúrgicas Pampa', taxId: '30-81234567-8', tipologia: 'Industria Pesada', procesoSoldadura: 'TIG + MIG/MAG', materialesBase: 'Acero inoxidable, aluminio', gasesConsumo: 'AR, AR-HE, N2', modoEnvasado: 'Bloques', nivelesStockCritico: 15, estadoCuenta: 'AL_DIA' },
    { nombre: 'Taller Mecánico Don Bosco', taxId: '30-82345678-9', tipologia: 'Taller Mecánico', procesoSoldadura: 'MIG/MAG + Electrodo', materialesBase: 'Acero', gasesConsumo: 'MIX-7525, CO2', modoEnvasado: 'Cilindros', nivelesStockCritico: 3, estadoCuenta: 'PENDIENTE' },
    { nombre: 'Constructora Andina', taxId: '30-83456789-0', tipologia: 'Construcción', procesoSoldadura: 'Electrodo + Oxicorte', materialesBase: 'Acero estructural', gasesConsumo: 'C2H2, O2', modoEnvasado: 'Cilindros', nivelesStockCritico: 10, estadoCuenta: 'AL_DIA' },
    { nombre: 'Carrocerías del Centro', taxId: '30-84567890-1', tipologia: 'Carrocerías', procesoSoldadura: 'MIG/MAG', materialesBase: 'Acero, aluminio', gasesConsumo: 'MIX-7525, AR', modoEnvasado: 'Cilindros', nivelesStockCritico: 7, estadoCuenta: 'AL_DIA' },
    { nombre: 'Soldadura Especializada Gutiérrez', taxId: '30-85678901-2', tipologia: 'Soldadura Especializada', procesoSoldadura: 'TIG + Plasma', materialesBase: 'Inoxidable, aluminio, titanio', gasesConsumo: 'AR, AR-HE, H2, N2', modoEnvasado: 'Cilindros', nivelesStockCritico: 10, estadoCuenta: 'AL_DIA' },
  ]

  for (const c of CLIENTES_DETALLE) {
    await db.cliente.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: {
        nombre: c.nombre,
        taxId: c.taxId,
        tipologia: c.tipologia,
        procesoSoldadura: c.procesoSoldadura,
        materialesBase: c.materialesBase,
        gasesConsumo: c.gasesConsumo,
        modoEnvasado: c.modoEnvasado,
        nivelesStockCritico: c.nivelesStockCritico,
        estadoCuenta: c.estadoCuenta,
        activo: true,
      },
    })
  }
  console.log(`   ✓ ${CLIENTES_DETALLE.length} clientes cargados`)

  // 5. Crear ruta de ejemplo
  console.log(' → Creando ruta de demostración...')
  await db.rutaParada.deleteMany({})
  await db.ruta.deleteMany({})

  const ciudadesRuta = ['Rosario', 'Pergamino', 'Buenos Aires (CABA)', 'Campana', 'San Pedro']
  let distanciaTotal = 0
  let anterior = base

  const ruta = await db.ruta.create({
    data: {
      nombre: 'Ruta Litoral Norte - Lunes',
      estado: 'PLANIFICADA',
      origenNombre: base.nombre,
      origenLat: base.lat,
      origenLng: base.lng,
    },
  })

  for (let i = 0; i < ciudadesRuta.length; i++) {
    const nombre = ciudadesRuta[i]
    const ciudad = CIUDADES_ARGENTINA.find((c) => c.nombre === nombre)!
    const distancia = haversineKm(anterior.lat, anterior.lng, ciudad.lat, ciudad.lng)
    distanciaTotal += distancia
    anterior = ciudad

    const tubosEnCiudad = await db.cylinder.findMany({
      where: { ubicacionNombre: nombre, estado: { in: ['LLENO', 'EN_USO'] } },
      take: 3,
    })

    await db.rutaParada.create({
      data: {
        rutaId: ruta.id,
        orden: i + 1,
        lat: ciudad.lat,
        lng: ciudad.lng,
        nombre: ciudad.nombre,
        provincia: ciudad.provincia,
        cylinderIds: tubosEnCiudad.map((t) => t.id).join(','),
        estado: 'PENDIENTE',
      },
    })
  }

  const retorno = haversineKm(anterior.lat, anterior.lng, base.lat, base.lng)
  distanciaTotal += retorno
  const duracionHoras = distanciaTotal / 70

  await db.ruta.update({
    where: { id: ruta.id },
    data: {
      distanciaKm: Math.round(distanciaTotal * 10) / 10,
      duracionHoras: Math.round(duracionHoras * 10) / 10,
    },
  })
  console.log(`   ✓ Ruta creada: ${ruta.nombre} (${distanciaTotal.toFixed(1)} km)`)

  console.log('\n✅ Semilla completada exitosamente!')
  console.log(`   - ${GASES.length} gases`)
  console.log(`   - ${CIUDADES_ARGENTINA.length} ubicaciones`)
  console.log(`   - ${cantidadTubos} tubos con datos normativos`)
  console.log(`   - Movimientos de auditoría generados`)
  console.log(`   - 1 ruta de demostración`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
