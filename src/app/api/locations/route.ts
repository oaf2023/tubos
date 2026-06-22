import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/locations - listar ubicaciones
export async function GET() {
  try {
    const locations = await db.location.findMany({
      orderBy: [{ esBase: 'desc' }, { nombre: 'asc' }],
    })
    return NextResponse.json(locations)
  } catch (e) {
    console.error('GET /api/locations', e)
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 })
  }
}
