import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

interface ConciliacionRow {
  idOrden: number
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

const ORDENES_MOCK = [
  { id: 2309841, cte: 'Juan Pérez', monto: 15600, metodoPago: 'visa', fecha: new Date(2026, 6, 3) },
  { id: 2309842, cte: 'María López', monto: 22450, metodoPago: 'master', fecha: new Date(2026, 6, 3) },
  { id: 2309843, cte: 'Carlos Ruiz', monto: 8900, metodoPago: 'rapipago', fecha: new Date(2026, 6, 2) },
  { id: 2309844, cte: 'Ana García', monto: 32100, metodoPago: 'mercadopago', fecha: new Date(2026, 6, 2) },
  { id: 2309845, cte: 'Pedro Sánchez', monto: 18750, metodoPago: 'visa', fecha: new Date(2026, 6, 1) },
  { id: 2309846, cte: 'Lucía Fernández', monto: 14320, metodoPago: 'master', fecha: new Date(2026, 6, 1) },
  { id: 2309847, cte: 'Diego Martínez', monto: 27800, metodoPago: 'rapipago', fecha: new Date(2026, 5, 30) },
  { id: 2309848, cte: 'Sofía Gómez', monto: 9500, metodoPago: 'mercadopago', fecha: new Date(2026, 5, 30) },
]

const PAGOS_MOCK = [
  { idPago: 3000000, idOrden: 2309841, monto: 15600, estado: 'approved' },
  { idPago: 3000001, idOrden: 2309842, monto: 22000, estado: 'approved', diferencia: -450 },
  { idPago: 3000002, idOrden: 2309843, monto: 8900, estado: 'approved' },
  { idPago: 3000003, idOrden: 2309844, monto: 0, estado: 'pending', diferencia: -32100 },
  { idPago: 3000004, idOrden: 2309845, monto: 0, estado: null, diferencia: -18750 },
  { idPago: 3000005, idOrden: 2309846, monto: 14320, estado: 'approved' },
  { idPago: 3000006, idOrden: 0, monto: 5600, estado: 'approved', diferencia: 5600 },
  { idPago: 3000007, idOrden: 2309848, monto: 3200, estado: 'approved', diferencia: -6300 },
]

function determinarAlerta(orden: typeof ORDENES_MOCK[0] | null, pago: typeof PAGOS_MOCK[0] | null): ConciliacionRow['alerta'] {
  if (!orden && pago) return 'PAGO_SIN_ORDEN'
  if (orden && !pago) return 'ORDEN_SIN_PAGO'
  if (orden && pago && pago.diferencia && Math.abs(pago.diferencia) > 1000) return 'DIFERENCIA'
  if (pago && pago.estado === 'pending') return 'DINERO_RETENIDO'
  return 'OK'
}

export async function GET() {
  const session = await requireRole('gerencia')
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rows: ConciliacionRow[] = ORDENES_MOCK.map(orden => {
    const pago = PAGOS_MOCK.find(p => p.idOrden === orden.id) || null
    return {
      idOrden: orden.id,
      cte: orden.cte,
      fecha: orden.fecha.toISOString(),
      totalOrden: orden.monto,
      metodoPago: orden.metodoPago,
      idPago: pago?.idPago || null,
      montoPagado: pago?.monto || 0,
      estadoMP: pago?.estado || null,
      diferencia: pago?.diferencia || (pago ? pago.monto - orden.monto : -orden.monto),
      alerta: determinarAlerta(orden, pago),
    }
  })

  const pagosSinOrden = PAGOS_MOCK.filter(p => p.idOrden === 0).map(p => ({
    idPago: p.idPago,
    monto: p.monto,
    estado: p.estado,
    alerta: 'PAGO_SIN_ORDEN' as const,
  }))

  return NextResponse.json({ rows, pagosSinOrden, isMock: true })
}
