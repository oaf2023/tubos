import { db } from '@/lib/db'

type CapacidadResult = {
  valida: boolean
  maxTubos: number | null
  totalCilindros: number
  pesoTotalKg: number
  pesoMaximoKg?: number
  volumenTotalM3: number
  volumenMaximoM3?: number
  observaciones: string[]
}

// Calcula cuántos cilindros caben en un vehículo según dimensiones de caja
async function capacidadVehiculo(vehicleId: string): Promise<{
  maxTubos: number | null
  pesoMaximoKg?: number
}> {
  const v = await db.vehiculo.findUnique({ where: { id: vehicleId } })
  if (!v) return { maxTubos: null }
  return {
    maxTubos: v.maxTubos,
    pesoMaximoKg: v.maxTubos && v.maxTubos > 0
      ? v.maxTubos * 65 // estimado: cada tubo lleno ~65kg promedio
      : undefined,
  }
  }
}

// Valida que los cilindros quepan en el vehículo
export async function validarCapacidadCarga(
  vehicleId: string,
  cylinderIds: string[]
): Promise<CapacidadResult> {
  const cap = await capacidadVehiculo(vehicleId)
  const observaciones: string[] = []

  const cilindros = await db.cylinder.findMany({
    where: { id: { in: cylinderIds } },
    include: { gas: true },
  })

  const totalCilindros = cilindros.length
  const pesoTotalKg = cilindros.reduce((s, c) => s + (c.pesoTaraKg || 0) + (c.pesoMaxLlenadoKg || 0), 0)

  // Validación por cantidad de tubos
  if (cap.maxTubos && totalCilindros > cap.maxTubos) {
    observaciones.push(`Excede capacidad: ${totalCilindros} tubos (máx ${cap.maxTubos})`)
  }

  // Validación por dimensiones de caja
  const v = await db.vehiculo.findUnique({ where: { id: vehicleId } })
  if (v?.largoCajaCm && v?.anchoCajaCm && cilindros.length > 0) {
    const diametroProm = cilindros.reduce((s, c) => s + (c.diametroMm || 200), 0) / cilindros.length / 100
    const altoProm = (v.altoCajaCm || 160) / 100
    const areaBase = (v.largoCajaCm / 100) * (v.anchoCajaCm / 100)
    const areaCilindro = Math.PI * (diametroProm / 2) ** 2 * 0.75 // 75% eficiencia de empaque
    const maxEstimado = v.orientacionTubos === 'ACOSTADOS'
      ? Math.floor(areaBase / (altoProm * diametroProm)) * Math.floor((v.altoCajaCm || 160) / (diametroProm * 100))
      : Math.floor(areaBase / areaCilindro)
    if (totalCilindros > maxEstimado) {
      observaciones.push(`Excede estimación por dimensiones: ${totalCilindros} (est. ${maxEstimado})`)
    }
  }

  // Validación por peso
  const pesoMax = cap.pesoMaximoKg
  if (pesoMax && pesoTotalKg > pesoMax) {
    observaciones.push(`Excede peso estimado: ${pesoTotalKg.toFixed(0)} kg (máx ${pesoMax} kg)`)
  }

  return {
    valida: observaciones.length === 0,
    maxTubos: cap.maxTubos,
    totalCilindros,
    pesoTotalKg: Math.round(pesoTotalKg * 100) / 100,
    pesoMaximoKg: pesoMax,
    volumenTotalM3: 0,
    observaciones,
  }
}

// Calcula costo estimado de la ruta
export function calcularCostoRuta(distanciaKm: number, costoPorKm: number): {
  costoTotal: number
  costoPorKm: number
} {
  return {
    costoPorKm,
    costoTotal: Math.round(distanciaKm * costoPorKm * 100) / 100,
  }
}
