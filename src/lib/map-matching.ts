// Map matching: corrige puntos GPS a la red vial usando OSRM /match
// Útil para limpiar coordenadas GPS ruidosas antes de calcular ETA

const OSRM_MATCH_URL = 'https://router.project-osrm.org/match/v1/driving'

export type MatchedPoint = {
  lat: number
  lng: number
  originalLat: number
  originalLng: number
  confidence: number // 0-1 qué tan probable es que el match sea correcto
}

export async function matchToRoad(
  points: { lat: number; lng: number }[]
): Promise<MatchedPoint[] | null> {
  if (points.length === 0) return null
  if (points.length === 1) {
    // Single point: use /nearest instead
    return matchSinglePoint(points[0])
  }

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_MATCH_URL}/${coords}?radiuses=${points.map(() => '25').join(';')}&overview=false`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.matchings?.length) return null

    const matched = data.matchings[0]
    if (!matched?.geometry?.coordinates) return null

    return matched.geometry.coordinates.map(
      (coord: [number, number], i: number) => ({
        lat: coord[1],
        lng: coord[0],
        originalLat: points[i]?.lat ?? coord[1],
        originalLng: points[i]?.lng ?? coord[0],
        confidence: matched.confidence ?? 0.5,
      })
    )
  } catch {
    return null
  }
}

async function matchSinglePoint(
  point: { lat: number; lng: number }
): Promise<MatchedPoint[] | null> {
  const url = `https://router.project-osrm.org/nearest/v1/driving/${point.lng},${point.lat}?number=1`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.waypoints?.length) return null

    const wp = data.waypoints[0]
    return [
      {
        lat: wp.location[1],
        lng: wp.location[0],
        originalLat: point.lat,
        originalLng: point.lng,
        confidence: 0.8,
      },
    ]
  } catch {
    return null
  }
}

// Calcula la distancia en metros entre el punto GPS crudo y el corregido
export function gpsErrorMeters(
  original: { lat: number; lng: number },
  matched: { lat: number; lng: number }
): number {
  const R = 6371000
  const dLat = ((matched.lat - original.lat) * Math.PI) / 180
  const dLng = ((matched.lng - original.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((original.lat * Math.PI) / 180) *
      Math.cos((matched.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
