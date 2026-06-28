import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/clientes/[id] - detalle completo de un cliente
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cliente = await db.cliente.findUnique({
      where: { id },
      include: {
        cylinders: {
          include: { gas: true },
          orderBy: { numeroSerie: 'asc' },
        },
        _count: { select: { cylinders: true } },
      },
    })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }
    return NextResponse.json(cliente)
  } catch (e) {
    console.error('GET /api/clientes/[id]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 })
  }
}

// PUT /api/clientes/[id] - actualizar cliente (parcial)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const anterior = await db.cliente.findUnique({ where: { id } })
    if (!anterior) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (body.nombre !== undefined) data.nombre = body.nombre.trim()
    if (body.apellido !== undefined) data.apellido = body.apellido || null
    if (body.email !== undefined) data.email = body.email || null
    if (body.taxId !== undefined) data.taxId = body.taxId || null
    if (body.contacto !== undefined) data.contacto = body.contacto || null
    if (body.firmaDigital !== undefined) data.firmaDigital = body.firmaDigital || null
    if (body.tipologia !== undefined) data.tipologia = body.tipologia || null
    if (body.procesoSoldadura !== undefined) data.procesoSoldadura = body.procesoSoldadura || null
    if (body.materialesBase !== undefined) data.materialesBase = body.materialesBase || null
    if (body.parametrosIngenieria !== undefined) data.parametrosIngenieria = body.parametrosIngenieria || null
    if (body.modoEnvasado !== undefined) data.modoEnvasado = body.modoEnvasado || null
    if (body.gasesConsumo !== undefined) data.gasesConsumo = body.gasesConsumo || null
    if (body.serviciosEspecializados !== undefined) data.serviciosEspecializados = body.serviciosEspecializados || null
    if (body.nivelesStockCritico !== undefined) data.nivelesStockCritico = body.nivelesStockCritico ? parseInt(body.nivelesStockCritico, 10) : null
    if (body.contratoComodato !== undefined) data.contratoComodato = body.contratoComodato || null
    if (body.activosEnPosesion !== undefined) data.activosEnPosesion = body.activosEnPosesion || null
    if (body.fechaVencimientoContrato !== undefined) data.fechaVencimientoContrato = body.fechaVencimientoContrato ? new Date(body.fechaVencimientoContrato) : null
    if (body.historialDevoluciones !== undefined) data.historialDevoluciones = body.historialDevoluciones || null
    if (body.cargosRecurrentes !== undefined) data.cargosRecurrentes = body.cargosRecurrentes || null
    if (body.penalizacionesExtravio !== undefined) data.penalizacionesExtravio = body.penalizacionesExtravio || null
    if (body.estadoCuenta !== undefined) data.estadoCuenta = body.estadoCuenta || null
    if (body.ubicaciones !== undefined) data.ubicaciones = body.ubicaciones || null
    if (body.lat !== undefined) data.lat = body.lat ? parseFloat(body.lat) : null
    if (body.lng !== undefined) data.lng = body.lng ? parseFloat(body.lng) : null
    if (body.notas !== undefined) data.notas = body.notas || null
    if (body.activo !== undefined) data.activo = Boolean(body.activo)

    // Sync estadoCliente ↔ activo
    if (body.estadoCliente !== undefined) {
      data.estadoCliente = body.estadoCliente
      if (body.estadoCliente === 'ACTIVO') data.activo = true
      else if (body.estadoCliente === 'SUSPENDIDO' || body.estadoCliente === 'INACTIVO') data.activo = false
    }

    const updated = await db.cliente.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('PUT /api/clientes/[id]', e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar' },
      { status: 500 }
    )
  }
}

// DELETE /api/clientes/[id] - eliminar cliente
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cliente = await db.cliente.findUnique({
      where: { id },
      include: { _count: { select: { cylinders: true } } },
    })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }
    if (cliente._count.cylinders > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${cliente._count.cylinders} cilindro(s) asignado(s)` },
        { status: 400 }
      )
    }
    await db.cliente.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/clientes/[id]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
