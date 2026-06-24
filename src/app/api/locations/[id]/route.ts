import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const loc = await db.location.update({
      where: { id },
      data: {
        nombre: body.nombre,
        provincia: body.provincia,
        lat: body.lat ? parseFloat(body.lat) : undefined,
        lng: body.lng ? parseFloat(body.lng) : undefined,
        tipo: body.tipo || 'BASE',
        esBase: body.esBase !== undefined ? Boolean(body.esBase) : undefined,
        direccion: body.direccion || null,
        telefono: body.telefono || null,
      },
    })
    return NextResponse.json(loc)
  } catch (e) {
    console.error('PUT /api/locations/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar ubicación' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    // Lookup location name for referential check
    const loc = await db.location.findUnique({ where: { id }, select: { nombre: true } })
    if (!loc) return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })
    const count = await db.cylinder.count({ where: { ubicacionNombre: loc.nombre } })
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: ${count} tubo(s) están en esta ubicación` },
        { status: 400 },
      )
    }
    await db.location.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/locations/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar ubicación' }, { status: 500 })
  }
}
