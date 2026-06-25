import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const sensores = await db.sensorCabina.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cabina: true },
    })
    return NextResponse.json(sensores)
  } catch (e) {
    console.error('GET /api/cabina/sensores', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.cabinaId || !body.tipo || !body.codigo) {
      return NextResponse.json({ error: 'cabinaId, tipo y codigo requeridos' }, { status: 400 })
    }
    const sensor = await db.sensorCabina.create({
      data: {
        cabinaId: body.cabinaId,
        tipo: body.tipo,
        codigo: body.codigo,
        configuracion: body.configuracion || null,
        activo: body.activo !== false,
      },
    })
    return NextResponse.json(sensor, { status: 201 })
  } catch (e) {
    console.error('POST /api/cabina/sensores', e)
    return NextResponse.json({ error: 'Error al crear sensor' }, { status: 500 })
  }
}
