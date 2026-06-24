import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.titulo !== undefined) data.titulo = body.titulo
    if (body.descripcion !== undefined) data.descripcion = body.descripcion
    if (body.audioUrl !== undefined) data.audioUrl = body.audioUrl

    const updated = await db.observacion.update({
      where: { id },
      data,
      include: { archivos: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PUT /api/observaciones/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.observacion.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/observaciones/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
