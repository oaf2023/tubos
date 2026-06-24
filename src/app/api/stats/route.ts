import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats - estadísticas para el dashboard
export async function GET() {
  try {
    const hoy = new Date()

    const [total, porEstado, porGas, porCapacidad, porUbicacion, enAlerta, alertConfigs] =
      await Promise.all([
        db.cylinder.count(),
        db.cylinder.groupBy({
          by: ['estado'],
          _count: { _all: true },
        }),
        db.cylinder.groupBy({
          by: ['gasId'],
          _count: { _all: true },
          _sum: { capacidadLitros: true },
        }),
        db.cylinder.groupBy({
          by: ['capacidadLitros'],
          _count: { _all: true },
        }),
        db.cylinder.groupBy({
          by: ['ubicacionNombre', 'provincia'],
          _count: { _all: true },
        }),
        db.cylinder.findMany({
          where: { fechaProximoRetest: { lt: hoy } },
          include: { gas: true },
          take: 10,
        }),
        db.alertConfig.findMany({
          include: { gas: true },
        }),
      ])

    const gases = await db.gas.findMany()
    const gasMap = new Map(gases.map((g) => [g.id, g]))

    const porGasDetalle = porGas.map((g) => ({
      gas: gasMap.get(g.gasId),
      cantidad: g._count._all,
      capacidadTotal: g._sum.capacidadLitros || 0,
    }))

    const capacidadTotal = porGasDetalle.reduce(
      (acc, g) => acc + g.capacidadTotal,
      0
    )

    // Alertas por gas con umbrales configurados
    const alertasPorGas = await Promise.all(
      alertConfigs.filter((c) => c.activo).map(async (cfg) => {
        const fechaLimite = new Date(hoy)
        fechaLimite.setDate(fechaLimite.getDate() + cfg.diasAlertaRetest)

        const enAlerta = await db.cylinder.count({
          where: {
            gasId: cfg.gasId,
            fechaProximoRetest: { lte: fechaLimite },
          },
        })

        const vencidos = await db.cylinder.count({
          where: {
            gasId: cfg.gasId,
            fechaProximoRetest: { lt: hoy },
          },
        })

        return {
          gasId: cfg.gasId,
          gas: cfg.gas,
          diasAlertaRetest: cfg.diasAlertaRetest,
          diasMaxCliente: cfg.diasMaxCliente,
          enAlertaRetest: enAlerta,
          vencidos,
        }
      })
    )

    const totalAlertas = alertasPorGas.reduce((a, b) => a + b.enAlertaRetest, 0)

    return NextResponse.json({
      total,
      porEstado: porEstado.map((e) => ({ estado: e.estado, cantidad: e._count._all })),
      porGas: porGasDetalle,
      porCapacidad: porCapacidad.map((c) => ({
        capacidad: c.capacidadLitros,
        cantidad: c._count._all,
      })),
      porUbicacion: porUbicacion
        .map((u) => ({
          ubicacion: u.ubicacionNombre,
          provincia: u.provincia,
          cantidad: u._count._all,
        }))
        .sort((a, b) => b.cantidad - a.cantidad),
      enAlertaVencimiento: enAlerta,
      alertasPorGas,
      totalAlertas,
      capacidadTotalLitros: capacidadTotal,
    })
  } catch (e) {
    console.error('GET /api/stats', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
