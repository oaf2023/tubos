import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIdempotencyKey, checkIdempotency, saveIdempotency } from '@/lib/idempotency'
import { procesarEventoRFID } from '@/lib/services/rfid-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lectorId, zonaId, tid } = body

    if (!lectorId || !zonaId || !tid) {
      return NextResponse.json({ error: 'lectorId, zonaId y tid son requeridos' }, { status: 400 })
    }

    const idempotencyKey = getIdempotencyKey(req)
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey)
      if (cached) return NextResponse.json(cached.response, { status: cached.status })
    }

    const responseBody = await procesarEventoRFID({
      lectorId,
      zonaId,
      tid,
      origen: body.origen,
      usuario: body.usuario,
      observacion: body.observacion,
    })

    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, responseBody, 201)
    }

    return NextResponse.json(responseBody, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al procesar evento RFID'
    const status = msg.includes('no encontrado') || msg.includes('inactiva') ? 404 : 500
    console.error('POST /api/rfid/eventos', e)
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const tid = searchParams.get('tid') || undefined

    const where: any = {}
    if (tid) where.tid = tid

    const eventos = await db.eventoRFID.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        lector: { select: { codigo: true, nombre: true } },
        zona: { select: { codigo: true, nombre: true, tipo: true } },
      },
    })

    return NextResponse.json(eventos)
  } catch (e) {
    console.error('GET /api/rfid/eventos', e)
    return NextResponse.json({ error: 'Error al obtener eventos RFID' }, { status: 500 })
  }
}
