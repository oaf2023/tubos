import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse } from '@/lib/api-response'
import { createRemito } from '@/lib/services/remito-service'

export async function GET() {
  try {
    const remitos = await db.remito.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    return jsonResponse(remitos)
  } catch (e) {
    console.error('GET /api/remitos', e)
    return NextResponse.json({ error: 'Error al obtener remitos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const remito = await createRemito(body)
    return jsonResponse(remito)
  } catch (e) {
    console.error('POST /api/remitos', e)
    return NextResponse.json({ error: 'Error al crear remito' }, { status: 500 })
  }
}
