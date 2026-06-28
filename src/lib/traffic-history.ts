// Traffic history: almacena y consulta velocidades históricas por segmento
// Para mejorar estimaciones futuras con datos reales de flota

import { db } from '@/lib/db'

export type TrafficFactor = {
  hora: number
  diaSemana: number
  factor: number
  muestras: number
}

// Almacena una observación de velocidad en un segmento
export async function registrarVelocidad(
  tramoHash: string,
  origenLat: number,
  origenLng: number,
  destLat: number,
  destLng: number,
  velocidadKmh: number,
  hora: number = new Date().getHours(),
  diaSemana: number = new Date().getDay()
): Promise<void> {
  const existing = await db.trafficHistory.findUnique({
    where: { tramoHash_hora_diaSemana: { tramoHash, hora, diaSemana } },
  })

  if (existing) {
    const nuevoPromedio =
      (existing.velocidad * existing.muestras + velocidadKmh) /
      (existing.muestras + 1)
    await db.trafficHistory.update({
      where: { id: existing.id },
      data: {
        velocidad: Math.round(nuevoPromedio * 100) / 100,
        muestras: existing.muestras + 1,
      },
    })
  } else {
    await db.trafficHistory.create({
      data: {
        tramoHash,
        origenLat,
        origenLng,
        destLat,
        destLng,
        hora,
        diaSemana,
        velocidad: velocidadKmh,
      },
    })
  }
}

// Obtiene el factor de tráfico para un tramo en una hora/día específicos
export async function getTrafficFactor(
  tramoHash: string,
  hora: number,
  diaSemana: number
): Promise<TrafficFactor | null> {
  const row = await db.trafficHistory.findUnique({
    where: { tramoHash_hora_diaSemana: { tramoHash, hora, diaSemana } },
  })

  if (!row) return null

  const velocidadBase = 70
  const factor = velocidadBase / (row.velocidad || velocidadBase)

  return {
    hora: row.hora,
    diaSemana: row.diaSemana,
    factor: Math.round(factor * 100) / 100,
    muestras: row.muestras,
  }
}

// Genera hash para un tramo (origen-destino)
export function tramoHash(
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number }
): string {
  const oLat = origen.lat.toFixed(5)
  const oLng = origen.lng.toFixed(5)
  const dLat = destino.lat.toFixed(5)
  const dLng = destino.lng.toFixed(5)
  return `${oLat},${oLng}|${dLat},${dLng}`
}

// Aplica factores históricos a una matriz de distancias
export async function aplicarFactoresTrafico(
  matrix: number[][],
  points: { lat: number; lng: number }[],
  hora: number,
  diaSemana: number
): Promise<{ matrixAjustada: number[][]; factores: Record<string, number> }> {
  const factores: Record<string, number> = {}

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (i === j) continue
      const hash = tramoHash(points[i], points[j])
      const tf = await getTrafficFactor(hash, hora, diaSemana)
      if (tf && tf.muestras >= 3) {
        factores[`${i}->${j}`] = tf.factor
        matrix[i][j] = Math.round(matrix[i][j] * tf.factor * 100) / 100
      }
    }
  }

  return { matrixAjustada: matrix, factores }
}
