import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const zona = await db.zonaLectura.findUnique({
      where: { id },
      include: { lectores: true, _count: { select: { eventos: true } } },
    })
    if (!zona) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json(zona)
  } catch (e) {
    console.error('GET /api/deposito/zonas/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const zona = await db.zonaLectura.update({
      where: { id },
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        descripcion: body.descripcion,
        tipo: body.tipo,
        activo: body.activo,
      },
    })
    return NextResponse.json(zona)
  } catch (e) {
    console.error('PUT /api/deposito/zonas/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.zonaLectura.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/deposito/zonas/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
