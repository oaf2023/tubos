import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const conteos = await db.conteoFisico.findMany({
      include: {
        items: { include: { gas: { select: { codigo: true } } }, orderBy: { gas: { codigo: 'asc' } } },
      },
      orderBy: { fecha: 'desc' },
      take: 100,
    })
    return NextResponse.json(conteos)
  } catch (e) {
    console.error('GET /api/inventario/conteos', e)
    return NextResponse.json({ error: 'Error al obtener conteos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // { usuario?, observacion?, items: [{ gasId, cantidadReal, estado? }] }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'items es requerido' }, { status: 400 })
    }
    const items = body.items.map((it: any) => ({
      gasId: String(it.gasId),
      estado: String(it.estado || 'TOTAL'),
      cantidadReal: parseInt(it.cantidadReal, 10) || 0,
    }))
    const conteo = await db.conteoFisico.create({
      data: {
        usuario: body.usuario ? String(body.usuario) : null,
        observacion: body.observacion ? String(body.observacion) : null,
        items: { create: items },
      },
      include: { items: true },
    })
    return NextResponse.json(conteo, { status: 201 })
  } catch (e) {
    console.error('POST /api/inventario/conteos', e)
    return NextResponse.json({ error: 'Error al crear conteo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }
    await db.conteoFisico.delete({ where: { id: String(body.id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/inventario/conteos', e)
    return NextResponse.json({ error: 'Error al eliminar conteo' }, { status: 500 })
  }
}
