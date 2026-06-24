import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const pedido = await db.pedido.findUnique({
      where: { id },
      include: { gas: true, items: true, cilindros: true },
    })
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }
    return NextResponse.json(pedido)
  } catch (e) {
    console.error('GET /api/pedidos/[id]', e)
    return NextResponse.json({ error: 'Error al obtener pedido' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.pedido.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (body.renglones && Array.isArray(body.renglones)) {
      const PRECIOS_GAS: Record<string, number> = {
        AR: 15000, C2H2: 22000, O2: 12000, CO2: 18000, N2: 10000,
        'MIX-7525': 16000, HE: 28000, 'AR-HE': 24000, H2: 35000,
      }

      await db.pedidoItem.deleteMany({ where: { pedidoId: id } })

      const items: { concepto: string; monto: number }[] = []
      let total = 0

      for (const r of body.renglones) {
        const gas = await db.gas.findUnique({ where: { id: r.gasId } })
        if (!gas) continue
        const precioUnit = PRECIOS_GAS[gas.codigo] || 15000
        const cant = r.cantidad || 1

        items.push({ concepto: `${gas.nombre} — Carga × ${cant}`, monto: precioUnit * cant })
        total += precioUnit * cant

        if (r.operacionEnvase === 'VENTA_NUEVO') {
          items.push({ concepto: `${gas.nombre} — Cilindro nuevo × ${cant}`, monto: 45000 * cant })
          total += 45000 * cant
        }

        if (r.operacionEnvase === 'CANJE' && r.phVigente === false) {
          items.push({ concepto: `${gas.nombre} — Re-ensayo/PH × ${cant}`, monto: 8500 * cant })
          total += 8500 * cant
        }
      }

      const primerGasId = body.renglones[0]?.gasId

      const pedido = await db.pedido.update({
        where: { id },
        data: {
          fecha: body.fecha ? new Date(body.fecha) : existing.fecha,
          cliente: body.cliente ?? existing.cliente,
          clienteId: body.clienteId ?? existing.clienteId,
          estadoCuenta: body.estadoCuenta ?? existing.estadoCuenta,
          gasId: primerGasId ?? existing.gasId,
          operacionEnvase: body.renglones[0]?.operacionEnvase ?? existing.operacionEnvase,
          total,
          estado: body.estado ?? existing.estado,
          observaciones: body.observaciones ?? existing.observaciones,
          items: { create: items },
        },
        include: { gas: true, items: true, cilindros: true },
      })

      return NextResponse.json(pedido)
    }

    // Partial update (estado, observaciones, etc.)
    const pedido = await db.pedido.update({
      where: { id },
      data: {
        estado: body.estado ?? undefined,
        observaciones: body.observaciones ?? undefined,
        fecha: body.fecha ? new Date(body.fecha) : undefined,
        cliente: body.cliente ?? undefined,
        clienteId: body.clienteId ?? undefined,
        estadoCuenta: body.estadoCuenta ?? undefined,
        total: body.total ?? undefined,
      },
      include: { gas: true, items: true, cilindros: true },
    })

    return NextResponse.json(pedido)
  } catch (e) {
    console.error('PUT /api/pedidos/[id]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar pedido' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await db.pedido.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/pedidos/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar pedido' }, { status: 500 })
  }
}
