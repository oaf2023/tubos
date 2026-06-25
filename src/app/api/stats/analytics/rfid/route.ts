import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const eventos = await db.eventoRFID.findMany({
      include: { zona: { select: { nombre: true, tipo: true } }, lector: { select: { nombre: true } } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    })

    const eventosPorZona: Record<string, { zona: string; tipo: string; count: number }> = {}
    for (const e of eventos) {
      const key = e.zonaId
      if (!eventosPorZona[key]) eventosPorZona[key] = { zona: e.zona.nombre, tipo: e.zona.tipo, count: 0 }
      eventosPorZona[key].count++
    }

    const eventosPorOrigen: Record<string, number> = {}
    for (const e of eventos) {
      eventosPorOrigen[e.origen] = (eventosPorOrigen[e.origen] || 0) + 1
    }

    const stockGas = await db.stockGas.findMany({
      include: { gas: { select: { codigo: true, nombre: true, colorHex: true } } },
    })

    const tags = await db.tagRFID.findMany({ include: { cylinder: { select: { numeroSerie: true } } } })
    const asociados = tags.filter(t => t.cylinderId).length
    const noAsociados = tags.length - asociados

    const lectores = await db.lectorIoT.findMany()
    const activos = lectores.filter(l => l.activo).length
    const inactivos = lectores.length - activos

    const totalEventos = await db.eventoRFID.count()
    const ultimaHora = new Date(Date.now() - 3600000)
    const eventosUltimaHora = await db.eventoRFID.count({ where: { timestamp: { gte: ultimaHora } } })

    return NextResponse.json({
      resumen: {
        totalEventos,
        eventosUltimaHora,
        tagsTotales: tags.length,
        tagsAsociados: asociados,
        tagsNoAsociados: noAsociados,
        lectoresActivos: activos,
        lectoresInactivos: inactivos,
      },
      eventosPorZona: Object.values(eventosPorZona).sort((a, b) => b.count - a.count),
      eventosPorOrigen: Object.entries(eventosPorOrigen).map(([origen, cantidad]) => ({ origen, cantidad })),
      stockGas: stockGas.map(s => ({
        gas: s.gas.codigo,
        nombre: s.gas.nombre,
        color: s.gas.colorHex,
        llenos: s.llenos,
        vacios: s.vacios,
        enReparto: s.enReparto,
        enCarga: s.enCarga,
        mantenimiento: s.mantenimiento,
        baja: s.baja,
      })),
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/rfid', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
