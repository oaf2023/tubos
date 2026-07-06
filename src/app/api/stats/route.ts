import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const hoy = new Date()
    const inicioSeisMeses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)

    const [
      clientesActivos,
      clientesMorosos,
      pedidosPendientes,
      pedidosHoy,
      facturasPendientes,
      totalPendienteARS,
      rutasActivasHoy,
      conductoresEnLinea,
      vehiculosDisponibles,
      totalCylinders,
      cylindersPHVencidos,
      pedidosPorEstado,
      facturacionMensual,
      clientesPorProvincia,
      alertasRecientes,
    ] = await Promise.all([
      db.cliente.count({ where: { activo: true, estadoCliente: 'ACTIVO' } }),
      db.cliente.count({ where: { estadoCuenta: 'MOROSO', activo: true } }),
      db.pedido.count({ where: { estado: 'PENDIENTE' } }),
      db.pedido.count({ where: { fecha: { gte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) } } }),
      db.factura.count({ where: { OR: [{ estado: 'PENDIENTE' }, { estado: 'VENCIDA' }] } }),
      db.factura.aggregate({ _sum: { total: true }, where: { OR: [{ estado: 'PENDIENTE' }, { estado: 'VENCIDA' }] } }),
      db.ruta.count({ where: { estado: 'EN_PROGRESO' } }),
      db.sesionConductor.count({ where: { estaEnLinea: true } }),
      db.vehiculo.count({ where: { estado: 'ACTIVO' } }),
      db.cylinder.count(),
      db.cylinder.count({ where: { fechaProximoRetest: { lt: hoy } } }),
      db.pedido.groupBy({ by: ['estado'], _count: { _all: true } }),
      db.$queryRawUnsafe<{ mes: string; total: number }[]>(
        `SELECT to_char("fecha", 'YYYY-MM') as mes, SUM("total") as total FROM "Factura" WHERE "estado" = 'PAGADA' AND "fecha" >= $1 GROUP BY mes ORDER BY mes DESC LIMIT 6`,
        inicioSeisMeses
      ),
      db.$queryRawUnsafe<{ provincia: string; cantidad: bigint }[]>(
        `SELECT "provincia", COUNT(*) as cnt FROM "Cliente" WHERE "provincia" IS NOT NULL AND "provincia" != '' GROUP BY "provincia" ORDER BY cnt DESC LIMIT 10`
      ),
      db.alerta.findMany({ orderBy: { fecha: 'desc' }, take: 5 }),
    ])

    const alertasSinResolver = alertasRecientes.filter(a => !a.resuelta).length
    const alertasCriticas = alertasRecientes.filter(a => a.nivel === 'CRITICO' || a.nivel === 'ALTO').length

    return NextResponse.json({
      clientesActivos,
      clientesMorosos,
      pedidosPendientes,
      pedidosHoy,
      facturasPendientes,
      totalPendienteARS: totalPendienteARS._sum.total || 0,
      rutasActivasHoy,
      conductoresEnLinea,
      vehiculosDisponibles,
      alertasSinResolver,
      alertasCriticas,
      totalCylinders,
      cylindersPHVencidos,
      pedidosPorEstado: pedidosPorEstado.map(e => ({ estado: e.estado, cantidad: e._count._all })),
      facturacionMensual: facturacionMensual.map(r => ({ mes: r.mes, total: Number(r.total) })),
      clientesPorProvincia: clientesPorProvincia.map(r => ({ provincia: r.provincia, cantidad: Number(r.cantidad) })),
      alertasRecientes: alertasRecientes.map(a => ({ id: a.id, tipo: a.tipo, mensaje: a.mensaje, nivel: a.nivel, fecha: a.fecha, resuelta: a.resuelta })),
    })
  } catch (e) {
    console.error('GET /api/stats', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
