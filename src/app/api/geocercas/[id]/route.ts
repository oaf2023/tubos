import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.nombre !== undefined) data.nombre = body.nombre
    if (body.descripcion !== undefined) data.descripcion = body.descripcion
    if (body.lat !== undefined) data.lat = body.lat
    if (body.lng !== undefined) data.lng = body.lng
    if (body.radioMetros !== undefined) data.radioMetros = body.radioMetros
    if (body.polygon !== undefined) data.polygon = typeof body.polygon === 'string' ? body.polygon : JSON.stringify(body.polygon)
    if (body.color !== undefined) data.color = body.color
    if (body.activa !== undefined) data.activa = body.activa
    if (body.tipo !== undefined) data.tipo = body.tipo
    if (body.regla !== undefined) data.regla = JSON.stringify(body.regla)

    const updated = await db.geocerca.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PUT /api/geocercas/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar geocerca' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.geocerca.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/geocercas/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar geocerca' }, { status: 500 })
  }
}
