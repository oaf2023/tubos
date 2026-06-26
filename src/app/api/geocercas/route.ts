import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const geocercas = await db.geocerca.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(geocercas)
  } catch (e) {
    console.error('GET /api/geocercas', e)
    return NextResponse.json({ error: 'Error al obtener geocercas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, descripcion, lat, lng, radioMetros, polygon, color, tipo, regla } = body

    if (!nombre || lat === undefined || lng === undefined || !radioMetros) {
      return NextResponse.json({ error: 'Faltan campos: nombre, lat, lng, radioMetros' }, { status: 400 })
    }

    const geo = await db.geocerca.create({
      data: {
        nombre,
        descripcion,
        lat,
        lng,
        radioMetros,
        polygon: polygon ? (typeof polygon === 'string' ? polygon : JSON.stringify(polygon)) : null,
        color: color || '#3b82f6',
        tipo: tipo || 'DEPOSITO',
        regla: regla ? JSON.stringify(regla) : null,
      },
    })

    return NextResponse.json(geo, { status: 201 })
  } catch (e) {
    console.error('POST /api/geocercas', e)
    return NextResponse.json({ error: 'Error al crear geocerca' }, { status: 500 })
  }
}
