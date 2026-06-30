import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const roleCheck = await requireRole('admin', 'auditor', 'deposito')(req)
    if (roleCheck) return roleCheck

    const { searchParams } = new URL(req.url)
    const accion = searchParams.get('accion')
    const entidad = searchParams.get('entidad')
    const usuario = searchParams.get('usuario')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (accion) where.accion = accion
    if (entidad) where.entidad = entidad
    if (usuario) where.usuario = { contains: usuario, mode: 'insensitive' }
    if (desde || hasta) {
      where.createdAt = {}
      if (desde) where.createdAt.gte = new Date(desde)
      if (hasta) where.createdAt.lte = new Date(hasta)
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({ logs, total, limit, offset })
  } catch (e) {
    console.error('GET /api/audit', e)
    return NextResponse.json({ error: 'Error al consultar auditoría' }, { status: 500 })
  }
}
