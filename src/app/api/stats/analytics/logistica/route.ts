import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const rutas = await db.ruta.findMany({
      select: { fecha: true, distanciaKm: true, duracionHoras: true, estado: true, _count: { select: { paradas: true } } },
    })

    const rutasPorMes: Record<string, { mes: string; count: number; distancia: number; duracion: number; paradas: number }> = {}
    for (const r of rutas) {
      const key = `${r.fecha.getFullYear()}-${String(r.fecha.getMonth() + 1).padStart(2, '0')}`
      if (!rutasPorMes[key]) rutasPorMes[key] = { mes: key, count: 0, distancia: 0, duracion: 0, paradas: 0 }
      rutasPorMes[key].count++
      rutasPorMes[key].distancia += Number(r.distanciaKm || 0)
      rutasPorMes[key].duracion += Number(r.duracionHoras || 0)
      rutasPorMes[key].paradas += r._count.paradas
    }

    const vehiculos = await db.vehiculo.findMany({
      include: {
        _count: { select: { sesionesCarga: true } },
      },
    })

    const sesionesCarga = await db.cargaVehiculo.findMany({
      include: { _count: { select: { items: true } } },
      where: { estado: 'COMPLETADA' },
    })

    const cargasCombustible = await db.cargaCombustible.findMany({
      select: { fecha: true, litros: true, costo: true, kmActual: true, rendimiento: true, vehiculoId: true },
      orderBy: { fecha: 'desc' },
    })

    const rendimientos: { fecha: string; rendimiento: number }[] = []
    for (const c of cargasCombustible.filter(c => c.rendimiento)) {
      rendimientos.push({ fecha: c.fecha.toISOString().slice(0, 7), rendimiento: Number(c.rendimiento) })
    }

    const totalRutas = rutas.length
    const distanciaProm = totalRutas > 0 ? rutas.reduce((s, r) => s + Number(r.distanciaKm || 0), 0) / totalRutas : 0
    const paradasProm = totalRutas > 0 ? rutas.reduce((s, r) => s + r._count.paradas, 0) / totalRutas : 0
    const cargaPromedio = sesionesCarga.length > 0 ? sesionesCarga.reduce((s, c) => s + c._count.items, 0) / sesionesCarga.length : 0

    return NextResponse.json({
      rutasPorMes: Object.values(rutasPorMes).sort((a, b) => a.mes.localeCompare(b.mes)),
      vehiculos: vehiculos.map(v => ({
        id: v.id, codigo: v.codigo, patente: v.patente, estado: v.estado, maxTubos: v.maxTubos, sesiones: v._count.sesionesCarga, kmActual: v.kmActual,
      })),
      rendimientoCombustible: rendimientos,
      resumen: {
        totalRutas,
        distanciaPromedioKm: Math.round(distanciaProm * 10) / 10,
        paradasPromedio: Math.round(paradasProm * 10) / 10,
        cargaPromedioTubos: Math.round(cargaPromedio * 10) / 10,
        totalVehiculos: vehiculos.length,
      },
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/logistica', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
