import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

function getUser(req: NextRequest) {
  const header = req.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const roleCheck = await requireRole('admin', 'deposito')(req)
    if (roleCheck) return roleCheck

    const user = getUser(req)
    const { id } = await params

    const existing = await db.identificadorTubo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Identificador no encontrado' }, { status: 404 })
    }

    await db.identificadorTubo.delete({ where: { id } })

    await logAudit({
      accion: 'DELETE',
      entidad: 'IdentificadorTubo',
      entidadId: id,
      usuario: user?.usuario || 'admin',
      detalle: { cylinderId: existing.cylinderId, tipo: existing.tipo, valor: existing.valor },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/mobile/identificadores/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar identificador' }, { status: 500 })
  }
}
