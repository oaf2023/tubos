import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createFactura } from '@/lib/services/factura-service'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const pedido = await db.pedido.findUnique({
      where: { id },
      include: { items: true, gas: true },
    })
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    if (pedido.facturaId) return NextResponse.json({ error: 'El pedido ya fue facturado' }, { status: 409 })

    const factura = await createFactura({
      clienteId: pedido.clienteId || null,
      cliente: pedido.cliente || 'Consumidor Final',
      items: pedido.items.map((it) => ({
        concepto: it.concepto,
        tipo: 'producto',
        cantidad: 1,
        precioUnitario: it.monto,
        subtotal: it.monto,
      })),
    })

    await db.pedido.update({
      where: { id },
      data: { facturaId: factura.id },
    })

    return NextResponse.json(factura, { status: 201 })
  } catch (e) {
    console.error('POST /api/pedidos/[id]/facturar', e)
    return NextResponse.json({ error: 'Error al facturar pedido' }, { status: 500 })
  }
}
