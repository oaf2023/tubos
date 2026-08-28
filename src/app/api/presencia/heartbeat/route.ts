import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { touchSession } from '@/lib/session-tracker'

// POST /api/presencia/heartbeat - registra actividad del usuario autenticado (JWT)
export async function POST(request: NextRequest) {
  try {
    const raw = request.headers.get('x-user')
    if (!raw) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }
    const user = JSON.parse(raw)
    if (!user || !user.id || !user.nombre) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    await db.presenciaUsuario.upsert({
      where: { usuarioId: user.id },
      create: { usuarioId: user.id, nombre: user.nombre },
      update: { ultimoHeartbeat: new Date() },
    })

    // Actualizar lastSeen de la sesión activa
    await touchSession(user.id)

    await db.presenciaUsuario.deleteMany({
      where: { ultimoHeartbeat: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/presencia/heartbeat', e)
    return NextResponse.json({ error: 'Error al registrar presencia' }, { status: 500 })
  }
}
