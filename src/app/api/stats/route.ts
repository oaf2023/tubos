import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats - estadísticas para el dashboard
export async function GET() {
  try {
    const [total, porEstado, porGas, porCapacidad, porUbicacion, enAlerta] =
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
          where: { fechaVencimiento: { lt: new Date() } },
          include: { gas: true },
          take: 10,
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
      capacidadTotalLitros: capacidadTotal,
    })
  } catch (e) {
    console.error('GET /api/stats', e)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
