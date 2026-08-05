import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/chat-identity'

// POST /api/avisos/leer - { usuario, tipoLogin, avisoId }
export async function POST(request: NextRequest) {
  try {
    const { usuario, tipoLogin, avisoId } = await request.json()
    if (!usuario || !avisoId || !tipoLogin) {
      return NextResponse.json({ error: 'usuario, tipoLogin y avisoId requeridos' }, { status: 400 })
    }
    if (!rateLimit(request, 'avisos-leer', 60, 60000)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
    }

    const aviso = await db.avisoUsuario.findUnique({ where: { id: avisoId }, select: { id: true } })
    if (!aviso) return NextResponse.json({ ok: true })

    await db.avisoLectura.upsert({
      where: { avisoId_leidoPor: { avisoId, leidoPor: `${tipoLogin}:${usuario}` } },
      create: { avisoId, leidoPor: `${tipoLogin}:${usuario}` },
      update: {},
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/avisos/leer', e)
    return NextResponse.json({ error: 'Error al marcar aviso como leído' }, { status: 500 })
  }
}
