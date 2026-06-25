import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const meses = parseInt(url.searchParams.get('meses') || '12')
    const desde = new Date()
    desde.setMonth(desde.getMonth() - meses)

    const facturas = await db.factura.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, total: true, totalGeneral: true, estado: true, subtotal: true, descuento: true, impuestos: true },
      orderBy: { fecha: 'desc' },
    })

    const itemsFactura = await db.facturaItem.findMany({
      where: { factura: { fecha: { gte: desde } } },
      include: { factura: { select: { fecha: true } } },
    })

    const ingresosPorEstado: Record<string, number> = {}
    for (const f of facturas) {
      ingresosPorEstado[f.estado] = (ingresosPorEstado[f.estado] || 0) + Number(f.totalGeneral)
    }
    const estadoFacturas = Object.entries(ingresosPorEstado).map(([estado, total]) => ({ estado, total }))

    const ingresosPorMes: Record<string, number> = {}
    for (const f of facturas) {
      const key = `${f.fecha.getFullYear()}-${String(f.fecha.getMonth() + 1).padStart(2, '0')}`
      ingresosPorMes[key] = (ingresosPorMes[key] || 0) + Number(f.totalGeneral)
    }

    const ingresosPorTipo: Record<string, number> = {}
    for (const fi of itemsFactura) {
      ingresosPorTipo[fi.tipo] = (ingresosPorTipo[fi.tipo] || 0) + Number(fi.subtotal)
    }
    const porTipo = Object.entries(ingresosPorTipo).map(([tipo, total]) => ({ tipo, total }))

    const totalFacturado = facturas.reduce((s, f) => s + Number(f.totalGeneral), 0)
    const totalPendiente = facturas.filter(f => f.estado === 'PENDIENTE').reduce((s, f) => s + Number(f.totalGeneral), 0)
    const totalVencido = facturas.filter(f => f.estado === 'VENCIDA').reduce((s, f) => s + Number(f.totalGeneral), 0)
    const totalDescuentos = facturas.reduce((s, f) => s + Number(f.descuento), 0)
    const totalImpuestos = facturas.reduce((s, f) => s + Number(f.impuestos), 0)

    const aging: Record<string, { count: number; total: number }> = {
      '0-30': { count: 0, total: 0 },
      '31-60': { count: 0, total: 0 },
      '61-90': { count: 0, total: 0 },
      '90+': { count: 0, total: 0 },
    }
    const hoy = new Date()
    for (const f of facturas) {
      if (f.estado === 'PENDIENTE' || f.estado === 'VENCIDA') {
        const dias = Math.floor((hoy.getTime() - f.fecha.getTime()) / (1000 * 60 * 60 * 24))
        if (dias <= 30) { aging['0-30'].count++; aging['0-30'].total += Number(f.totalGeneral) }
        else if (dias <= 60) { aging['31-60'].count++; aging['31-60'].total += Number(f.totalGeneral) }
        else if (dias <= 90) { aging['61-90'].count++; aging['61-90'].total += Number(f.totalGeneral) }
        else { aging['90+'].count++; aging['90+'].total += Number(f.totalGeneral) }
      }
    }

    return NextResponse.json({
      resumen: {
        totalFacturado,
        totalPendiente,
        totalVencido,
        totalDescuentos,
        totalImpuestos,
        facturasPeriodo: facturas.length,
      },
      estadoFacturas,
      ingresosPorTipo: porTipo,
      aging: Object.entries(aging).map(([rango, data]) => ({ rango, ...data })),
      ingresosMensuales: Object.entries(ingresosPorMes).map(([mes, total]) => ({ mes, total })).sort((a, b) => a.mes.localeCompare(b.mes)),
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/financiero', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
