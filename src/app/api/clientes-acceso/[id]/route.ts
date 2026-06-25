import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const acceso = await db.clienteAcceso.findUnique({ where: { id } })
    if (!acceso) {
      return NextResponse.json({ error: 'Acceso no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.usuario !== undefined) {
      const dup = await db.clienteAcceso.findUnique({ where: { usuario: body.usuario } })
      if (dup && dup.id !== id) {
        return NextResponse.json({ error: 'El nombre de usuario ya está en uso' }, { status: 400 })
      }
      data.usuario = body.usuario
    }
    if (body.password !== undefined) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
      }
      data.password = await bcrypt.hash(body.password, 10)
    }
    if (body.activo !== undefined) {
      data.activo = Boolean(body.activo)
    }

    const updated = await db.clienteAcceso.update({
      where: { id },
      data,
      include: { cliente: { select: { nombre: true } } },
    })

    return NextResponse.json({
      id: updated.id,
      clienteId: updated.clienteId,
      clienteNombre: updated.cliente.nombre,
      usuario: updated.usuario,
      activo: updated.activo,
      createdAt: updated.createdAt,
    })
  } catch (e) {
    console.error('PUT /api/clientes-acceso/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar acceso' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.clienteAcceso.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/clientes-acceso/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar acceso' }, { status: 500 })
  }
}
