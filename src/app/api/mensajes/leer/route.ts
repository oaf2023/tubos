import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveChatIdentity, rateLimit } from '@/lib/chat-identity'

// POST /api/mensajes/leer - { chatKey: "general" | <emisorId> }
//   Con sesión: usa la identidad resuelta (x-user / x-chat-token)
//   Sin sesión (pre-login): { chatKey, usuario, tipoLogin } resuelve por nombre de usuario
export async function POST(request: NextRequest) {
  try {
    const { chatKey, usuario, tipoLogin } = await request.json().catch(() => ({}))
    if (!chatKey) {
      return NextResponse.json({ error: 'chatKey requerido' }, { status: 400 })
    }

    let identidad: { emisorId: string } | null = null

    if (usuario) {
      if (!rateLimit(request, 'mensajes-leer-login', 60, 60000)) {
        return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
      }
      const user = await db.usuario.findUnique({ where: { usuario: String(usuario).trim() } })
      if (!user || !user.activo) {
        return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
      }
      identidad = { emisorId: user.id }
    } else {
      identidad = await resolveChatIdentity(request)
      if (!identidad) {
        return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
      }
    }

    await db.mensajeChat.updateMany({
      where: {
        leido: false,
        emisorId: { not: identidad.emisorId },
        ...(chatKey === 'general' ? { receptorId: null } : { receptorId: identidad.emisorId, emisorId: chatKey }),
      },
      data: { leido: true, leidoEn: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/mensajes/leer', e)
    return NextResponse.json({ error: 'Error al marcar leído' }, { status: 500 })
  }
}
