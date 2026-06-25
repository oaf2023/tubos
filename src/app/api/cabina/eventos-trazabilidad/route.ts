import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const eventos = await db.eventoTrazabilidad.findMany({
      orderBy: { fecha: 'desc' },
      take: 100,
      include: { cabina: true, cylinder: true },
    })
    return NextResponse.json(eventos)
  } catch (e) {
    console.error('GET /api/cabina/eventos-trazabilidad', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
