import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { osrmRoute } from '@/lib/routing'

// POST /api/routing/recalculate - Reoptimiza paradas pendientes desde posición actual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rutaId, posicionActual } = body

    if (!rutaId || !posicionActual) {
      return NextResponse.json({ error: 'Faltan campos: rutaId, posicionActual' }, { status: 400 })
    }

    const ruta = await db.ruta.findUnique({
      where: { id: rutaId },
      include: {
        paradas: {
          where: { estado: { not: 'ENTREGADO' } },
          orderBy: { orden: 'asc' },
        },
        vehicle: true,
      },
    })

    if (!ruta) {
      return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })
    }

    const pendientes = ruta.paradas
    if (pendientes.length === 0) {
      return NextResponse.json({ error: 'No hay paradas pendientes' }, { status: 400 })
    }

    // Calcular nueva ruta desde posición actual a través de paradas pendientes
    const points = [
      posicionActual,
      ...pendientes.map((p) => ({ lat: p.lat, lng: p.lng })),
    ]

    let distanciaTotal = 0
    let duracionTotal = 0
    const geometry: [number, number][] = []
    const etas: { paradaId: string; eta: string }[] = []
    let etaActual = new Date()

    for (let i = 0; i < points.length; i++) {
      if (i === 0) continue
      const from = points[i - 1]
      const to = points[i]
      const osrm = await osrmRoute(from, to)

      let distKm: number
      let durMin: number
      let geom: [number, number][] | null = null

      if (osrm) {
        distKm = osrm.distanceKm
        durMin = osrm.durationMin
        geom = osrm.geometry
      } else {
        distKm = haversineKm(from.lat, from.lng, to.lat, to.lng)
        durMin = Math.round((distKm / 70) * 60)
      }

      distanciaTotal += distKm
      duracionTotal += durMin
      etaActual = new Date(etaActual.getTime() + durMin * 60 * 1000)

      if (geom) geometry.push(...geom)

      if (i > 0 && pendientes[i - 1]) {
        etas.push({
          paradaId: pendientes[i - 1].id,
          eta: etaActual.toISOString(),
        })
      }
    }

    return NextResponse.json({
      rutaId,
      distanciaKm: Math.round(distanciaTotal * 10) / 10,
      duracionMin: Math.round(duracionTotal),
      paradasRecalculadas: pendientes.map((p, i) => ({
        id: p.id,
        orden: i + 1,
        nombre: p.nombre,
        eta: etas[i]?.eta ?? null,
      })),
      geometry,
      posicionActual,
      _fuente: 'recalculado',
    })
  } catch (e) {
    console.error('POST /api/routing/recalculate', e)
    return NextResponse.json({ error: 'Error al recalcular ruta' }, { status: 500 })
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
