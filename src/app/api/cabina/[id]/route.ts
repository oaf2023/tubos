import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const cabina = await db.cabina.update({
      where: { id },
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        ubicacion: body.ubicacion,
        activo: body.activo,
      },
    })
    return NextResponse.json(cabina)
  } catch (e) {
    console.error('PUT /api/cabina/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.cabina.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/cabina/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
