import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const clienteId = searchParams.get('clienteId')
    const tipo = searchParams.get('tipo')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const search = searchParams.get('search')

    const where: any = {}

    if (clienteId) where.clienteId = clienteId
    if (tipo && tipo !== 'all') where.tipo = { contains: tipo }
    if (desde || hasta) {
      where.fecha = {}
      if (desde) where.fecha.gte = new Date(desde)
      if (hasta) where.fecha.lte = new Date(hasta + 'T23:59:59.999Z')
    }
    if (search) {
      where.OR = [
        { clienteNombre: { contains: search, mode: 'insensitive' } },
        { cbteCompleto: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, comprobantes] = await Promise.all([
      db.comprobanteHistorico.count({ where }),
      db.comprobanteHistorico.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { items: true } } },
      }),
    ])

    return NextResponse.json({ data: comprobantes, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (e) {
    console.error('GET /api/comprobantes-historicos', e)
    return NextResponse.json({ error: 'Error al obtener comprobantes' }, { status: 500 })
  }
}
