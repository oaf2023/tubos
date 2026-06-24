import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const vehiculos = await db.vehiculo.findMany({
      include: { _count: { select: { mantenimientos: true, documentos: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(vehiculos)
  } catch (e) {
    console.error('GET /api/vehiculos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const v = await db.vehiculo.create({ data: body })
    return NextResponse.json(v, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Código o patente ya existe' }, { status: 409 })
    console.error('POST /api/vehiculos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
