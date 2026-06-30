import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { solveTSP } from '@/lib/tsp'
import { haversineKm } from '@/lib/haversine'

const OR_TOOLS_URL = process.env.OR_TOOLS_URL || 'http://localhost:8000'

type VrpPoint = {
  id: string
  lat: number
  lng: number
  demandaTubos?: number
  ventanaDesde?: number
  ventanaHasta?: number
  tiempoServicioMin?: number
}

type VrpVehicle = {
  id: string
  patente: string
  capacidadTubos?: number
  costoPorKm?: number
}

async function buildDistanceMatrix(points: { lat: number; lng: number }[]): Promise<{
  matrix: number[][]
  fallback: boolean
}> {
  const n = points.length
  if (n > 50) {
    // Too many points for OSRM free API, use Haversine
    const matrix = Array.from({ length: n }, () => Array(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        matrix[i][j] = haversineKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
      }
    }
    return { matrix, fallback: true }
  }

  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
    const res = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) throw new Error(`OSRM table returned ${res.status}`)
    const data = await res.json()
    if (!data.distances) throw new Error('No distances in OSRM response')

    const matrix = data.distances.map((row: number[]) =>
      row.map((d: number) => d / 1000) // convert meters to km
    )
    return { matrix, fallback: false }
  } catch {
    const matrix = Array.from({ length: n }, () => Array(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        matrix[i][j] = haversineKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
      }
    }
    return { matrix, fallback: true }
  }
}

// POST /api/routing/vrp - Multi-vehicle route optimization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      origen,
      paradas,
      vehiculos,
    }: {
      origen: VrpPoint
      paradas: VrpPoint[]
      vehiculos: VrpVehicle[]
    } = body

    if (!origen || !paradas?.length || !vehiculos?.length) {
      return NextResponse.json({ error: 'Faltan campos: origen, paradas, vehiculos' }, { status: 400 })
    }

    const allPoints = [origen, ...paradas]
    const { matrix, fallback } = await buildDistanceMatrix(allPoints)

    // Try calling OR-Tools microservice
    try {
      const orRes = await fetch(`${OR_TOOLS_URL}/vrp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: { id: origen.id, lat: origen.lat, lng: origen.lng },
          paradas: paradas.map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            demandaTubos: p.demandaTubos || 0,
            ventanaDesde: p.ventanaDesde || null,
            ventanaHasta: p.ventanaHasta || null,
            tiempoServicioMin: p.tiempoServicioMin || 0,
            prioridad: 5,
          })),
          vehiculos: vehiculos.map((v) => ({
            id: v.id,
            capacidadTubos: v.capacidadTubos || 999,
            costoPorKm: v.costoPorKm || 1,
          })),
          distanciaMatrix: matrix,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (orRes.ok) {
        const orData = await orRes.json()
        return NextResponse.json({
          ...orData,
          _fuente: 'OR-Tools',
          _matrizFuente: fallback ? 'Haversine' : 'OSRM',
        })
      }
    } catch {
      // OR-Tools not available, fall through to TSP single-vehicle
    }

    // Fallback: single-vehicle TSP for each vehicle (simple assignment)
    const result = await fallbackTSP(origen, paradas, vehiculos, matrix)
    return NextResponse.json({
      ...result,
      _fuente: 'TSP-fallback',
      _matrizFuente: fallback ? 'Haversine' : 'OSRM',
    })
  } catch (e) {
    console.error('POST /api/routing/vrp', e)
    return NextResponse.json({ error: 'Error en optimización VRP' }, { status: 500 })
  }
}

async function fallbackTSP(
  origen: VrpPoint,
  paradas: VrpPoint[],
  vehiculos: VrpVehicle[],
  matrix: number[][]
) {
  // Group paradas by proximity (simple: assign all to first vehicle)
  const points = [origen, ...paradas]
  const tspResult = solveTSP(
    points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    0,
    matrix
  )

  const orderedParadas = tspResult.order
    .filter((i) => i !== 0) // exclude origin
    .map((i) => paradas[i - 1])

  // Save to RouteCache
  const hash = simpleHash(JSON.stringify(points.map((p) => `${p.lat},${p.lng}`)))
  const totalDist = matrix[0][tspResult.order[1]] + 
    tspResult.order.slice(1).reduce((sum, idx, i) => {
      if (i < tspResult.order.length - 2) {
        return sum + matrix[idx][tspResult.order[i + 2]]
      }
      return sum
    }, 0)

  // Async cache (don't block response)
  db.routeCache.upsert({
    where: { hash },
    create: {
      hash,
      origenLat: origen.lat,
      origenLng: origen.lng,
      destLat: paradas[paradas.length - 1]?.lat ?? origen.lat,
      destLng: paradas[paradas.length - 1]?.lng ?? origen.lng,
      distanciaKm: Math.round(totalDist * 100) / 100,
      duracionMin: Math.round((totalDist / 70) * 60),
      geometry: JSON.stringify(points.map((p) => [p.lat, p.lng])),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      distanciaKm: Math.round(totalDist * 100) / 100,
      duracionMin: Math.round((totalDist / 70) * 60),
    },
  }).catch(() => {})

  return {
    rutas: [{
      vehiculoId: vehiculos[0]?.id,
      paradas: orderedParadas.map((p, idx) => ({
        id: p.id,
        orden: idx + 1,
        lat: p.lat,
        lng: p.lng,
        demandaTubos: p.demandaTubos || 0,
      })),
      distanciaKm: Math.round(totalDist * 100) / 100,
    }],
    distanciaTotal: Math.round(totalDist * 100) / 100,
    duracionEstimada: Math.round((totalDist / 70) * 10) / 10,
  }
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `hash_${Math.abs(hash).toString(36)}`
}
