import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const mesActual = new Date(now.getFullYear(), now.getMonth(), 1)
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const totalCilindros = await db.cylinder.count()
    const totalClientes = await db.cliente.count({ where: { activo: true } })
    const totalUsuarios = await db.usuario.count({ where: { activo: true } })
    const totalVehiculos = await db.vehiculo.count({ where: { estado: 'ACTIVO' } })

    const facturacionMes = await db.factura.aggregate({
      _sum: { total: true },
      where: { fecha: { gte: mesActual } },
    })
    const facturacionMesAnterior = await db.factura.aggregate({
      _sum: { total: true },
      where: { fecha: { gte: mesAnterior, lt: mesActual } },
    })

    const ingresosMes = facturacionMes._sum.total || 0
    const ingresosMesAnt = facturacionMesAnterior._sum.total || 0
    const varIngresos = ingresosMesAnt > 0 ? ((ingresosMes - ingresosMesAnt) / ingresosMesAnt * 100).toFixed(1) : '0'

    const pendientes = await db.factura.count({ where: { estado: 'PENDIENTE' } })
    const vencidas = await db.factura.count({ where: { estado: 'VENCIDA' } })

    const cilindrosLibres = await db.cylinder.count({ where: { estado: 'LLENO' } })
    const enUso = await db.cylinder.count({ where: { estado: 'EN_USO' } })
    const vacios = await db.cylinder.count({ where: { estado: 'VACIO' } })

    const porEstado = await db.cylinder.groupBy({ by: ['estado'], _count: true })
    const estadoData = porEstado.map(e => ({ estado: e.estado, cantidad: e._count }))

    const topClientes = await db.factura.groupBy({
      by: ['cliente'],
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })

    const ultMovimientos = await db.cylinderMovimiento.count({ where: { fecha: { gte: mesActual } } })
    const movAnt = await db.cylinderMovimiento.count({ where: { fecha: { gte: mesAnterior, lt: mesActual } } })
    const varMov = movAnt > 0 ? ((ultMovimientos - movAnt) / movAnt * 100).toFixed(1) : '0'

    return NextResponse.json({
      kpis: {
        totalCilindros,
        totalClientes,
        totalUsuarios,
        totalVehiculos,
        ingresosMes,
        varIngresos: Number(varIngresos),
        facturasPendientes: pendientes,
        facturasVencidas: vencidas,
        cilindrosLibres,
        enUso,
        vacios,
        movimientosMes: ultMovimientos,
        varMovimientos: Number(varMov),
      },
      estadoData,
      topClientes,
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/panel-general', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
