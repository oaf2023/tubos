import { NextResponse } from 'next/server'
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
