import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    const remito = await db.remito.findUnique({ where: { id }, include: { items: true } })
    if (!remito) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(remito)
  } catch (e) {
    console.error('GET /api/remitos/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    const body = await req.json()
    const { estado, tecnico, observaciones, items } = body

    await db.remitoItem.deleteMany({ where: { remitoId: id } })

    const remito = await db.remito.update({
      where: { id },
      data: {
        estado: estado ?? undefined,
        tecnico: tecnico ?? undefined,
        observaciones: observaciones ?? undefined,
        items: {
          create: (items || []).map((it: any) => ({
            cylinderId: it.cylinderId || null,
            numeroSerie: it.numeroSerie || null,
            gasId: it.gasId,
            gasCodigo: it.gasCodigo,
            tipoOperacion: it.tipoOperacion || 'ALQUILER',
            cantidad: it.cantidad || 1,
            fechaDevolucion: it.fechaDevolucion ? new Date(it.fechaDevolucion) : null,
            diasAlquiler: it.diasAlquiler ?? null,
            precioUnitario: it.precioUnitario ?? null,
            subtotal: it.subtotal ?? null,
          })),
        },
      },
      include: { items: true },
    })
    return NextResponse.json(remito)
  } catch (e) {
    console.error('PUT /api/remitos/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    await db.remito.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/remitos/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
