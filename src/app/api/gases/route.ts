import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/gases - listar todos los gases
export async function GET() {
  try {
    const gases = await db.gas.findMany({
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      include: {
        _count: { select: { cylinders: true } },
      },
    })
    return NextResponse.json(gases)
  } catch (e) {
    console.error('GET /api/gases', e)
    return NextResponse.json({ error: 'Error al obtener gases' }, { status: 500 })
  }
}

// POST /api/gases - crear nuevo gas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.codigo || !body.nombre) {
      return NextResponse.json({ error: 'código y nombre son obligatorios' }, { status: 400 })
    }
    const gas = await db.gas.create({
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        descripcion: body.descripcion || '',
        presionBar: body.presionBar ? parseFloat(body.presionBar) : 200,
        colorHex: body.colorHex || '#cccccc',
        usoPrincipal: body.usoPrincipal || '',
        categoria: body.categoria || 'Alta Presión',
        peligro: body.peligro || 'GAS_PRESION',
      },
    })
    return NextResponse.json(gas, { status: 201 })
  } catch (e) {
    console.error('POST /api/gases', e)
    return NextResponse.json({ error: 'Error al crear gas' }, { status: 500 })
  }
}
