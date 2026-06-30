import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, verifySession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true })
  try {
    const token = req.cookies.get('session')?.value
    if (token) {
      const user = await verifySession(token)
      if (user) {
        await logAudit({
          accion: 'LOGOUT',
          entidad: user.tipo === 'cliente' ? 'ClienteAcceso' : 'Usuario',
          entidadId: user.id,
          usuario: user.usuario,
          detalle: { tipo: user.tipo, nombre: user.nombre },
          direccionIp: req.headers.get('x-forwarded-for') || undefined,
        })
      }
    }
  } catch { /* silent */ }
  clearSessionCookie(response)
  return response
}
