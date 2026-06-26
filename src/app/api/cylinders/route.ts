import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncCylinderToGraph } from '@/lib/neo4j'

// GET /api/cylinders - listar todos los tubos con filtros opcionales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serie = searchParams.get('serie') || undefined
    const gasId = searchParams.get('gasId') || undefined
    const estado = searchParams.get('estado') || undefined
    const capacidad = searchParams.get('capacidad')
    const ubicacion = searchParams.get('ubicacion') || undefined
    const cliente = searchParams.get('cliente') || undefined
    const clienteId = searchParams.get('clienteId') || undefined
    const propietario = searchParams.get('propietario') || undefined

    const where: Record<string, unknown> = {}
    if (serie) where.numeroSerie = { contains: serie }
    if (gasId) where.gasId = gasId
    if (estado) where.estado = estado
    if (capacidad) where.capacidadLitros = parseInt(capacidad, 10)
    if (ubicacion) where.ubicacionNombre = { contains: ubicacion }
    if (cliente) where.cliente = { contains: cliente }
    if (clienteId) where.clienteId = clienteId
    if (propietario) where.propietario = { contains: propietario }

    const cylinders = await db.cylinder.findMany({
      where,
      include: { gas: true },
      orderBy: { numeroSerie: 'asc' },
    })

    return NextResponse.json(cylinders)
  } catch (e) {
    console.error('GET /api/cylinders', e)
    return NextResponse.json({ error: 'Error al obtener tubos' }, { status: 500 })
  }
}

// POST /api/cylinders - crear un tubo nuevo con todos los campos normativos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.numeroSerie || !body.gasId || !body.capacidadLitros) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: numeroSerie, gasId, capacidadLitros' },
        { status: 400 }
      )
    }

    const existente = await db.cylinder.findUnique({
      where: { numeroSerie: body.numeroSerie },
    })
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un tubo con ese número de serie' },
        { status: 400 }
      )
    }

    // Construir fecha de vencimiento si no viene
    const fechaProximoRetest = body.fechaProximoRetest
      ? new Date(body.fechaProximoRetest)
      : (() => {
          const d = new Date()
          d.setFullYear(d.getFullYear() + 5)
          return d
        })()

    const cylinder = await db.cylinder.create({
      data: {
        numeroSerie: body.numeroSerie,
        // Identificación
        propietario: body.propietario || null,
        fabricante: body.fabricante || null,
        paisFabricacion: body.paisFabricacion || null,
        marcaUN: Boolean(body.marcaUN),
        // Especificaciones
        normaFabricacion: body.normaFabricacion || null,
        presionTrabajoBar: body.presionTrabajoBar ? parseInt(body.presionTrabajoBar, 10) : null,
        roscacilindro: body.roscacilindro || null,
        espesorMinParedMm: body.espesorMinParedMm ? parseFloat(body.espesorMinParedMm) : null,
        materialAleacion: body.materialAleacion || null,
        // Pesos
        capacidadLitros: parseInt(body.capacidadLitros, 10),
        diametroMm: body.diametroMm ? parseFloat(body.diametroMm) : null,
        pesoVacioKg: body.pesoVacioKg ? parseFloat(body.pesoVacioKg) : null,
        pesoTaraKg: body.pesoTaraKg ? parseFloat(body.pesoTaraKg) : null,
        pesoMaxLlenadoKg: body.pesoMaxLlenadoKg ? parseFloat(body.pesoMaxLlenadoKg) : null,
        // Inspección
        presionEnsayoBar: body.presionEnsayoBar ? parseInt(body.presionEnsayoBar, 10) : null,
        fechaEnsayoInicial: body.fechaEnsayoInicial || null,
        fechaUltimoRetest: body.fechaUltimoRetest ? new Date(body.fechaUltimoRetest) : null,
        fechaProximoRetest,
        resultadoInspeccion: body.resultadoInspeccion || 'APROBADO',
        inspectorId: body.inspectorId || null,
        laboratorio: body.laboratorio || null,
        metodoPrueba: body.metodoPrueba || null,
        // Gas
        gasId: body.gasId,
        presionActualBar: parseInt(body.presionActualBar || 0, 10),
        // Específicos acetileno
        masaPorosaId: body.masaPorosaId || null,
        tipoSolvente: body.tipoSolvente || null,
        solventeMasaKg: body.solventeMasaKg ? parseFloat(body.solventeMasaKg) : null,
        // Vida útil
        vidaUtilLimite: body.vidaUtilLimite ? new Date(body.vidaUtilLimite) : null,
        // Reparaciones y observaciones
        reparaciones: body.reparaciones || null,
        observaciones: body.observaciones || null,
        // Operativo
        estado: body.estado || 'LLENO',
        ubicacionLat: parseFloat(body.ubicacionLat),
        ubicacionLng: parseFloat(body.ubicacionLng),
        ubicacionNombre: body.ubicacionNombre,
        provincia: body.provincia || '',
        cliente: body.cliente || null,
        fechaCarga: body.fechaCarga ? new Date(body.fechaCarga) : null,
        compatibleH2: Boolean(body.compatibleH2),
      },
      include: { gas: true },
    })

    // Crear movimiento de auditoría (alta)
    await db.cylinderMovimiento.create({
      data: {
        cylinderId: cylinder.id,
        tipo: 'ALTA',
        descripcion: `Alta de tubo ${cylinder.numeroSerie} - ${cylinder.gas.nombre}`,
        usuario: body.usuario || 'sistema',
        ubicacion: cylinder.ubicacionNombre,
        latDestino: cylinder.ubicacionLat,
        lngDestino: cylinder.ubicacionLng,
      },
    })

    // Sincronizar con Neo4j (si está habilitado)
    await syncCylinderToGraph({
      id: cylinder.id,
      numeroSerie: cylinder.numeroSerie,
      gasId: cylinder.gasId,
      gas: cylinder.gas,
      cliente: cylinder.cliente,
      ubicacionNombre: cylinder.ubicacionNombre,
      provincia: cylinder.provincia,
      inspectorId: cylinder.inspectorId,
      laboratorio: cylinder.laboratorio,
      fabricante: cylinder.fabricante,
      estado: cylinder.estado,
      capacidadLitros: cylinder.capacidadLitros,
      presionActualBar: cylinder.presionActualBar,
    })

    return NextResponse.json(cylinder, { status: 201 })
  } catch (e) {
    console.error('POST /api/cylinders', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear tubo' },
      { status: 500 }
    )
  }
}
