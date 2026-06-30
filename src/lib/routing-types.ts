// Routing types — centralized type definitions for route optimization and geometry

export interface LatLng {
  lat: number
  lng: number
}

export interface NamedPoint extends LatLng {
  id: string
  nombre?: string
}

export interface RouteResult {
  distanceKm: number
  durationMin: number
  geometry: [number, number][] | null
  source: RoutingSource
  isRealRoute: boolean
  error?: string | null
}

export type RoutingSource = 'OSRM_LOCAL' | 'OSRM_PUBLIC' | 'HAVERSINE_ESTIMATED' | 'NONE'

export type OptimizationEngine = 'OR_TOOLS' | 'TSP' | 'NONE'

export interface OptimizeResult {
  optimized: NamedPoint[]
  distanceTotal: number
  durationMin: number
  geometry: [number, number][] | null
  isRealRoute: boolean
  routingSource: RoutingSource
  optimizationEngine: OptimizationEngine
  warning?: string | null
}

export interface RouteMetadata {
  geometry: string | null
  distanciaKm: number
  duracionHoras: number
  routingSource: RoutingSource
  isRealRoute: boolean
  optimizationEngine: OptimizationEngine
  calculatedAt: string
}

// Transform OSRM [lng, lat] to Leaflet [lat, lng]
export function osrmToLeaflet(coords: [number, number][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng])
}

// Build the full coordinate string for OSRM API: lng,lat;lng,lat;...
export function buildOsrmCoords(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(';')
}

// Get OSRM base URL from env, with fallback to public
export function getOsrmBaseUrl(): string {
  return process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'
}
