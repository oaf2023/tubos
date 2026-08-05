import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveChatIdentity } from '@/lib/chat-identity'

// POST /api/mensajes/leer - { chatKey: "general" | <emisorId> }
export async function POST(request: NextRequest) {
  try {
    const identity = await resolveChatIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const { chatKey } = await request.json()
    if (!chatKey) {
      return NextResponse.json({ error: 'chatKey requerido' }, { status: 400 })
    }

    await db.mensajeChat.updateMany({
      where: {
        leido: false,
        emisorId: { not: identity.emisorId },
        ...(chatKey === 'general' ? { receptorId: null } : { receptorId: identity.emisorId, emisorId: chatKey }),
      },
      data: { leido: true, leidoEn: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/mensajes/leer', e)
    return NextResponse.json({ error: 'Error al marcar leído' }, { status: 500 })
  }
}
