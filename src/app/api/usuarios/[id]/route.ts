import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// PUT /api/usuarios/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { usuario, password, nombre, direccion, telefono, ciudad, provincia, lat, lng, email, nivelAcceso, activo } = body

    const data: Record<string, unknown> = {}

    if (usuario !== undefined) data.usuario = usuario
    if (nombre !== undefined) data.nombre = nombre
    if (direccion !== undefined) data.direccion = direccion || null
    if (telefono !== undefined) data.telefono = telefono || null
    if (ciudad !== undefined) data.ciudad = ciudad || null
    if (provincia !== undefined) data.provincia = provincia || null
    if (email !== undefined) data.email = email || null
    if (nivelAcceso !== undefined) data.nivelAcceso = parseInt(nivelAcceso)
    if (activo !== undefined) data.activo = Boolean(activo)

    if (lat !== undefined) data.lat = parseFloat(lat)
    if (lng !== undefined) data.lng = parseFloat(lng)

    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    const updated = await db.usuario.update({ where: { id }, data })
    const { password: _, ...safeUser } = updated
    return NextResponse.json(safeUser)
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 })
    }
    console.error('PUT /api/usuarios/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

// DELETE /api/usuarios/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.usuario.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/usuarios/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
