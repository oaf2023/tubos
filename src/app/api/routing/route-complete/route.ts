import { NextRequest, NextResponse } from 'next/server'
import { osrmTrip } from '@/lib/routing'
import { solveTSP } from '@/lib/tsp'
import { haversineKm } from '@/lib/haversine'
import { logRouteCalc } from '@/lib/route-audit'
import type { LatLng, NamedPoint, RouteResult, RoutingSource, OptimizationEngine } from '@/lib/routing-types'

// POST /api/routing/route-complete
// Body: { origin: { lat, lng }, paradas: [{ id, lat, lng }], returnToBase?: boolean, useTsp?: boolean }
// Builds a full trip, optionally computes TSP order, fetches real OSRM geometry, caches result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { origin, paradas, returnToBase = true, useTsp = true } = body

    if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
      return NextResponse.json({ error: 'origin {lat, lng} requerido' }, { status: 400 })
    }
    if (!paradas || !Array.isArray(paradas) || paradas.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos 1 parada' }, { status: 400 })
    }

    const origenPt: NamedPoint = { id: 'origen', lat: origin.lat, lng: origin.lng, nombre: 'Base' }
    let orderedParadas: NamedPoint[]

    if (useTsp && paradas.length > 1) {
      const allPoints: NamedPoint[] = [origenPt, ...paradas]
      const tspResult = solveTSP(allPoints, 0)
      const orderSinOrigen = tspResult.order.filter((idx: number) => idx !== 0)
      orderedParadas = orderSinOrigen.map((idx: number) => {
        const orig = allPoints[idx]
        return paradas.find((p: any) => p.id === orig.id) || orig
      })
    } else {
      orderedParadas = paradas as NamedPoint[]
    }

    // Build full trip coordinates
    const tripPoints: LatLng[] = [
      origenPt,
      ...orderedParadas,
    ]
    if (returnToBase) {
      tripPoints.push(origenPt)
    }

    // Request OSRM geometry
    const tripResult: RouteResult = await osrmTrip(tripPoints)

    let totalKm: number
    let durationMin: number
    let geometry: [number, number][] | null
    let isRealRoute: boolean
    let routingSource: RoutingSource
    let optimizationEngine: OptimizationEngine
    let warning: string | null = null

    if (tripResult.isRealRoute) {
      totalKm = tripResult.distanceKm
      durationMin = tripResult.durationMin
      geometry = tripResult.geometry
      isRealRoute = true
      routingSource = tripResult.source
      optimizationEngine = useTsp ? 'OR_TOOLS' : 'NONE'
    } else {
      // Fallback: Haversine cumulativa
      let total = 0
      for (let i = 0; i < tripPoints.length - 1; i++) {
        total += haversineKm(tripPoints[i].lat, tripPoints[i].lng, tripPoints[i + 1].lat, tripPoints[i + 1].lng)
      }
      totalKm = Math.round(total * 10) / 10
      durationMin = Math.round((total / 70) * 60)
      geometry = null
      isRealRoute = false
      routingSource = 'HAVERSINE_ESTIMATED'
      optimizationEngine = useTsp ? 'OR_TOOLS' : 'NONE'
      warning = tripResult.error || 'No se pudo obtener geometría real de OSRM'
    }

    // Audit
    logRouteCalc({
      paradaCount: paradas.length,
      engine: optimizationEngine,
      source: routingSource,
      distanceKm: totalKm,
      durationMin,
      isRealRoute,
      error: warning ?? undefined,
    })

    return NextResponse.json({
      origin: origenPt,
      paradas: orderedParadas,
      distanceTotal: totalKm,
      durationMin,
      geometry,
      isRealRoute,
      routingSource,
      optimizationEngine,
      returnToBase,
      warning,
    })
  } catch (e) {
    console.error('POST /api/routing/route-complete', e)
    return NextResponse.json({ error: 'Error al completar ruta' }, { status: 500 })
  }
}
