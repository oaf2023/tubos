import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.cabinaId || body.pesoKg === undefined) {
      return NextResponse.json({ error: 'cabinaId y pesoKg requeridos' }, { status: 400 })
    }
    const lectura = await db.lecturaPeso.create({
      data: {
        cabinaId: body.cabinaId,
        cylinderId: body.cylinderId || null,
        pesoKg: body.pesoKg,
        sensorId: body.sensorId || null,
      },
    })
    return NextResponse.json(lectura, { status: 201 })
  } catch (e) {
    console.error('POST /api/cabina/peso', e)
    return NextResponse.json({ error: 'Error al registrar peso' }, { status: 500 })
  }
}
