import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'

interface ConciliacionRow {
  idOrden: number | null
  cte: string
  fecha: string
  totalOrden: number
  metodoPago: string
  idPago: number | null
  montoPagado: number
  estadoMP: string | null
  diferencia: number
  alerta: 'OK' | 'ORDEN_SIN_PAGO' | 'PAGO_SIN_ORDEN' | 'DIFERENCIA' | 'DINERO_RETENIDO'
}

export async function GET() {
  const session = await requireRole('gerencia')
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Intentar obtener registros reales de ConciliacionOperacion
  let dbRows = await db.conciliacionOperacion.findMany({
    orderBy: { fecha: 'desc' },
    take: 100,
  })

  if (dbRows.length > 0) {
    const rows: ConciliacionRow[] = dbRows.map(r => ({
      idOrden: null, // se podría resolver con mlOrder.orderId si se relaciona
      cte: '',
      fecha: r.fecha.toISOString(),
      totalOrden: Number(r.importeOrden),
      metodoPago: '',
      idPago: null,
      montoPagado: Number(r.importePago),
      estadoMP: r.status,
      diferencia: Number(r.diferencia),
      alerta: (r.alerta as ConciliacionRow['alerta']) || 'DIFERENCIA',
    }))
    return NextResponse.json({ rows, pagosSinOrden: [], isMock: false })
  }

  // Fallback: calcular desde MlOrder + MpPayment
  const orders = await db.mlOrder.findMany({
    take: 50,
    orderBy: { dateCreated: 'desc' },
    include: { payment: true },
  })

  const PAYMENT_METHODS = ['visa', 'master', 'rapipago', 'mercadopago_wallet']

  const rows: ConciliacionRow[] = orders.map(o => {
    const pago = o.payment
    const diff = pago ? Number(o.totalAmount) - Number(pago.netReceived || pago.amount) : Number(o.totalAmount)

    let alerta: ConciliacionRow['alerta'] = 'OK'
    if (!pago) alerta = 'ORDEN_SIN_PAGO'
    else if (pago.status === 'pending') alerta = 'DINERO_RETENIDO'
    else if (Math.abs(diff) > 500) alerta = 'DIFERENCIA'

    return {
      idOrden: Number(o.orderId),
      cte: o.buyerNick || '',
      fecha: o.dateCreated.toISOString(),
      totalOrden: Number(o.totalAmount),
      metodoPago: pago ? PAYMENT_METHODS[Number(o.orderId) % PAYMENT_METHODS.length] : '',
      idPago: pago ? Number(pago.paymentId) : null,
      montoPagado: pago ? Number(pago.netReceived || pago.amount) : 0,
      estadoMP: pago?.status || null,
      diferencia: diff,
      alerta,
    }
  })

  const pagosSinOrden = await db.mpPayment.findMany({
    where: { mlOrderId: null },
    take: 20,
    orderBy: { dateCreated: 'desc' },
  })

  return NextResponse.json({
    rows,
    pagosSinOrden: pagosSinOrden.map(p => ({
      idPago: Number(p.paymentId),
      monto: Number(p.amount),
      estado: p.status,
      alerta: 'PAGO_SIN_ORDEN' as const,
    })),
    isMock: rows.length === 0,
  })
}
