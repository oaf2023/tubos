// OSRM routing client
// Flows: OSRM_LOCAL → OSRM_PUBLIC → HAVERSINE_ESTIMATED (fallback, no geometry)
// Each function returns typed RouteResult with isRealRoute flag

import { haversineKm } from '@/lib/haversine'
import { getOsrmBaseUrl, buildOsrmCoords } from '@/lib/routing-types'
import type { LatLng, RouteResult, RoutingSource } from '@/lib/routing-types'

interface OSRMTableResponse {
  code: string
  durations: number[][]
  distances: number[][]
  sources: { location: [number, number] }[]
  destinations: { location: [number, number] }[]
}

interface OSRMRouteResponse {
  code: string
  routes: {
    distance: number
    duration: number
    geometry: { coordinates: [number, number][] }
  }[]
  waypoints: { location: [number, number] }[]
}

// --- OSRM helpers ---

function osrmUrl(path: string): string {
  return `${getOsrmBaseUrl()}${path}`
}

function osrmToLeaflet(coords: [number, number][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng])
}

async function fetchOsrm(url: string, timeoutMs = 15000): Promise<Response | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    return res.ok ? res : null
  } catch {
    return null
  }
}

// --- Public API ---

// Distance/duration matrix from OSRM
export async function osrmTable(
  points: LatLng[]
): Promise<{ distances: number[][]; durations: number[][] } | null> {
  if (points.length < 2) return null
  const coords = buildOsrmCoords(points)
  const url = osrmUrl(`/table/v1/driving/${coords}?annotations=duration,distance`)

  const res = await fetchOsrm(url, 20000)
  if (!res) return null
  try {
    const data: OSRMTableResponse = await res.json()
    if (data.code !== 'Ok') return null
    return {
      distances: data.distances.map((r) => r.map((d) => Math.round(d / 10) / 100)),
      durations: data.durations.map((r) => r.map((d) => Math.round(d / 60))),
    }
  } catch {
    return null
  }
}

// Two-point route (used by ETA, deviation)
export async function osrmRoute(
  from: LatLng,
  to: LatLng
): Promise<RouteResult> {
  const coords = buildOsrmCoords([from, to])
  const url = osrmUrl(`/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`)

  const res = await fetchOsrm(url, 10000)
  if (res) {
    try {
      const data: OSRMRouteResponse = await res.json()
      if (data.code === 'Ok' && data.routes[0]) {
        const route = data.routes[0]
        const geometry = osrmToLeaflet(route.geometry.coordinates)
        return {
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMin: Math.round(route.duration / 60),
          geometry,
          source: getOsrmBaseUrl().includes('localhost') ? 'OSRM_LOCAL' : 'OSRM_PUBLIC',
          isRealRoute: true,
        }
      }
    } catch { /* fall through */ }
  }

  // Haversine fallback
  const distKm = haversineKm(from.lat, from.lng, to.lat, to.lng)
  return {
    distanceKm: Math.round(distKm * 10) / 10,
    durationMin: Math.round((distKm / 70) * 60),
    geometry: null,
    source: 'HAVERSINE_ESTIMATED',
    isRealRoute: false,
    error: 'No se pudo obtener geometría real de OSRM',
  }
}

// Multi-stop route with full geometry (origin → stops ... → origin)
export async function osrmTrip(
  points: LatLng[]
): Promise<RouteResult> {
  if (points.length < 2) {
    return {
      distanceKm: 0,
      durationMin: 0,
      geometry: null,
      source: 'NONE',
      isRealRoute: false,
      error: 'Se requieren al menos 2 puntos',
    }
  }

  const coords = buildOsrmCoords(points)
  const url = osrmUrl(`/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`)

  const res = await fetchOsrm(url, 20000)
  if (res) {
    try {
      const data: OSRMRouteResponse = await res.json()
      if (data.code === 'Ok' && data.routes[0]) {
        const route = data.routes[0]
        const geometry = osrmToLeaflet(route.geometry.coordinates)
        return {
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMin: Math.round(route.duration / 60),
          geometry,
          source: getOsrmBaseUrl().includes('localhost') ? 'OSRM_LOCAL' : 'OSRM_PUBLIC',
          isRealRoute: true,
        }
      }
    } catch { /* fall through */ }
  }

  // Haversine fallback
  let totalKm = 0
  for (let i = 0; i < points.length - 1; i++) {
    totalKm += haversineKm(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng)
  }
  return {
    distanceKm: Math.round(totalKm * 10) / 10,
    durationMin: Math.round((totalKm / 70) * 60),
    geometry: null,
    source: 'HAVERSINE_ESTIMATED',
    isRealRoute: false,
    error: 'No se pudo obtener geometría real de OSRM',
  }
}

// Detect if OSRM is reachable (used for health checks)
export async function osrmHealthCheck(): Promise<{
  reachable: boolean
  source: RoutingSource
  baseUrl: string
}> {
  const baseUrl = getOsrmBaseUrl()
  const endpoint = `${baseUrl}/route/v1/driving/-60.2244,-33.3293;-60.2260,-33.3301?overview=false`
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const source: RoutingSource = baseUrl.includes('localhost') ? 'OSRM_LOCAL' : 'OSRM_PUBLIC'
      return { reachable: true, source, baseUrl }
    }
  } catch { /* not reachable */ }
  return { reachable: false, source: 'NONE', baseUrl }
}
