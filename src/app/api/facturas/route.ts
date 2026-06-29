import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse } from '@/lib/api-response'
import { getIdempotencyKey, checkIdempotency, saveIdempotency } from '@/lib/idempotency'
import { createFactura } from '@/lib/services/factura-service'

export async function GET() {
  try {
    const facturas = await db.factura.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    return NextResponse.json(facturas)
  } catch (e) {
    console.error('GET /api/facturas', e)
    return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const idempotencyKey = getIdempotencyKey(req)
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey)
      if (cached) return NextResponse.json(cached.response, { status: cached.status })
    }

    const factura = await createFactura(body)

    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, factura, 201)
    }

    return jsonResponse(factura)
  } catch (e) {
    console.error('POST /api/facturas', e)
    return NextResponse.json({ error: 'Error al crear factura' }, { status: 500 })
  }
}