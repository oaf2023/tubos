import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PUT /api/avisos/[id] - editar mensaje o activo/desactivar
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const roleCheck = await requireRole('admin', 'deposito')(req)
    if (roleCheck) return roleCheck

    const { id } = await params
    const body = await req.json()

    const existe = await db.avisoUsuario.findUnique({ where: { id } })
    if (!existe) return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (typeof body.activo === 'boolean') data.activo = body.activo
    if (typeof body.mensaje === 'string' && body.mensaje.trim()) {
      if (body.mensaje.length > 2000) {
        return NextResponse.json({ error: 'El mensaje no puede superar 2000 caracteres' }, { status: 400 })
      }
      data.mensaje = body.mensaje.trim()
    }

    const aviso = await db.avisoUsuario.update({ where: { id }, data })

    logAudit({ accion: 'UPDATE', entidad: 'AvisoUsuario', entidadId: id, detalle: body }).catch(() => {})

    return NextResponse.json({ aviso })
  } catch (e) {
    console.error('PUT /api/avisos/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar aviso' }, { status: 500 })
  }
}

// DELETE /api/avisos/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const roleCheck = await requireRole('admin', 'deposito')(req)
    if (roleCheck) return roleCheck

    const { id } = await params
    const existe = await db.avisoUsuario.findUnique({ where: { id } })
    if (!existe) return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 })

    await db.avisoUsuario.delete({ where: { id } })
    logAudit({ accion: 'DELETE', entidad: 'AvisoUsuario', entidadId: id }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/avisos/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar aviso' }, { status: 500 })
  }
}
