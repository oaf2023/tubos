import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const recepciones = await db.recepcionStock.findMany({
      include: { gas: { select: { id: true, codigo: true, nombre: true } } },
      orderBy: { fecha: 'desc' },
      take: 100,
    })
    return NextResponse.json(recepciones)
  } catch (e) {
    console.error('GET /api/inventario/recepciones', e)
    return NextResponse.json({ error: 'Error al obtener recepciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.gasId || body.cantidad === undefined) {
      return NextResponse.json({ error: 'gasId y cantidad son requeridos' }, { status: 400 })
    }
    const cantidad = parseInt(body.cantidad, 10) || 0
    if (cantidad <= 0) {
      return NextResponse.json({ error: 'cantidad debe ser mayor a 0' }, { status: 400 })
    }
    const gasExiste = await db.gas.findUnique({ where: { id: String(body.gasId) }, select: { id: true } })
    if (!gasExiste) {
      return NextResponse.json({ error: 'Gas no encontrado' }, { status: 404 })
    }
    const recepcion = await db.$transaction(async (tx) => {
      const r = await tx.recepcionStock.create({
        data: {
          gasId: String(body.gasId),
          cantidad,
          proveedor: body.proveedor ? String(body.proveedor) : null,
          documento: body.documento ? String(body.documento) : null,
          usuario: body.usuario ? String(body.usuario) : null,
          observacion: body.observacion ? String(body.observacion) : null,
        },
        include: { gas: { select: { id: true, codigo: true } } },
      })
      await tx.movimientoStock.create({
        data: {
          gasId: r.gasId,
          tipo: 'ENTRADA',
          cantidad,
          usuario: r.usuario ?? 'sistema',
          observacion: `Recepción ${r.documento ? r.documento + ' ' : ''}${r.proveedor ? 'de ' + r.proveedor : ''}`.trim() || 'Recepción de stock',
        },
      })
      return r
    })
    return NextResponse.json(recepcion, { status: 201 })
  } catch (e) {
    console.error('POST /api/inventario/recepciones', e)
    return NextResponse.json({ error: 'Error al crear recepción' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }
    await db.recepcionStock.delete({ where: { id: String(body.id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/inventario/recepciones', e)
    return NextResponse.json({ error: 'Error al eliminar recepción' }, { status: 500 })
  }
}
