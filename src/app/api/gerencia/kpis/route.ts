import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import * as ml from '@/lib/mercadolibre'
import * as mp from '@/lib/mercadopago'

export async function GET(request: NextRequest) {
  const roleCheck = await requireRole('gerencia')(request)
  if (roleCheck) return roleCheck

  const [orders, payments, movements, balance] = await Promise.all([
    ml.getOrders().catch(() => []),
    mp.getPayments().catch(() => []),
    mp.getAccountMovements().catch(() => []),
    mp.getBalance().catch(() => null),
  ])

  const ordersArr = Array.isArray(orders) ? orders : []
  const paymentsArr = Array.isArray(payments) ? payments : []
  const movementsArr = Array.isArray(movements) ? movements : []

  const ventasTotal = ordersArr.reduce((s, o) => s + (o.total_amount || 0), 0)
  const cobradoTotal = paymentsArr.filter(p => p.status === 'approved').reduce((s, p) => s + (p.net_amount || p.transaction_amount || 0), 0)
  const pendienteTotal = paymentsArr.filter(p => p.status === 'pending').reduce((s, p) => s + (p.transaction_amount || 0), 0)
  const reembolsos = paymentsArr.filter(p => p.status === 'refunded').reduce((s, p) => s + (p.transaction_amount || 0), 0)
  const comisiones = movementsArr.filter(m => m.type === 'fee').reduce((s, m) => s + Math.abs(m.amount || 0), 0)
  const ordenesPagadas = ordersArr.filter(o => o.status === 'paid').length
  const ordenesEnviadas = ordersArr.filter(o => o.status === 'shipped').length
  const ordenesEntregadas = ordersArr.filter(o => o.status === 'delivered').length
  const ordenesCanceladas = ordersArr.filter(o => o.status === 'cancelled').length
  const cantidadItemsVendidos = ordersArr.reduce((s, o) => s + (o.order_items?.reduce((a: number, i: { quantity: number }) => a + (i.quantity || 0), 0) || 0), 0)

  const kpis = {
    comerciales: {
      ventasTotal: { value: ventasTotal, format: 'currency', umbralVerde: 500000, umbralAmarillo: 300000 },
      cobradoTotal: { value: cobradoTotal, format: 'currency', umbralVerde: 400000, umbralAmarillo: 200000 },
      pendienteTotal: { value: pendienteTotal, format: 'currency', umbralVerde: 50000, umbralAmarillo: 150000 },
      ordenesPagadas: { value: ordenesPagadas, format: 'number', umbralVerde: 30, umbralAmarillo: 15 },
      ordenesEnviadas: { value: ordenesEnviadas, format: 'number', umbralVerde: 25, umbralAmarillo: 12 },
      ordenesEntregadas: { value: ordenesEntregadas, format: 'number', umbralVerde: 20, umbralAmarillo: 10 },
      ordenesCanceladas: { value: ordenesCanceladas, format: 'number', umbralVerde: 5, umbralAmarillo: 10 },
      cantidadItemsVendidos: { value: cantidadItemsVendidos, format: 'number', umbralVerde: 100, umbralAmarillo: 50 },
    },
    financieros: {
      saldoDisponible: { value: balance?.total_available || 0, format: 'currency', umbralVerde: 200000, umbralAmarillo: 100000 },
      saldoPendiente: { value: balance?.total_pending || 0, format: 'currency', umbralVerde: 50000, umbralAmarillo: 150000 },
      comisiones: { value: comisiones, format: 'currency', umbralVerde: 20000, umbralAmarillo: 40000 },
      reembolsos: { value: reembolsos, format: 'currency', umbralVerde: 10000, umbralAmarillo: 30000 },
    },
    operativos: {
      reclamosAbiertos: { value: 0, format: 'number', umbralVerde: 3, umbralAmarillo: 8 },
      preguntasSinResponder: { value: 0, format: 'number', umbralVerde: 3, umbralAmarillo: 8 },
    },
    isMock: ml.isMock() || mp.isMock(),
  }

  return NextResponse.json({ kpis })
}
