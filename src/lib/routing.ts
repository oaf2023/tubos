// OSRM client for route distances, matrices, and geometry
// Uses public OSRM API at https://router.project-osrm.org/ (free, no key)

const OSRM_BASE = 'https://router.project-osrm.org'

interface OSRSources {
  query: [number, number][]
}

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
    distance: number // meters
    duration: number // seconds
    geometry: { coordinates: [number, number][] }
  }[]
  waypoints: { location: [number, number] }[]
}

// Fetch a distance/duration matrix from OSRM
export async function osrmTable(
  points: { lat: number; lng: number }[]
): Promise<{ distances: number[][]; durations: number[][] } | null> {
  if (points.length < 2) return null
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_BASE}/table/v1/driving/${coords}?annotations=duration,distance`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    const data: OSRMTableResponse = await res.json()
    if (data.code !== 'Ok') return null
    return {
      distances: data.distances.map((r) => r.map((d) => Math.round(d / 10) / 100)), // m -> km, 2 decimals
      durations: data.durations.map((r) => r.map((d) => Math.round(d / 60))), // s -> min
    }
  } catch {
    return null
  }
}

// Fetch the full route geometry between two points
export async function osrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMin: number; geometry: [number, number][] } | null> {
  const url = `${OSRM_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data: OSRMRouteResponse = await res.json()
    if (data.code !== 'Ok' || !data.routes[0]) return null
    const route = data.routes[0]
    const coords = route.geometry.coordinates.map(
      (c) => [c[1], c[0]] as [number, number]
    )
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      geometry: coords,
    }
  } catch {
    return null
  }
}

// Fetch a multi-stop route with full geometry (origin -> stops -> origin)
export async function osrmTrip(
  points: { lat: number; lng: number }[]
): Promise<{ distanceKm: number; durationMin: number; geometry: [number, number][] } | null> {
  if (points.length < 2) return null
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    const data: OSRMRouteResponse = await res.json()
    if (data.code !== 'Ok' || !data.routes[0]) return null
    const route = data.routes[0]
    const coordsGeo = route.geometry.coordinates.map(
      (c) => [c[1], c[0]] as [number, number]
    )
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      geometry: coordsGeo,
    }
  } catch {
    return null
  }
}
