import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/presencia/usuarios - personal conectado + choferes en línea
export async function GET(request: NextRequest) {
  try {
    const raw = request.headers.get('x-user')
    let identidad: { id?: string } | null = null
    if (raw) {
      try { identidad = JSON.parse(raw) } catch { /* ignore */ }
    }

    const threshold = new Date(Date.now() - 5 * 60 * 1000)

    const [personal, choferesOnline] = await Promise.all([
      db.presenciaUsuario.findMany({
        where: { ultimoHeartbeat: { gte: threshold } },
        select: {
          usuarioId: true,
          nombre: true,
          ultimoHeartbeat: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              usuario: true,
              rol: { select: { nombre: true } },
            },
          },
        },
        orderBy: { nombre: 'asc' },
      }),
      db.sesionConductor.findMany({
        where: {
          estaEnLinea: true,
          ultimoHeartbeat: { gte: threshold },
        },
        select: {
          ultimoHeartbeat: true,
          conductor: { select: { id: true, nombre: true, usuario: true } },
        },
        orderBy: { ultimoHeartbeat: 'desc' },
      }),
    ])

    const conectados = [
      ...personal.map((p) => ({
        id: p.usuarioId,
        nombre: p.nombre,
        rol: p.usuario?.rol?.nombre || 'sin rol',
        usuario: p.usuario?.usuario || '',
        tipo: 'PERSONAL' as const,
        ultimoHeartbeat: p.ultimoHeartbeat,
      })),
      ...choferesOnline
        .map((s) => s.conductor)
        .filter((c) => c && c.id !== identidad?.id)
        .map((c) => ({
          id: c.id,
          nombre: c.nombre,
          rol: 'chofer',
          usuario: c.usuario,
          tipo: 'CHOFER' as const,
          ultimoHeartbeat: new Date(),
        })),
    ].filter((u) => u.id !== identidad?.id)

    return NextResponse.json({ conectados })
  } catch (e) {
    console.error('GET /api/presencia/usuarios', e)
    return NextResponse.json({ error: 'Error al obtener usuarios conectados' }, { status: 500 })
  }
}
