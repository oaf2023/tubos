import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const zonas = await db.zonaLectura.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { lectores: true, eventos: true } } },
    })
    return NextResponse.json(zonas)
  } catch (e) {
    console.error('GET /api/deposito/zonas', e)
    return NextResponse.json({ error: 'Error al obtener zonas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.codigo || !body.nombre || !body.tipo) {
      return NextResponse.json({ error: 'código, nombre y tipo son obligatorios' }, { status: 400 })
    }
    const zona = await db.zonaLectura.create({
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        descripcion: body.descripcion || null,
        tipo: body.tipo,
        activo: body.activo !== false,
      },
    })
    return NextResponse.json(zona, { status: 201 })
  } catch (e) {
    console.error('POST /api/deposito/zonas', e)
    return NextResponse.json({ error: 'Error al crear zona' }, { status: 500 })
  }
}
