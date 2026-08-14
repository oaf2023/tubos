import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export function getRequestUser(req: NextRequest) {
  const raw = req.headers.get('x-user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// Resuelve el usuario que ejecuta una operación: primero el x-user del middleware
// (portal admin), y si no, el chofer autenticado por token de sesión (app móvil /descargas).
export async function resolverUsuarioOperacion(req: NextRequest, body?: unknown) {
  const user = getRequestUser(req)
  if (user && Object.keys(user).length > 0) return user
  const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const choferToken =
    (bodyObj && typeof bodyObj.choferToken === 'string' ? bodyObj.choferToken : null) || req.headers.get('x-chofer-token')
  if (choferToken) {
    try {
      const sesion = await db.sesionConductor.findFirst({
        where: { token: choferToken },
        include: { conductor: { include: { rol: true } } },
      })
      if (sesion?.conductor) {
        return {
          id: sesion.conductorId,
          nombre: sesion.conductor.nombre,
          usuario: sesion.conductor.usuario,
          rol: sesion.conductor.rol || null,
        }
      }
    } catch { /* ignore */ }
  }
  return null
}

export function requireGerenciaNivel0(req: NextRequest) {
  const user = getRequestUser(req)
  const rolNombre = user?.rol?.nombre || user?.rol
  if (!user || user.nivelAcceso !== 0 || rolNombre !== 'gerencia') {
    return NextResponse.json({ error: 'Solo Gerencia nivel 0 puede modificar esta configuración' }, { status: 403 })
  }
  return null
}
