import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const gas = await db.gas.update({
      where: { id },
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        descripcion: body.descripcion,
        presionBar: body.presionBar ? parseFloat(body.presionBar) : undefined,
        colorHex: body.colorHex,
        usoPrincipal: body.usoPrincipal,
        categoria: body.categoria,
        peligro: body.peligro,
      },
    })
    return NextResponse.json(gas)
  } catch (e) {
    console.error('PUT /api/gases/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar gas' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    // Check cylinders using this gas
    const count = await db.cylinder.count({ where: { gasId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: ${count} tubo(s) usan este gas` },
        { status: 400 },
      )
    }
    await db.gas.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/gases/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar gas' }, { status: 500 })
  }
}
