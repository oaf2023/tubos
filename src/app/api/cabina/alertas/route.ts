import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const alertas = await db.alerta.findMany({
      orderBy: { fecha: 'desc' },
      take: 100,
      include: { cabina: true, cylinder: true },
    })
    return NextResponse.json(alertas)
  } catch (e) {
    console.error('GET /api/cabina/alertas', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
