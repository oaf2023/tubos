import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!clienteId) {
      return NextResponse.json({ error: 'Se requiere clienteId' }, { status: 400 })
    }

    const where = { clienteId }

    const [total, movimientos, aggs] = await Promise.all([
      db.cuentaCorrienteMovimiento.count({ where }),
      db.cuentaCorrienteMovimiento.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.cuentaCorrienteMovimiento.aggregate({
        where,
        _sum: { debe: true, haber: true, saldo: true },
      }),
    ])

    const ultimoSaldo = movimientos.length > 0 ? movimientos[0].saldo : 0

    return NextResponse.json({
      data: movimientos,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      resumen: {
        totalDebe: aggs._sum.debe || 0,
        totalHaber: aggs._sum.haber || 0,
        saldoActual: ultimoSaldo,
      },
    })
  } catch (e) {
    console.error('GET /api/cuenta-corriente', e)
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
  }
}
