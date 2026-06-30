import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { osrmTable, osrmTrip } from '@/lib/routing'
import { haversineKm } from '@/lib/haversine'

// POST /api/routes/matrix - OSRM distance/duration matrix with caching
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { points } = body
    if (!points || !Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: 'Se requieren al menos 2 puntos' }, { status: 400 })
    }

    // Try OSRM live
    const result = await osrmTable(points)

    if (result) {
      return NextResponse.json(result)
    }

    // Fallback to Haversine if OSRM fails
    const n = points.length
    const distances: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = haversineKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
        distances[i][j] = Math.round(d * 10) / 10
        distances[j][i] = distances[i][j]
      }
    }

    return NextResponse.json({
      distances,
      durations: distances.map((r) => r.map((d) => Math.round(d / 70 * 60))), // 70 km/h
      fallback: true,
    })
  } catch (e) {
    console.error('POST /api/routes/matrix', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
