import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    const factura = await db.factura.findUnique({ where: { id }, include: { items: true } })
    if (!factura) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(factura)
  } catch (e) {
    console.error('GET /api/facturas/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    const body = await req.json()
    const { estado, fechaVencimiento, observaciones, total, items } = body

    await db.facturaItem.deleteMany({ where: { facturaId: id } })

    const factura = await db.factura.update({
      where: { id },
      data: {
        estado: estado ?? undefined,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
        total: total ?? undefined,
        observaciones: observaciones ?? undefined,
        items: items ? { create: items.map((it: any) => ({ concepto: it.concepto, remitoItemId: it.remitoItemId || null, cantidad: it.cantidad || 1, precioUnitario: it.precioUnitario || 0, subtotal: it.subtotal || 0 })) } : undefined,
      },
      include: { items: true },
    })
    return NextResponse.json(factura)
  } catch (e) {
    console.error('PUT /api/facturas/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    await db.factura.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/facturas/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
