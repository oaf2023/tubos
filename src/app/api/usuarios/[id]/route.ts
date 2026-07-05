import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

function getRequestingUser(request: NextRequest) {
  const header = request.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

async function validarRolGerencia(request: NextRequest, rolId: string | null | undefined) {
  if (!rolId) return null
  const rol = await db.rol.findUnique({ where: { id: rolId } })
  if (!rol || rol.nombre !== 'gerencia') return null
  const user = getRequestingUser(request)
  if (!user || user.nivelAcceso !== 0) {
    return NextResponse.json({ error: 'Solo usuarios nivel 0 pueden asignar el rol gerencia' }, { status: 403 })
  }
  return null
}

// PUT /api/usuarios/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { usuario, password, nombre, direccion, telefono, ciudad, provincia, lat, lng, email, nivelAcceso, activo, rolId } = body

    const rolCheck = await validarRolGerencia(request, rolId)
    if (rolCheck) return rolCheck

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
    if (rolId !== undefined) data.rolId = rolId || null

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
