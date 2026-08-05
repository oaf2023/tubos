import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

// GET /api/avisos/usuarios - roles y usuarios para el selector del form
export async function GET(req: NextRequest) {
  try {
    const roleCheck = await requireRole('admin', 'deposito', 'gerencia')(req)
    if (roleCheck) return roleCheck

    const [roles, usuarios] = await Promise.all([
      db.rol.findMany({ orderBy: { nombre: 'asc' } }),
      db.usuario.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, usuario: true, rol: { select: { nombre: true } } },
        orderBy: { nombre: 'asc' },
      }),
    ])

    return NextResponse.json({
      roles: roles.map((r) => r.nombre),
      usuarios,
    })
  } catch (e) {
    console.error('GET /api/avisos/usuarios', e)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}
