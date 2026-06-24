import { NextRequest, NextResponse } from 'next/server'
import { solveTSP } from '@/lib/tsp'
import { osrmTable, osrmTrip } from '@/lib/routing'

// POST /api/routes/optimize - TSP optimization from origin through all paradas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { points, origen } = body

    if (!points || !Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: 'Se requieren al menos 2 paradas' }, { status: 400 })
    }
    if (!origen || typeof origen.lat !== 'number' || typeof origen.lng !== 'number') {
      return NextResponse.json({ error: 'origen {lat, lng} requerido' }, { status: 400 })
    }

    // Build full list: origin + all paradas
    const origenPoint = { id: 'origen', lat: origen.lat, lng: origen.lng, nombre: 'Base' }
    const allPoints = [origenPoint, ...points]

    // Try OSRM real distances matrix (for all points including origin)
    let realDist: number[][] | null = null
    try {
      const osrmResult = await osrmTable(allPoints)
      if (osrmResult) {
        realDist = osrmResult.distances
      }
    } catch {
      // fallback to Haversine
    }

    // Solve TSP: start from origin (index 0), visit all paradas optimally
    const result = solveTSP(allPoints, 0, realDist)

    // result.order has origins's visits: [0, 3, 1, 2, ...]
    // Remove origin (idx 0) from result, keep paradas in optimized order
    const orderSinOrigen = result.order.filter((idx: number) => idx !== 0)
    const optimized = orderSinOrigen.map((idx: number) => points.find((p: any) => p.id === allPoints[idx].id)!)

    // Compute full trip distance: origin -> paradas[0] -> ... -> paradas[n-1] -> origin
    const fullTripIndices = result.order
    const totalKm = realDist
      ? computeTotalDistanceFromMatrix(realDist, fullTripIndices)
      : computeTotalDistanceHaversine(allPoints, fullTripIndices)

    // Add return to origin
    const lastIdx = fullTripIndices[fullTripIndices.length - 1]
    const returnKm = realDist
      ? (realDist[lastIdx]?.[0] ?? 0)
      : haversineKm(allPoints[lastIdx].lat, allPoints[lastIdx].lng, origen.lat, origen.lng)

    const totalConRetorno = Math.round((totalKm + returnKm) * 10) / 10
    const totalMin = Math.round(((totalKm + returnKm) / 70) * 60)

    // Fetch OSRM road geometry for the full route (origin -> stops -> origin)
    let geometry: [number, number][] | null = null
    try {
      const tripRoutePoints = allPoints.filter((_, idx) => fullTripIndices.includes(idx))
        .sort((a, b) => fullTripIndices.indexOf(allPoints.indexOf(a)) - fullTripIndices.indexOf(allPoints.indexOf(b)))
      tripRoutePoints.push(origenPoint)
      const osrmRoute = await osrmTrip(tripRoutePoints)
      if (osrmRoute) {
        geometry = osrmRoute.geometry
      }
    } catch {
      // no geometry
    }

    return NextResponse.json({
      optimized,
      distanceTotal: totalConRetorno,
      durationMin: totalMin,
      distanceVuelta: Math.round(returnKm * 10) / 10,
      geometry,
      usaLiveMatrix: realDist !== null,
    })
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

function computeTotalDistanceHaversine(points: { lat: number; lng: number }[], indices: number[]): number {
  let total = 0
  for (let i = 0; i < indices.length - 1; i++) {
    total += haversineKm(points[indices[i]].lat, points[indices[i]].lng, points[indices[i + 1]].lat, points[indices[i + 1]].lng)
  }
  return total
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
