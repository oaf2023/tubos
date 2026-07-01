import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/clientes - listar clientes con filtros opcionales, paginación e índice alfabético
//    Sin ?page → devuelve array plano (backward compat)
//    Con ?page  → devuelve { clientes, total, page, totalPages }
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get('nombre') || undefined
    const tipologia = searchParams.get('tipologia') || undefined
    const activo = searchParams.get('activo')
    const letra = searchParams.get('letra') || undefined
    const estado = searchParams.get('estado') || undefined
    const hasPage = searchParams.has('page')
    const page = hasPage ? Math.max(1, parseInt(searchParams.get('page') || '1')) : 1
    const limit = hasPage ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12'))) : 9999

    // Build where clause
    const andConditions: Record<string, unknown>[] = []

    if (nombre) {
      andConditions.push({
        OR: [
          { nombre: { contains: nombre, mode: 'insensitive' as const } },
          { apellido: { contains: nombre, mode: 'insensitive' as const } },
        ],
      })
    }

    if (letra && letra !== 'TODOS') {
      andConditions.push({
        OR: [
          { nombre: { startsWith: letra, mode: 'insensitive' as const } },
          { apellido: { startsWith: letra, mode: 'insensitive' as const } },
        ],
      })
    }

    const where: Record<string, unknown> = {}
    if (tipologia) where.tipologia = tipologia
    if (activo === 'true') where.activo = true
    if (activo === 'false') where.activo = false
    if (estado) where.estadoCliente = estado
    if (andConditions.length === 1) where.AND = andConditions[0]
    else if (andConditions.length > 1) where.AND = andConditions

    const queryWhere = Object.keys(where).length > 0 ? where : undefined
    const skip = hasPage ? (page - 1) * limit : 0

    const [clientes, total] = await Promise.all([
      db.cliente.findMany({
        where: queryWhere,
        include: { _count: { select: { cylinders: true } } },
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        skip,
        take: limit,
      }),
      db.cliente.count({ where: queryWhere }),
    ])

    // Sin ?page → devuelve array plano (backward compat)
    if (!hasPage) return NextResponse.json(clientes)

    return NextResponse.json({
      clientes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e) {
    console.error('GET /api/clientes', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

// POST /api/clientes - crear un cliente nuevo con todos los campos del perfil técnico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.nombre || typeof body.nombre !== 'string' || body.nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre/razón social del cliente es obligatorio' },
        { status: 400 }
      )
    }

    const existente = await db.cliente.findUnique({
      where: { nombre: body.nombre.trim() },
    })
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese nombre' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {
      nombre: body.nombre.trim(),
      apellido: body.apellido || null,
      email: body.email || null,
      telefono: body.telefono || null,
      taxId: body.taxId || null,
      contacto: body.contacto || null,
      telefonoSecundario: body.telefonoSecundario || null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      genero: body.genero || null,
      tipoDocumento: body.tipoDocumento || null,
      numeroDocumento: body.numeroDocumento || null,
      calle: body.calle || null,
      altura: body.altura || null,
      piso: body.piso || null,
      codigoPostal: body.codigoPostal || null,
      ciudad: body.ciudad || null,
      provincia: body.provincia || null,
      pais: body.pais || 'Argentina',
      empresa: body.empresa || null,
      rubro: body.rubro || null,
      condicionIva: body.condicionIva || null,
      iibb: body.iibb || null,
      condicionIibb: body.condicionIibb || null,
      categoriaMonotributo: body.categoriaMonotributo || null,
      monotributoActividad: body.monotributoActividad || null,
      monotributoDesde: body.monotributoDesde ? new Date(body.monotributoDesde) : null,
      domicilioFiscal: body.domicilioFiscal || null,
      limiteCredito: body.limiteCredito != null ? parseFloat(body.limiteCredito) : null,
      firmaDigital: body.firmaDigital || null,
      tipologia: body.tipologia || null,
      procesoSoldadura: body.procesoSoldadura || null,
      materialesBase: body.materialesBase || null,
      parametrosIngenieria: body.parametrosIngenieria || null,
      modoEnvasado: body.modoEnvasado || null,
      gasesConsumo: body.gasesConsumo || null,
      serviciosEspecializados: body.serviciosEspecializados || null,
      nivelesStockCritico: body.nivelesStockCritico != null ? parseInt(body.nivelesStockCritico, 10) : null,
      contratoComodato: body.contratoComodato || null,
      activosEnPosesion: body.activosEnPosesion || null,
      fechaVencimientoContrato: body.fechaVencimientoContrato ? new Date(body.fechaVencimientoContrato) : null,
      historialDevoluciones: body.historialDevoluciones || null,
      cargosRecurrentes: body.cargosRecurrentes || null,
      penalizacionesExtravio: body.penalizacionesExtravio || null,
      estadoCuenta: body.estadoCuenta || null,
      estadoCliente: body.estadoCliente || 'ACTIVO',
      ubicaciones: body.ubicaciones || null,
      lat: body.lat != null ? parseFloat(body.lat) : null,
      lng: body.lng != null ? parseFloat(body.lng) : null,
      notas: body.notas || null,
      activo: body.activo !== undefined ? Boolean(body.activo) : true,
    }

    const cliente = await db.cliente.create({ data })

    return NextResponse.json(cliente, { status: 201 })
  } catch (e) {
    console.error('POST /api/clientes', e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear cliente' },
      { status: 500 }
    )
  }
}
