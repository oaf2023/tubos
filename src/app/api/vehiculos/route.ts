import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const vehiculos = await db.vehiculo.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { codigo: 'asc' },
    })
    return NextResponse.json(vehiculos)
  } catch (e) {
    console.error('GET /api/vehiculos', e)
    return NextResponse.json({ error: 'Error al obtener vehículos' }, { status: 500 })
  }
}
