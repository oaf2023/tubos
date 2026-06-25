import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const lectores = await db.lectorIoT.findMany({
      orderBy: { nombre: 'asc' },
      include: { zona: true },
    })
    return NextResponse.json(lectores)
  } catch (e) {
    console.error('GET /api/deposito/lectores', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.codigo || !body.nombre || !body.zonaLecturaId) {
      return NextResponse.json({ error: 'codigo, nombre y zonaLecturaId requeridos' }, { status: 400 })
    }
    const lector = await db.lectorIoT.create({
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        tipo: body.tipo || 'ESP32',
        ip: body.ip || null,
        zonaLecturaId: body.zonaLecturaId,
        activo: body.activo !== false,
      },
    })
    return NextResponse.json(lector, { status: 201 })
  } catch (e) {
    console.error('POST /api/deposito/lectores', e)
    return NextResponse.json({ error: 'Error al crear lector' }, { status: 500 })
  }
}
