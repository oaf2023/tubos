import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveChatIdentity } from '@/lib/chat-identity'

// GET /api/mensajes/contactos - usuarios activos + choferes online + no leídos
export async function GET(request: NextRequest) {
  try {
    const identity = await resolveChatIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const [usuarios, choferesOnline, noLeidos, escribiendo, presentes] = await Promise.all([
      db.usuario.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, usuario: true },
        orderBy: { nombre: 'asc' },
      }),
      db.sesionConductor.findMany({
        where: {
          estaEnLinea: true,
          ultimoHeartbeat: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        select: { conductor: { select: { id: true, nombre: true, usuario: true } } },
      }),
      db.mensajeChat.groupBy({
        by: ['receptorId'],
        where: {
          leido: false,
          emisorId: { not: identity.emisorId },
          OR: [{ receptorId: null }, { receptorId: identity.emisorId }],
        },
        _count: { _all: true },
      }),
      db.escribiendoChat.findMany({
        where: {
          actualizadoEn: { gte: new Date(Date.now() - 5000) },
          emisorId: { not: identity.emisorId },
        },
        select: { emisorId: true, emisorNombre: true, chatKey: true },
      }),
      db.presenciaUsuario.findMany({
        where: { ultimoHeartbeat: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
        select: { usuarioId: true },
      }),
    ])

    const presentesSet = new Set(presentes.map((p) => p.usuarioId))

    const choferes = choferesOnline
      .map((s) => s.conductor)
      .filter((c) => c && c.id !== identity.emisorId)

    const onlineIds = [
      ...presentesSet,
      ...choferes.map((c) => c.id),
    ]

    const porChat = noLeidos.reduce<Record<string, number>>((acc, m) => {
      const key = m.receptorId || 'general'
      acc[key] = (acc[key] || 0) + m._count._all
      return acc
    }, {})

    return NextResponse.json({
      yo: identity,
      generalNoLeidos: porChat['general'] || 0,
      porChat,
      onlineIds,
      usuarios: usuarios
        .filter((u) => u.id !== identity.emisorId)
        .map((u) => ({ ...u, online: presentesSet.has(u.id) })),
      choferes,
      escribiendo: escribiendo.filter((e) => e.chatKey === 'general' || e.chatKey === identity.emisorId),
    })
  } catch (e) {
    console.error('GET /api/mensajes/contactos', e)
    return NextResponse.json({ error: 'Error al obtener contactos' }, { status: 500 })
  }
}
