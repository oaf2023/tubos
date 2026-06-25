import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const movimientos = await db.movimientoStock.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { gas: true, eventoRfid: true },
    })
    return NextResponse.json(movimientos)
  } catch (e) {
    console.error('GET /api/deposito/movimientos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
