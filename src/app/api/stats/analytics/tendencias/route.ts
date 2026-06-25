import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const meses = parseInt(url.searchParams.get('meses') || '12')
    const desde = new Date()
    desde.setMonth(desde.getMonth() - meses)
    desde.setDate(1)

    const movimientos = await db.cylinderMovimiento.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, tipo: true },
      orderBy: { fecha: 'asc' },
    })

    const facturas = await db.factura.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, total: true, estado: true },
      orderBy: { fecha: 'asc' },
    })

    const pedidos = await db.pedido.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, total: true, estado: true },
      orderBy: { fecha: 'asc' },
    })

    const mantenimientos = await db.mantenimiento.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, costo: true },
      orderBy: { fecha: 'asc' },
    })

    const movimientosPorMes: Record<string, any> = {}
    const facturacionPorMes: Record<string, any> = {}
    const pedidosPorMes: Record<string, any> = {}
    const mantenimientoPorMes: Record<string, any> = {}

    for (let i = 0; i < meses; i++) {
      const d = new Date(desde.getFullYear(), desde.getMonth() + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      movimientosPorMes[key] = { mes: key, label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }), CARGA: 0, DESCARGA: 0, TRASLADO: 0, INSPECCION: 0, REPARACION: 0, ALTA: 0, BAJA: 0, total: 0 }
      facturacionPorMes[key] = { mes: key, label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }), total: 0, pagada: 0, pendiente: 0, vencida: 0, count: 0 }
      pedidosPorMes[key] = { mes: key, label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }), total: 0, count: 0 }
      mantenimientoPorMes[key] = { mes: key, label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }), count: 0, costo: 0 }
    }

    for (const m of movimientos) {
      const key = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}`
      if (movimientosPorMes[key]) {
        if (movimientosPorMes[key][m.tipo] !== undefined) movimientosPorMes[key][m.tipo]++
        movimientosPorMes[key].total++
      }
    }

    for (const f of facturas) {
      const key = `${f.fecha.getFullYear()}-${String(f.fecha.getMonth() + 1).padStart(2, '0')}`
      if (facturacionPorMes[key]) {
        facturacionPorMes[key].total += Number(f.total)
        facturacionPorMes[key].count++
        if (f.estado === 'PAGADA') facturacionPorMes[key].pagada += Number(f.total)
        else if (f.estado === 'VENCIDA') facturacionPorMes[key].vencida += Number(f.total)
        else facturacionPorMes[key].pendiente += Number(f.total)
      }
    }

    for (const p of pedidos) {
      const key = `${p.fecha.getFullYear()}-${String(p.fecha.getMonth() + 1).padStart(2, '0')}`
      if (pedidosPorMes[key]) {
        pedidosPorMes[key].total += Number(p.total)
        pedidosPorMes[key].count++
      }
    }

    for (const m of mantenimientos) {
      const key = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}`
      if (mantenimientoPorMes[key]) {
        mantenimientoPorMes[key].count++
        mantenimientoPorMes[key].costo += Number(m.costo || 0)
      }
    }

    return NextResponse.json({
      meses: Object.values(movimientosPorMes),
      facturacion: Object.values(facturacionPorMes),
      pedidos: Object.values(pedidosPorMes),
      mantenimiento: Object.values(mantenimientoPorMes),
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/tendencias', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
