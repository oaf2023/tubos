import { NextRequest, NextResponse } from 'next/server'
import { actualizarClima } from '@/lib/services/clima-service'

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('x-cron-secret')

  if (secret && auth !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const momento = body.momento || undefined
    const resultado = await actualizarClima(momento)
    return NextResponse.json(resultado)
  } catch (e) {
    console.error('POST /api/clima/actualizar', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al actualizar clima' }, { status: 500 })
  }
}
