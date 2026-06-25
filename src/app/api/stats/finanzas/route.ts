import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const meses = parseInt(url.searchParams.get('meses') || '12')
    const desde = new Date()
    desde.setMonth(desde.getMonth() - meses)

    const hoy = new Date()
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)

    // ===== FACTURACIÓN =====
    const facturas = await db.factura.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, total: true, totalGeneral: true, estado: true, subtotal: true, descuento: true, impuestos: true, cliente: true },
      orderBy: { fecha: 'desc' },
    })

    const itemsFactura = await db.facturaItem.findMany({
      where: { factura: { fecha: { gte: desde } } },
      include: { factura: { select: { fecha: true } } },
    })

    const totalFacturadoPeriodo = facturas.reduce((s, f) => s + Number(f.totalGeneral), 0)
    const totalPendiente = facturas.filter(f => f.estado === 'PENDIENTE').reduce((s, f) => s + Number(f.totalGeneral), 0)
    const totalVencido = facturas.filter(f => f.estado === 'VENCIDA').reduce((s, f) => s + Number(f.totalGeneral), 0)
    const totalPagado = facturas.filter(f => f.estado === 'PAGADA').reduce((s, f) => s + Number(f.totalGeneral), 0)

    const ingresosDelMes = facturas.filter(f => f.fecha >= mesActual).reduce((s, f) => s + Number(f.totalGeneral), 0)
    const ingresosMesAnt = facturas.filter(f => f.fecha >= mesAnterior && f.fecha < mesActual).reduce((s, f) => s + Number(f.totalGeneral), 0)
    const varIngresos = ingresosMesAnt > 0 ? ((ingresosDelMes - ingresosMesAnt) / ingresosMesAnt * 100).toFixed(1) : '0'

    const ingresosPorMes: Record<string, number> = {}
    for (const f of facturas) {
      const key = `${f.fecha.getFullYear()}-${String(f.fecha.getMonth() + 1).padStart(2, '0')}`
      ingresosPorMes[key] = (ingresosPorMes[key] || 0) + Number(f.totalGeneral)
    }

    const ingresosPorTipo: Record<string, number> = {}
    for (const fi of itemsFactura) {
      ingresosPorTipo[fi.tipo] = (ingresosPorTipo[fi.tipo] || 0) + Number(fi.subtotal)
    }

    // ===== MANTENIMIENTO CILINDROS =====
    const mantenimientos = await db.mantenimiento.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, costo: true, tipo: true, cylinderId: true },
      orderBy: { fecha: 'desc' },
    })

    const totalMantenimiento = mantenimientos.reduce((s, m) => s + Number(m.costo || 0), 0)
    const mantMensual: Record<string, number> = {}
    const mantPorTipo: Record<string, number> = {}
    for (const m of mantenimientos) {
      const key = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}`
      mantMensual[key] = (mantMensual[key] || 0) + Number(m.costo || 0)
      mantPorTipo[m.tipo] = (mantPorTipo[m.tipo] || 0) + Number(m.costo || 0)
    }

    // ===== GASTOS VEHÍCULOS (Mantenimiento + Combustible) =====
    const mantVehiculos = await db.mantenimientoVehiculo.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, costo: true, tipo: true, vehiculoId: true, descripcion: true },
      orderBy: { fecha: 'desc' },
    })

    const cargasCombustible = await db.cargaCombustible.findMany({
      where: { fecha: { gte: desde } },
      select: { fecha: true, costo: true, litros: true, tipo: true, vehiculoId: true },
      orderBy: { fecha: 'desc' },
    })

    const totalMantVehiculos = mantVehiculos.reduce((s, m) => s + Number(m.costo || 0), 0)
    const totalCombustible = cargasCombustible.reduce((s, c) => s + Number(c.costo || 0), 0)
    const totalGastosVehiculos = totalMantVehiculos + totalCombustible

    const gastosVehiculosMensual: Record<string, { mantenimiento: number; combustible: number }> = {}
    for (const m of mantVehiculos) {
      const key = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}`
      if (!gastosVehiculosMensual[key]) gastosVehiculosMensual[key] = { mantenimiento: 0, combustible: 0 }
      gastosVehiculosMensual[key].mantenimiento += Number(m.costo || 0)
    }
    for (const c of cargasCombustible) {
      const key = `${c.fecha.getFullYear()}-${String(c.fecha.getMonth() + 1).padStart(2, '0')}`
      if (!gastosVehiculosMensual[key]) gastosVehiculosMensual[key] = { mantenimiento: 0, combustible: 0 }
      gastosVehiculosMensual[key].combustible += Number(c.costo || 0)
    }

    const totalGastos = totalMantenimiento + totalGastosVehiculos
    const margen = totalFacturadoPeriodo - totalGastos
    const margenPorc = totalFacturadoPeriodo > 0 ? (margen / totalFacturadoPeriodo * 100).toFixed(1) : '0'

    // ===== SERIES MENSUALES COMPARATIVAS =====
    const mesesSet = new Set<string>()
    for (const f of facturas) {
      mesesSet.add(`${f.fecha.getFullYear()}-${String(f.fecha.getMonth() + 1).padStart(2, '0')}`)
    }
    for (const m of mantenimientos) {
      mesesSet.add(`${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}`)
    }
    for (const m of mantVehiculos) {
      mesesSet.add(`${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}`)
    }
    for (const c of cargasCombustible) {
      mesesSet.add(`${c.fecha.getFullYear()}-${String(c.fecha.getMonth() + 1).padStart(2, '0')}`)
    }

    const serieComparativa = Array.from(mesesSet).sort().map(mes => ({
      mes,
      ingresos: ingresosPorMes[mes] || 0,
      mantCilindros: mantMensual[mes] || 0,
      mantVehiculos: gastosVehiculosMensual[mes]?.mantenimiento || 0,
      combustible: gastosVehiculosMensual[mes]?.combustible || 0,
      totalGastos: (mantMensual[mes] || 0) + (gastosVehiculosMensual[mes]?.mantenimiento || 0) + (gastosVehiculosMensual[mes]?.combustible || 0),
      margen: (ingresosPorMes[mes] || 0) - ((mantMensual[mes] || 0) + (gastosVehiculosMensual[mes]?.mantenimiento || 0) + (gastosVehiculosMensual[mes]?.combustible || 0)),
    }))

    const topGastosMantenimiento = Object.entries(mantPorTipo)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total)

    // Últimos 10 mantenimientos de cilindros
    const ultimosMantCilindros = mantenimientos.slice(0, 10).map(m => ({
      fecha: m.fecha,
      tipo: m.tipo,
      costo: m.costo,
    }))

    // Últimos 10 gastos de vehículos
    const ultimosGastosVehiculos = [
      ...mantVehiculos.slice(0, 10).map(m => ({ fecha: m.fecha, tipo: `Mant: ${m.tipo}`, costo: m.costo, descripcion: m.descripcion })),
      ...cargasCombustible.slice(0, 10).map(c => ({ fecha: c.fecha, tipo: 'Combustible', costo: c.costo, descripcion: `${c.litros} L` })),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 10)

    const totalLitros = cargasCombustible.reduce((s, c) => s + Number(c.litros || 0), 0)
    const totalCostoCombustible = cargasCombustible.reduce((s, c) => s + Number(c.costo || 0), 0)
    const precioPromedioCombustible = totalLitros > 0 ? (totalCostoCombustible / totalLitros).toFixed(2) : '0'

    return NextResponse.json({
      resumen: {
        totalFacturadoPeriodo,
        totalPagado,
        totalPendiente,
        totalVencido,
        ingresosDelMes,
        varIngresos: Number(varIngresos),
        facturasPeriodo: facturas.length,
        totalMantenimiento,
        totalMantVehiculos,
        totalCombustible,
        totalGastosVehiculos,
        totalGastos,
        margen,
        margenPorc: Number(margenPorc),
        totalLitros: Number(totalLitros.toFixed(1)),
        precioPromedioCombustible: Number(precioPromedioCombustible),
      },
      ingresosPorTipo: Object.entries(ingresosPorTipo).map(([tipo, total]) => ({ tipo, total })),
      estadoFacturas: [
        { estado: 'PAGADA', total: totalPagado },
        { estado: 'PENDIENTE', total: totalPendiente },
        { estado: 'VENCIDA', total: totalVencido },
      ],
      serieComparativa,
      mantPorTipo: topGastosMantenimiento,
      gastosVehiculosMensual: Object.entries(gastosVehiculosMensual).map(([mes, data]) => ({ mes, ...data })).sort((a, b) => a.mes.localeCompare(b.mes)),
      ultimosMantCilindros,
      ultimosGastosVehiculos,
    })
  } catch (e) {
    console.error('GET /api/stats/finanzas', e)
    return NextResponse.json({ error: 'Error al obtener datos financieros' }, { status: 500 })
  }
}
