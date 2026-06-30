// ETA calculation engine
// Calcula tiempo estimado de llegada usando OSRM + posición actual + paradas restantes

import { osrmRoute } from '@/lib/routing'
import { haversineKm } from '@/lib/haversine'

export type ETAResult = {
  paradaId: string
  paradaNombre: string
  distanciaKm: number
  duracionMin: number
  eta: Date
  velocidadMediaKmh: number
  fuente: 'osrm' | 'haversine'
}

// Calcula ETA para todas las paradas restantes desde la posición actual
export async function calcularETA(
  posicionActual: { lat: number; lng: number },
  paradasRestantes: { id: string; nombre: string; lat: number; lng: number }[],
  horaSalida: Date = new Date()
): Promise<ETAResult[]> {
  const resultados: ETAResult[] = []
  let currentPos = { ...posicionActual }
  let currentTime = new Date(horaSalida)

  for (const parada of paradasRestantes) {
    const osrm = await osrmRoute(currentPos, { lat: parada.lat, lng: parada.lng })

    let distanciaKm: number
    let duracionMin: number
    let fuente: 'osrm' | 'haversine'

    if (osrm) {
      distanciaKm = osrm.distanceKm
      duracionMin = osrm.durationMin
      fuente = 'osrm'
    } else {
      distanciaKm = haversineKm(currentPos.lat, currentPos.lng, parada.lat, parada.lng)
      duracionMin = Math.round((distanciaKm / 70) * 60)
      fuente = 'haversine'
    }

    const eta = new Date(currentTime.getTime() + duracionMin * 60 * 1000)
    const velocidadMedia = duracionMin > 0 ? Math.round((distanciaKm / duracionMin) * 60) : 0

    resultados.push({
      paradaId: parada.id,
      paradaNombre: parada.nombre,
      distanciaKm: Math.round(distanciaKm * 10) / 10,
      duracionMin,
      eta,
      velocidadMediaKmh: velocidadMedia,
      fuente,
    })

    // Actualizar posición y tiempo para próxima parada
    currentPos = { lat: parada.lat, lng: parada.lng }
    currentTime = eta
  }

  return resultados
}

// Calcula diferencia entre ETA actual y planificada
export function calcularDesvioMin(
  etaReal: Date,
  etaPlanificada: Date | null
): number | null {
  if (!etaPlanificada) return null
  return Math.round((etaReal.getTime() - etaPlanificada.getTime()) / 60000)
}
