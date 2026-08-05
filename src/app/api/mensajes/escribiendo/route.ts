import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveChatIdentity } from '@/lib/chat-identity'

// POST /api/mensajes/escribiendo - { chatKey, activo }
export async function POST(request: NextRequest) {
  try {
    const identity = await resolveChatIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const { chatKey, activo } = await request.json()
    if (!chatKey) return NextResponse.json({ error: 'chatKey requerido' }, { status: 400 })

    if (activo) {
      await db.escribiendoChat.upsert({
        where: { id: `${identity.emisorTipo}:${identity.emisorId}:${chatKey}` },
        create: {
          id: `${identity.emisorTipo}:${identity.emisorId}:${chatKey}`,
          emisorId: identity.emisorId,
          emisorTipo: identity.emisorTipo,
          emisorNombre: identity.emisorNombre,
          chatKey,
        },
        update: { actualizadoEn: new Date() },
      })
    } else {
      await db.escribiendoChat
        .delete({ where: { id: `${identity.emisorTipo}:${identity.emisorId}:${chatKey}` } })
        .catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/mensajes/escribiendo', e)
    return NextResponse.json({ error: 'Error al registrar escribiendo' }, { status: 500 })
  }
}
