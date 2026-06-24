// Traveling Salesman Problem solver
// Nearest-neighbor heuristic + 2-opt local search improvement

export interface TSPPoint {
  id: string
  lat: number
  lng: number
  nombre?: string
}

// Build distance matrix from coordinates (Haversine)
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

function buildMatrix(points: TSPPoint[]): number[][] {
  const n = points.length
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
      m[i][j] = d
      m[j][i] = d
    }
  }
  return m
}

// Replace matrix with provided real distances (from OSRM)
function buildRealMatrix(realDistances: number[][] | null, n: number): number[][] | null {
  if (!realDistances || realDistances.length < n) return null
  return realDistances
}

// Nearest-neighbor heuristic: start from origin, always go to closest unvisited
function nearestNeighbor(dist: number[][], startIdx: number): number[] {
  const n = dist.length
  const visited = new Set<number>([startIdx])
  const order = [startIdx]
  let current = startIdx

  while (visited.size < n) {
    let best = -1
    let bestDist = Infinity
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue
      if (dist[current][j] < bestDist) {
        bestDist = dist[current][j]
        best = j
      }
    }
    if (best === -1) break
    visited.add(best)
    order.push(best)
    current = best
  }

  return order
}

// 2-opt local search improvement
function twoOpt(dist: number[][], order: number[]): number[] {
  const n = order.length
  let improved = true
  let best = order

  while (improved) {
    improved = false
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        // Try swapping segment [i, j]
        const newOrder = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ]
        const currentDist = totalDistance(dist, best)
        const newDist = totalDistance(dist, newOrder)
        if (newDist < currentDist - 0.001) {
          best = newOrder
          improved = true
        }
      }
    }
  }

  return best
}

function totalDistance(dist: number[][], order: number[]): number {
  let total = 0
  for (let i = 0; i < order.length - 1; i++) {
    total += dist[order[i]][order[i + 1]]
  }
  return total
}

// Main TSP solver: returns optimized order indices
export function solveTSP(
  points: TSPPoint[],
  startIndex: number = 0,
  realDistances?: number[][] | null
): { order: number[]; distance: number } {
  if (points.length <= 2) {
    return {
      order: points.map((_, i) => i),
      distance: points.length === 2 ? haversineKm(points[0].lat, points[0].lng, points[1].lat, points[1].lng) : 0,
    }
  }

  const dist = buildRealMatrix(realDistances, points.length) ?? buildMatrix(points)

  // Nearest-neighbor starting from startIndex
  let order = nearestNeighbor(dist, startIndex)

  // 2-opt improvement
  order = twoOpt(dist, order)

  const distance = totalDistance(dist, order)

  return { order, distance }
}
