import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/clientes - listar clientes con filtros opcionales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get('nombre') || undefined
    const tipologia = searchParams.get('tipologia') || undefined
    const activo = searchParams.get('activo')

    const where: Record<string, unknown> = {}
    if (nombre) where.nombre = { contains: nombre }
    if (tipologia) where.tipologia = tipologia
    if (activo === 'true') where.activo = true
    if (activo === 'false') where.activo = false

    const clientes = await db.cliente.findMany({
      where,
      include: { _count: { select: { cylinders: true } } },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(clientes)
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
