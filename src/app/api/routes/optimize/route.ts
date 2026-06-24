import { NextRequest, NextResponse } from 'next/server'
import { solveTSP } from '@/lib/tsp'
import { osrmTable } from '@/lib/routing'
import { db } from '@/lib/db'

// POST /api/routes/optimize - TSP optimization with optional OSRM matrix
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { points, startIndex } = body

    if (!points || !Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: 'Se requieren al menos 2 puntos' }, { status: 400 })
    }

    const n = points.length

    // Try to get real distances from OSRM
    let realDist: number[][] | null = null
    try {
      const osrmResult = await osrmTable(points)
      if (osrmResult) {
        realDist = osrmResult.distances
      }
    } catch {
      // Fallback to Haversine (handled inside solveTSP)
    }

    const result = solveTSP(points, startIndex ?? 0, realDist)

    // Reorder points according to TSP result
    const optimized = result.order.map((idx: number) => points[idx])

    // Calculate return-to-origin distance
    const last = optimized[optimized.length - 1]
    const first = points[startIndex ?? 0]
    const returnKm = realDist
      ? (realDist[result.order[result.order.length - 1]]?.[startIndex ?? 0] ?? 0)
      : haversineKm(last.lat, last.lng, first.lat, first.lng)

    const totalKm = Math.round((result.distance + returnKm) * 10) / 10
    const totalMin = Math.round((totalKm / 70) * 60)
    const origenRetorno = returnKm

    return NextResponse.json({
      order: result.order,
      optimized,
      distanceTotal: totalKm,
      durationMin: totalMin,
      distanceVuelta: returnKm,
      usaLiveMatrix: realDist !== null,
    })
  } catch (e) {
    console.error('POST /api/routes/optimize', e)
    return NextResponse.json({ error: 'Error al optimizar' }, { status: 500 })
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
