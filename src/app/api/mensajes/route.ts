import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveChatIdentity, rateLimit } from '@/lib/chat-identity'

const MAX_LEN = 2000

// GET /api/mensajes?since=ISO&before=ISO&chatKey=general|<receptorId>
export async function GET(request: NextRequest) {
  try {
    const identity = await resolveChatIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const before = searchParams.get('before')
    const chatKey = searchParams.get('chatKey')

    let where: Record<string, unknown> = {}
    if (chatKey === 'general') {
      where.receptorId = null
    } else if (chatKey) {
      where.OR = [
        { emisorId: identity.emisorId, receptorId: chatKey },
        { emisorId: chatKey, receptorId: identity.emisorId },
      ]
    } else {
      where.OR = [
        { receptorId: null },
        { receptorId: identity.emisorId },
        { emisorId: identity.emisorId },
      ]
    }
    if (since) where.createdAt = { gt: new Date(since) }
    if (before) where.createdAt = { lt: new Date(before) }

    const mensajes = await db.mensajeChat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        emisorId: true,
        emisorNombre: true,
        emisorTipo: true,
        receptorId: true,
        contenido: true,
        tipo: true,
        adjuntoUrl: true,
        adjuntoNombre: true,
        adjuntoMime: true,
        leido: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ mensajes: mensajes.reverse(), yo: identity })
  } catch (e) {
    console.error('GET /api/mensajes', e)
    return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 })
  }
}

// POST /api/mensajes - { receptorId?, contenido, tipo?, adjuntoUrl?, adjuntoNombre?, adjuntoMime? }
export async function POST(request: NextRequest) {
  try {
    const identity = await resolveChatIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    if (!rateLimit(request, 'send', 20, 60000)) {
      return NextResponse.json({ error: 'Demasiados mensajes, espera un momento' }, { status: 429 })
    }

    const body = await request.json()
    const { receptorId, contenido, tipo, adjuntoUrl, adjuntoNombre, adjuntoMime } = body

    if (!contenido && !adjuntoUrl) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
    }
    if (contenido && contenido.length > MAX_LEN) {
      return NextResponse.json({ error: `El mensaje no puede superar ${MAX_LEN} caracteres` }, { status: 400 })
    }

    let receptorNombre: string | null = null
    if (receptorId) {
      const target = await db.usuario.findUnique({
        where: { id: receptorId },
        select: { id: true, nombre: true, activo: true },
      })
      if (!target || !target.activo) {
        return NextResponse.json({ error: 'Destinatario inválido' }, { status: 400 })
      }
      receptorNombre = target.nombre
    }

    const mensaje = await db.mensajeChat.create({
      data: {
        emisorId: identity.emisorId,
        emisorNombre: identity.emisorNombre,
        emisorTipo: identity.emisorTipo,
        receptorId: receptorId || null,
        receptorNombre,
        contenido: contenido || '',
        tipo: tipo || 'TEXTO',
        adjuntoUrl: adjuntoUrl || null,
        adjuntoNombre: adjuntoNombre || null,
        adjuntoMime: adjuntoMime || null,
      },
    })

    db.auditLog.create({
      data: {
        accion: 'CREATE',
        entidad: 'MensajeChat',
        entidadId: mensaje.id,
        usuario: identity.emisorNombre,
        detalle: JSON.stringify({ receptor: receptorNombre || 'general', tipo: mensaje.tipo }),
      },
    }).catch(() => {})

    return NextResponse.json({ mensaje })
  } catch (e) {
    console.error('POST /api/mensajes', e)
    return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 })
  }
}
