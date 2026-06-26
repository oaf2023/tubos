import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const totalCilindros = await db.cylinder.count()
    const ahora = new Date()

    // ── 1. Rotación de tubos ──────────────────────────────────
    // Entregas de los últimos 30 días (paradas ENTREGADO con llegada)
    const entregas30d = await db.rutaParada.count({
      where: {
        estado: 'ENTREGADO',
        llegada: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    })
    const stockPromedio = totalCilindros || 1
    const rotacion = Math.round((entregas30d / stockPromedio) * 100) / 100

    // ── 2. Stock crítico por gas ──────────────────────────────
    const gases = await db.gas.findMany({ include: { cylinders: true } })
    const stockCritico = gases
      .map((g) => {
        const llenos = g.cylinders.filter((c) => c.estado === 'LLENO').length
        const total = g.cylinders.length
        return {
          gasId: g.id,
          gasCodigo: g.codigo,
          gasNombre: g.nombre,
          total,
          llenos,
          porcentaje: total > 0 ? Math.round((llenos / total) * 100) : 0,
          critico: llenos < 3 || total === 0,
        }
      })
      .sort((a, b) => a.porcentaje - b.porcentaje)

    // ── 3. Clientes con mayor retención ───────────────────────
    // Clientes que tienen cilindros en EN_CLIENTE hace más tiempo
    const clientesConCilindros = await db.cliente.findMany({
      where: { cylinders: { some: { estado: 'EN_CLIENTE' } } },
      include: {
        cylinders: {
          where: { estado: 'EN_CLIENTE' },
          select: {
            id: true,
            numeroSerie: true,
            fechaCarga: true,
            updatedAt: true,
          },
        },
      },
    })
    const clientesRetencion = clientesConCilindros
      .map((c) => {
        const daysList = c.cylinders.map((cyl) =>
          Math.floor((ahora.getTime() - (cyl.fechaCarga || cyl.updatedAt).getTime()) / 86400000)
        )
        const promedioDias = daysList.length > 0
          ? Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length)
          : 0
        return {
          clienteId: c.id,
          clienteNombre: c.nombre,
          totalCilindros: c.cylinders.length,
          promedioDias,
          riesgo: promedioDias > 90 ? 'ALTO' : promedioDias > 60 ? 'MEDIO' : 'BAJO',
        }
      })
      .sort((a, b) => b.promedioDias - a.promedioDias)
      .slice(0, 10)

    // ── 4. Vencimientos PH próximos ──────────────────────────
    const phVencidos = await db.cylinder.count({
      where: { estado: 'PH_VENCIDO' },
    })
    const phPorVencer30 = await db.cylinder.count({
      where: {
        fechaProximoRetest: {
          gte: ahora,
          lte: new Date(ahora.getTime() + 30 * 86400000),
        },
        estado: { notIn: ['BAJA', 'EXTRAVIADO', 'PH_VENCIDO'] },
      },
    })
    const phPorVencer60 = await db.cylinder.count({
      where: {
        fechaProximoRetest: {
          gte: ahora,
          lte: new Date(ahora.getTime() + 60 * 86400000),
        },
        estado: { notIn: ['BAJA', 'EXTRAVIADO', 'PH_VENCIDO'] },
      },
    })
    const phPorVencer90 = await db.cylinder.count({
      where: {
        fechaProximoRetest: {
          gte: ahora,
          lte: new Date(ahora.getTime() + 90 * 86400000),
        },
        estado: { notIn: ['BAJA', 'EXTRAVIADO', 'PH_VENCIDO'] },
      },
    })

    // Top 10 cilindros próximos a vencer
    const proximosVencer = await db.cylinder.findMany({
      where: {
        fechaProximoRetest: {
          gte: ahora,
          lte: new Date(ahora.getTime() + 90 * 86400000),
        },
        estado: { notIn: ['BAJA', 'EXTRAVIADO', 'PH_VENCIDO'] },
      },
      include: { gas: { select: { codigo: true, nombre: true } } },
      orderBy: { fechaProximoRetest: 'asc' },
      take: 20,
    })

    // ── 5. Pérdidas / no localizados ─────────────────────────
    const extraviados = await db.cylinder.count({ where: { estado: 'EXTRAVIADO' } })
    const baja = await db.cylinder.count({ where: { estado: 'BAJA' } })
    const totalPerdidas = extraviados + baja
    const porcentajePerdidas = totalCilindros > 0
      ? Math.round((totalPerdidas / totalCilindros) * 100 * 100) / 100
      : 0

    // ── 6. % utilización de tubos ──────────────────────────
    const estadosActivos = ['LLENO', 'EN_CLIENTE', 'EN_REPARTO', 'EN_CARGA', 'EN_DEPOSITO']
    const enUso = await db.cylinder.count({
      where: { estado: { in: estadosActivos } },
    })
    const utilizacion = totalCilindros > 0
      ? Math.round((enUso / totalCilindros) * 100 * 100) / 100
      : 0

    // Desglose por estado
    const desgloseEstados = await db.cylinder.groupBy({
      by: ['estado'],
      _count: { id: true },
    })
    const utilizacionPorEstado = desgloseEstados.map((e) => ({
      estado: e.estado,
      count: e._count.id,
      porcentaje: totalCilindros > 0
        ? Math.round((e._count.id / totalCilindros) * 100 * 100) / 100
        : 0,
    }))

    // ── 7. Costo por tubo entregado ─────────────────────────
    const rutasConCosto = await db.ruta.findMany({
      where: {
        estado: 'COMPLETADA',
        costoTotal: { not: null },
        paradas: { some: { estado: 'ENTREGADO' } },
      },
      select: {
        costoTotal: true,
        _count: { select: { paradas: { where: { estado: 'ENTREGADO' } } } },
      },
    })
    let costoPorTubo = 0
    let totalEntregados = 0
    let totalCostos = 0
    if (rutasConCosto.length > 0) {
      totalEntregados = rutasConCosto.reduce((s, r) => s + r._count.paradas, 0)
      totalCostos = rutasConCosto.reduce((s, r) => s + Number(r.costoTotal || 0), 0)
      costoPorTubo = totalEntregados > 0
        ? Math.round((totalCostos / totalEntregados) * 100) / 100
        : 0
    }

    // ── Composición por estado ──────────────────────────────
    const estadoComposition = desgloseEstados.map((e) => ({
      estado: e.estado,
      cantidad: e._count.id,
    }))

    return NextResponse.json({
      rotacion,
      stockCritico,
      clientesRetencion,
      ph: {
        vencidos: phVencidos,
        porVencer30: phPorVencer30,
        porVencer60: phPorVencer60,
        porVencer90: phPorVencer90,
        proximos: proximosVencer.map((c) => ({
          id: c.id,
          numeroSerie: c.numeroSerie,
          gas: c.gas.codigo,
          vencimiento: c.fechaProximoRetest,
          diasRestantes: Math.floor((c.fechaProximoRetest.getTime() - ahora.getTime()) / 86400000),
        })),
      },
      perdidas: {
        extraviados,
        baja,
        total: totalPerdidas,
        porcentaje: porcentajePerdidas,
      },
      utilizacion: {
        porcentaje: utilizacion,
        enUso,
        total: totalCilindros,
        porEstado: utilizacionPorEstado,
      },
      costos: {
        costoPorTubo,
        totalEntregadosEnRutas: totalEntregados,
        totalCostosRutas: totalCostos,
        rutasConCosto: rutasConCosto.length,
      },
      resumen: {
        totalCilindros,
        totalGases: gases.length,
        totalClientes: await db.cliente.count(),
        totalRutas: await db.ruta.count(),
        estadoComposition,
      },
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/tablero', e)
    return NextResponse.json({ error: 'Error al obtener KPIs tablero' }, { status: 500 })
  }
}
