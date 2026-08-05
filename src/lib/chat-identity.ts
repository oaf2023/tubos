import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export type ChatIdentity = {
  emisorId: string
  emisorNombre: string
  emisorTipo: 'USUARIO' | 'CHOFER'
}

const MEMORY = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'local'
}

export function rateLimit(req: NextRequest, key: string, max: number, windowMs: number) {
  const k = `${getClientIp(req)}:${key}`
  const now = Date.now()
  const entry = MEMORY.get(k)
  if (!entry || entry.resetAt < now) {
    MEMORY.set(k, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= max
}

export async function resolveChatIdentity(req: NextRequest): Promise<ChatIdentity | null> {
  const raw = req.headers.get('x-user')
  if (raw) {
    try {
      const user = JSON.parse(raw)
      if (user && user.id && user.nombre) {
        return { emisorId: user.id, emisorNombre: user.nombre, emisorTipo: 'USUARIO' }
      }
    } catch { /* ignore */ }
  }

  let token: string | null = null
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const body = await req.clone().json()
      token = body?.token || null
    } catch { /* ignore */ }
  }
  if (!token) token = req.headers.get('x-chat-token')
  if (!token) return null

  const session = await db.sesionConductor.findUnique({
    where: { token },
    select: { conductor: { select: { id: true, nombre: true } } },
  })
  if (!session?.conductor) return null

  return {
    emisorId: session.conductor.id,
    emisorNombre: session.conductor.nombre,
    emisorTipo: 'CHOFER',
  }
}

export function mensajesRecientesLeidos(count: number): boolean {
  return count > 0
}
