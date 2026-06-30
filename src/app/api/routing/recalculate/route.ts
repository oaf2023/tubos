import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { osrmRoute, osrmTrip } from '@/lib/routing'
import type { LatLng, RouteResult } from '@/lib/routing-types'

// POST /api/routing/recalculate - Reoptimiza paradas pendientes desde posición actual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rutaId, posicionActual, origin, points: explicitPoints, returnToBase: explicitReturn } = body

    // Two modes:
    // Mode 1: rutaId + posicionActual -> recalculate from GPS position
    // Mode 2: origin + points -> direct geometry recalculate (for admin panel)

    if (origin && explicitPoints) {
      return handleDirectRecalculate(origin, explicitPoints, explicitReturn)
    }

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
      },
    })

    if (!ruta) {
      return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })
    }

    const pendientes = ruta.paradas
    if (pendientes.length === 0) {
      return NextResponse.json({ error: 'No hay paradas pendientes' }, { status: 400 })
    }

    // Build full trip from current position through pendientes to origin (return to base)
    const tripPoints: LatLng[] = [
      posicionActual,
      ...pendientes.map((p) => ({ lat: p.lat, lng: p.lng })),
      { lat: ruta.origenLat, lng: ruta.origenLng },
    ]

    const tripResult: RouteResult = await osrmTrip(tripPoints)

    return NextResponse.json({
      rutaId,
      distanciaKm: tripResult.distanceKm,
      duracionMin: tripResult.durationMin,
      geometry: tripResult.geometry,
      isRealRoute: tripResult.isRealRoute,
      routingSource: tripResult.source,
      warning: tripResult.error || undefined,
      paradasRecalculadas: pendientes.map((p, i) => ({
        id: p.id,
        orden: i + 1,
        nombre: p.nombre,
      })),
      posicionActual,
    })
  } catch (e) {
    console.error('POST /api/routing/recalculate', e)
    return NextResponse.json({ error: 'Error al recalcular ruta' }, { status: 500 })
  }
}

async function handleDirectRecalculate(origin: LatLng, points: LatLng[], returnToBase?: boolean) {
  const tripPoints: LatLng[] = [origin, ...points]
  if (returnToBase !== false) {
    tripPoints.push(origin)
  }

  const tripResult: RouteResult = await osrmTrip(tripPoints)

  return NextResponse.json({
    distanceTotal: tripResult.distanceKm,
    durationMin: tripResult.durationMin,
    geometry: tripResult.geometry,
    isRealRoute: tripResult.isRealRoute,
    routingSource: tripResult.source,
    warning: tripResult.error || undefined,
  })
}
