import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const lector = await db.lectorIoT.update({
      where: { id },
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        tipo: body.tipo,
        ip: body.ip,
        zonaLecturaId: body.zonaLecturaId,
        activo: body.activo,
      },
    })
    return NextResponse.json(lector)
  } catch (e) {
    console.error('PUT /api/deposito/lectores/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.lectorIoT.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/deposito/lectores/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
