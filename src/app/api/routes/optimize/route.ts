import { NextRequest, NextResponse } from 'next/server'
import { solveTSP } from '@/lib/tsp'
import { osrmTable, osrmTrip } from '@/lib/routing'
import { haversineKm } from '@/lib/haversine'
import type { LatLng, NamedPoint, RouteResult, OptimizeResult, RoutingSource, OptimizationEngine } from '@/lib/routing-types'

// POST /api/routes/optimize — TSP optimization + OSRM real geometry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { points, origen, returnToBase = true } = body

    if (!points || !Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: 'Se requieren al menos 2 paradas' }, { status: 400 })
    }
    if (!origen || typeof origen.lat !== 'number' || typeof origen.lng !== 'number') {
      return NextResponse.json({ error: 'origen {lat, lng} requerido' }, { status: 400 })
    }

    const origenPoint: NamedPoint = { id: 'origen', lat: origen.lat, lng: origen.lng, nombre: 'Base' }
    const allPoints: NamedPoint[] = [origenPoint, ...points]
    let routingSource: RoutingSource = 'NONE'
    let optimizationEngine: OptimizationEngine = 'TSP'

    // 1. Try OSRM real distance matrix
    let realDist: number[][] | null = null
    try {
      const osrmResult = await osrmTable(allPoints)
      if (osrmResult) {
        realDist = osrmResult.distances
        routingSource = 'OSRM_LOCAL'
      }
    } catch { /* fallback */ }

    // 2. If no OSRM, routing source is haversine
    if (!realDist) routingSource = 'HAVERSINE_ESTIMATED'

    // 3. Solve TSP with real distances if available
    const result = solveTSP(allPoints, 0, realDist)

    // 4. Build optimized paradas list (exclude origin)
    const orderSinOrigen = result.order.filter((idx: number) => idx !== 0)
    const optimized: NamedPoint[] = orderSinOrigen.map((idx: number) => {
      const orig = allPoints[idx]
      return points.find((p: any) => p.id === orig.id) || orig
    })

    // 5. Build full trip indices (origin → optimized → origin if returnToBase)
    const fullIndices = returnToBase
      ? [...result.order, 0]
      : result.order

    // 6. Calculate total distance
    const totalKm = realDist
      ? computeTotalDistanceFromMatrix(realDist, fullIndices)
      : computeTotalDistanceHaversine(allPoints, fullIndices)
    const totalConRetorno = Math.round(totalKm * 10) / 10
    const totalMinEstimado = Math.round((totalKm / 70) * 60)

    // 7. Request real OSRM geometry for the full trip
    let geometry: [number, number][] | null = null
    let tripResult: RouteResult | null = null
    let warning: string | null = null

    try {
      const tripPoints: LatLng[] = fullIndices.map((idx: number) => ({
        lat: allPoints[idx].lat,
        lng: allPoints[idx].lng,
      }))
      tripResult = await osrmTrip(tripPoints)
      if (tripResult.isRealRoute) {
        geometry = tripResult.geometry
        routingSource = tripResult.source
      } else {
        warning = tripResult.error || 'No se pudo obtener geometría real'
      }
    } catch {
      warning = 'Error al solicitar geometría a OSRM'
    }

    // Compute real duration from OSRM if available
    const durationMin = tripResult?.isRealRoute
      ? tripResult.durationMin
      : totalMinEstimado

    const response: OptimizeResult = {
      optimized,
      distanceTotal: tripResult?.isRealRoute ? tripResult.distanceKm : totalConRetorno,
      durationMin,
      geometry,
      isRealRoute: tripResult?.isRealRoute ?? false,
      routingSource,
      optimizationEngine,
      warning,
    }

    return NextResponse.json(response)
  } catch (e) {
    console.error('POST /api/routes/optimize', e)
    return NextResponse.json({ error: 'Error al optimizar' }, { status: 500 })
  }
}

function computeTotalDistanceFromMatrix(dist: number[][], indices: number[]): number {
  let total = 0
  for (let i = 0; i < indices.length - 1; i++) {
    total += dist[indices[i]]?.[indices[i + 1]] ?? 0
  }
  return total
}

function computeTotalDistanceHaversine(points: LatLng[], indices: number[]): number {
  let total = 0
  for (let i = 0; i < indices.length - 1; i++) {
    total += haversineKm(points[indices[i]].lat, points[indices[i]].lng, points[indices[i + 1]].lat, points[indices[i + 1]].lng)
  }
  return total
}
