import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fuente = searchParams.get('fuente') || undefined
    const momento = searchParams.get('momento') || undefined
    const desde = searchParams.get('desde') || undefined
    const hasta = searchParams.get('hasta') || undefined
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '30', 10))

    const where: Record<string, unknown> = {}
    if (fuente) where.fuente = fuente
    if (momento) where.momento = momento
    if (desde || hasta) {
      const fechaFilter: Record<string, Date> = {}
      if (desde) fechaFilter.gte = new Date(desde)
      if (hasta) fechaFilter.lte = new Date(hasta)
      where.fechaDate = fechaFilter
    }

    const registros = await db.clima.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ fechaDate: 'desc' }, { momento: 'asc' }, { fuente: 'asc' }],
      take: limit,
    })

    return NextResponse.json(registros)
  } catch (e) {
    console.error('GET /api/clima', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener datos climáticos' }, { status: 500 })
  }
}
