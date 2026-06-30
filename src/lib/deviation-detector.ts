// Deviation detector: monitorea si el vehículo se desvía de la ruta planificada
// o si la demora supera el umbral configurable

import { osrmRoute } from '@/lib/routing'
import { haversineKm } from '@/lib/haversine'

export type DeviationResult = {
  desviado: boolean
  motivo: string | null
  demoraMin: number
  distanciaFueraDeRutaKm: number
  sugerencia: 'RECALCULAR' | 'ESPERAR' | 'IGNORAR' | null
}

const UMBRAL_DEMORA_MIN = 15 // minutos de demora para considerar desvío
const UMBRAL_FUERA_RUTA_KM = 0.5 // km fuera de la ruta planificada

// Verifica si la posición actual está desviada de la ruta planificada
export async function detectarDesvio(
  posicionActual: { lat: number; lng: number },
  paradaActual: { lat: number; lng: number } | null,
  paradaSiguiente: { lat: number; lng: number } | null,
  tiempoTranscurridoMin: number,
  tiempoEstimadoOriginalMin: number
): Promise<DeviationResult> {
  const motivos: string[] = []
  let demoraMin = 0
  let distanciaFueraKm = 0

  // 1. Verificar demora
  if (tiempoEstimadoOriginalMin > 0) {
    demoraMin = Math.max(0, tiempoTranscurridoMin - tiempoEstimadoOriginalMin)
    if (demoraMin >= UMBRAL_DEMORA_MIN) {
      motivos.push(`Demora superior a ${UMBRAL_DEMORA_MIN} min (${demoraMin} min)`)
    }
  }

  // 2. Verificar si está fuera de ruta (lejos de la parada siguiente)
  if (paradaSiguiente) {
    const osrm = await osrmRoute(posicionActual, paradaSiguiente)
    if (osrm) {
      // Estimar distancia esperada desde parada anterior a siguiente
      distanciaFueraKm = osrm.distanceKm
    } else {
      distanciaFueraKm = haversineKm(
        posicionActual.lat,
        posicionActual.lng,
        paradaSiguiente.lat,
        paradaSiguiente.lng
      )
    }
  }

  // 3. Verificar si está cerca de la parada actual (debería estar ahí)
  if (paradaActual) {
    const distActual = haversineKm(
      posicionActual.lat,
      posicionActual.lng,
      paradaActual.lat,
      paradaActual.lng
    )
    if (distActual > UMBRAL_FUERA_RUTA_KM) {
      // Si la parada actual ya debería estar completada pero el vehículo no está cerca
      motivos.push(`Fuera de ruta: ${distActual.toFixed(2)} km de la parada actual`)
    }
  }

  const desviado = motivos.length > 0
  let sugerencia: DeviationResult['sugerencia'] = null
  if (desviado) {
    sugerencia = demoraMin >= UMBRAL_DEMORA_MIN ? 'RECALCULAR' : 'ESPERAR'
  }

  return {
    desviado,
    motivo: motivos.length > 0 ? motivos.join('; ') : null,
    demoraMin: Math.round(demoraMin),
    distanciaFueraDeRutaKm: Math.round(distanciaFueraKm * 100) / 100,
    sugerencia,
  }
}

// Devuelve la distancia desde la posición actual al punto más cercano en la geometría de ruta
export function distanciaARutaKm(
  posicion: { lat: number; lng: number },
  geometry: [number, number][]
): number {
  if (geometry.length === 0) return Infinity

  let minDist = Infinity
  for (const punto of geometry) {
    const d = haversineKm(posicion.lat, posicion.lng, punto[0], punto[1])
    if (d < minDist) minDist = d
  }
  return Math.round(minDist * 100) / 100
}
