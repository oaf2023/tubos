import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'

type Rol = 'admin' | 'deposito' | 'reparto' | 'facturacion' | 'auditor'

export function requireRole(...roles: Rol[]) {
  return async (req: NextRequest) => {
    const userHeader = req.headers.get('x-user')
    if (!userHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    try {
      const user = JSON.parse(userHeader)
      if (!user.rolId) {
        return NextResponse.json({ error: 'Sin rol asignado' }, { status: 403 })
      }

      const rol = await db.rol.findUnique({ where: { id: user.rolId } })
      if (!rol || !roles.includes(rol.nombre as Rol)) {
        return NextResponse.json({ error: 'Permiso denegado' }, { status: 403 })
      }

      return null // authorized
    } catch {
      return NextResponse.json({ error: 'Error de autorización' }, { status: 500 })
    }
  }
}
