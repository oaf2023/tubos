import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/chat-identity'

type IdentidadResuelta = { id: string } | null

async function resolverIdentidad(usuario: string, tipoLogin: string): Promise<IdentidadResuelta> {
  if (tipoLogin === 'cliente') return null // chat interno: solo staff/choferes
  const user = await db.usuario.findUnique({
    where: { usuario },
    select: { id: true, activo: true },
  })
  if (!user || !user.activo) return null
  return { id: user.id }
}

// GET /api/mensajes/consulta-login?usuario=xxx&tipoLogin=usuario|gerencia|cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const usuario = (searchParams.get('usuario') || '').trim()
    const tipoLogin = searchParams.get('tipoLogin') || 'usuario'

    if (!usuario) return NextResponse.json({ mensajes: [] })
    if (!rateLimit(request, 'mensajes-consulta-login', 60, 60000)) {
      return NextResponse.json({ mensajes: [] }, { status: 429 })
    }

    const identidad = await resolverIdentidad(usuario, tipoLogin)
    if (!identidad) return NextResponse.json({ mensajes: [] })

    const select = {
      id: true,
      emisorId: true,
      emisorNombre: true,
      contenido: true,
      tipo: true,
      adjuntoUrl: true,
      adjuntoNombre: true,
      createdAt: true,
    } as const

    const [directos, general] = await Promise.all([
      db.mensajeChat.findMany({
        where: { leido: false, receptorId: identidad.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select,
      }),
      db.mensajeChat.findMany({
        where: { leido: false, receptorId: null, emisorId: { not: identidad.id } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select,
      }),
    ])

    const mensajes = [
      ...directos.map((m) => ({ ...m, chatKey: m.emisorId, directo: true })),
      ...general.map((m) => ({ ...m, chatKey: 'general', directo: false })),
    ]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 5)

    return NextResponse.json({ mensajes })
  } catch (e) {
    console.error('GET /api/mensajes/consulta-login', e)
    return NextResponse.json({ error: 'Error al consultar mensajes' }, { status: 500 })
  }
}
