import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const cabinas = await db.cabina.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { sensores: true, validaciones: true, alertas: true } } },
    })
    return NextResponse.json(cabinas)
  } catch (e) {
    console.error('GET /api/cabina', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.codigo || !body.nombre) {
      return NextResponse.json({ error: 'codigo y nombre requeridos' }, { status: 400 })
    }
    const cabina = await db.cabina.create({
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        ubicacion: body.ubicacion || null,
        activo: body.activo !== false,
      },
    })
    return NextResponse.json(cabina, { status: 201 })
  } catch (e) {
    console.error('POST /api/cabina', e)
    return NextResponse.json({ error: 'Error al crear cabina' }, { status: 500 })
  }
}
