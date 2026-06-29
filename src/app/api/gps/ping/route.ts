import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getIdempotencyKey, checkIdempotency, saveIdempotency } from '@/lib/idempotency'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rutaId, vehiculoId, lat, lng, velocidad, rumbo, precision, fuente, metadata } = body

    if (!rutaId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Faltan campos: rutaId, lat, lng' }, { status: 400 })
    }

    const idempotencyKey = getIdempotencyKey(request)
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey)
      if (cached) return NextResponse.json(cached.response, { status: cached.status })
    }

    const ubicacion = await db.ubicacionGPS.create({
      data: {
        rutaId,
        vehiculoId: vehiculoId || null,
        lat,
        lng,
        velocidad: velocidad || null,
        rumbo: rumbo || null,
        precision: precision || null,
        fuente: fuente || 'GPS',
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, ubicacion, 201)
    }

    return NextResponse.json(ubicacion, { status: 201 })
  } catch (e) {
    console.error('POST /api/gps/ping', e)
    return NextResponse.json({ error: 'Error al registrar ubicación GPS' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get('rutaId')
    const vehiculoId = searchParams.get('vehiculoId')

    const where: Record<string, unknown> = {}
    if (rutaId) where.rutaId = rutaId
    if (vehiculoId) where.vehiculoId = vehiculoId

    const pings = await db.ubicacionGPS.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json(pings)
  } catch (e) {
    console.error('GET /api/gps/ping', e)
    return NextResponse.json({ error: 'Error al obtener ubicaciones GPS' }, { status: 500 })
  }
}
