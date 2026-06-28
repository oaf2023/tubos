import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/clientes - listar clientes con filtros opcionales, paginación e índice alfabético
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get('nombre') || undefined
    const tipologia = searchParams.get('tipologia') || undefined
    const activo = searchParams.get('activo')
    const letra = searchParams.get('letra') || undefined
    const estado = searchParams.get('estado') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12')))

    const where: Record<string, unknown> = {}

    // Búsqueda textual: busca en nombre Y apellido
    if (nombre) {
      where.OR = [
        { nombre: { contains: nombre, mode: 'insensitive' } },
        { apellido: { contains: nombre, mode: 'insensitive' } },
      ]
    }

    if (tipologia) where.tipologia = tipologia
    if (activo === 'true') where.activo = true
    if (activo === 'false') where.activo = false
    if (estado) where.estadoCliente = estado

    // Filtro alfabético: busca por inicial en nombre O apellido
    if (letra && letra !== 'TODOS') {
      if (nombre) {
        // ya hay OR, agregamos condición AND
        where.AND = [
          { OR: [
            { nombre: { startsWith: letra, mode: 'insensitive' } },
            { apellido: { startsWith: letra, mode: 'insensitive' } },
          ] }
        ]
        delete where.OR
        // rebuild properly
      } else {
        where.OR = [
          { nombre: { startsWith: letra, mode: 'insensitive' } },
          { apellido: { startsWith: letra, mode: 'insensitive' } },
        ]
      }
    }

    // Reconstruir where correctamente si hay nombre + letra
    const finalWhere: Record<string, unknown> = {}
    if (tipologia) finalWhere.tipologia = tipologia
    if (activo === 'true') finalWhere.activo = true
    if (activo === 'false') finalWhere.activo = false
    if (estado) finalWhere.estadoCliente = estado

    const filters: Record<string, unknown>[] = []

    if (letra && letra !== 'TODOS') {
      filters.push({
        OR: [
          { nombre: { startsWith: letra, mode: 'insensitive' } },
          { apellido: { startsWith: letra, mode: 'insensitive' } },
        ]
      })
    }

    if (nombre) {
      filters.push({
        OR: [
          { nombre: { contains: nombre, mode: 'insensitive' } },
          { apellido: { contains: nombre, mode: 'insensitive' } },
        ]
      })
    }

    if (filters.length === 1) finalWhere.AND = filters
    else if (filters.length > 1) finalWhere.AND = filters

    const skip = (page - 1) * limit

    const [clientes, total] = await Promise.all([
      db.cliente.findMany({
        where: Object.keys(finalWhere).length > 0 ? finalWhere : undefined,
        include: { _count: { select: { cylinders: true } } },
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        skip,
        take: limit,
      }),
      db.cliente.count({
        where: Object.keys(finalWhere).length > 0 ? finalWhere : undefined,
      }),
    ])

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

    const cliente = await db.cliente.create({
      data: {
        nombre: body.nombre.trim(),
        apellido: body.apellido || null,
        email: body.email || null,
        taxId: body.taxId || null,
        contacto: body.contacto || null,
        firmaDigital: body.firmaDigital || null,
        tipologia: body.tipologia || null,
        procesoSoldadura: body.procesoSoldadura || null,
        materialesBase: body.materialesBase || null,
        parametrosIngenieria: body.parametrosIngenieria || null,
        modoEnvasado: body.modoEnvasado || null,
        gasesConsumo: body.gasesConsumo || null,
        serviciosEspecializados: body.serviciosEspecializados || null,
        nivelesStockCritico: body.nivelesStockCritico ? parseInt(body.nivelesStockCritico, 10) : null,
        contratoComodato: body.contratoComodato || null,
        activosEnPosesion: body.activosEnPosesion || null,
        fechaVencimientoContrato: body.fechaVencimientoContrato ? new Date(body.fechaVencimientoContrato) : null,
        historialDevoluciones: body.historialDevoluciones || null,
        cargosRecurrentes: body.cargosRecurrentes || null,
        penalizacionesExtravio: body.penalizacionesExtravio || null,
        estadoCuenta: body.estadoCuenta || null,
        estadoCliente: body.estadoCliente || 'ACTIVO',
        ubicaciones: body.ubicaciones || null,
        lat: body.lat ? parseFloat(body.lat) : null,
        lng: body.lng ? parseFloat(body.lng) : null,
        notas: body.notas || null,
        activo: body.activo !== undefined ? Boolean(body.activo) : true,
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (e) {
    console.error('POST /api/clientes', e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear cliente' },
      { status: 500 }
    )
  }
}
