import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/routes/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.ruta.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/routes/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar ruta' }, { status: 500 })
  }
}

// PUT /api/routes/[id] - actualizar estado
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.estado !== undefined) data.estado = body.estado
    if (body.nombre !== undefined) data.nombre = body.nombre
    if (body.distanciaKm !== undefined) data.distanciaKm = body.distanciaKm
    if (body.duracionHoras !== undefined) data.duracionHoras = body.duracionHoras

    const updated = await db.ruta.update({
      where: { id },
      data,
      include: { paradas: { orderBy: { orden: 'asc' } } },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PUT /api/routes/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar ruta' }, { status: 500 })
  }
}
