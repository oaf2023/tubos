import { db } from './db'

export type Diagnostico =
  | 'OK'
  | 'NO_REGISTRADO'
  | 'SIN_TAG'
  | 'INCONSISTENCIA_PESO'
  | 'PH_VENCIDO'
  | 'FALTA_FOTO'
  | 'RECHAZADO'

export type ResultadoValidacion = {
  cylinderId: string | null
  numeroSerie: string | null
  gasCodigo: string | null
  estadoActual: string | null
  estadoSugerido: string | null
  diagnostico: Diagnostico
  pesoRealKg: number | null
  pesoEsperadoKg: number | null
  phVigente: boolean | null
  phObservacion: string | null
  fotoTomada: boolean
  alertas: string[]
  accion: 'PERMITIR' | 'REVISAR' | 'RECHAZAR'
}

type DatosValidacion = {
  cabinaId: string
  tid?: string
  pesoKg?: number
  fotoBase64?: string
  phValido?: boolean
  phObservacion?: string
}

export async function validarCilindro(datos: DatosValidacion): Promise<ResultadoValidacion> {
  const alertas: string[] = []
  let diagnostico: Diagnostico = 'OK'
  let accion: 'PERMITIR' | 'REVISAR' | 'RECHAZAR' = 'PERMITIR'

  if (!datos.tid) {
    return {
      cylinderId: null, numeroSerie: null, gasCodigo: null,
      estadoActual: null, estadoSugerido: null,
      diagnostico: 'SIN_TAG', pesoRealKg: null, pesoEsperadoKg: null,
      phVigente: null, phObservacion: null, fotoTomada: false,
      alertas: ['No se detectó tag RFID'], accion: 'RECHAZAR',
    }
  }

  const tag = await db.tagRFID.findUnique({
    where: { tid: datos.tid },
    include: { cylinder: { include: { gas: true } } },
  })

  if (!tag || !tag.activo) {
    return {
      cylinderId: null, numeroSerie: null, gasCodigo: null,
      estadoActual: null, estadoSugerido: null,
      diagnostico: 'NO_REGISTRADO', pesoRealKg: null, pesoEsperadoKg: null,
      phVigente: null, phObservacion: null, fotoTomada: false,
      alertas: [`Tag ${datos.tid} no registrado o inactivo`], accion: 'RECHAZAR',
    }
  }

  if (!tag.cylinder) {
    return {
      cylinderId: tag.cylinderId, numeroSerie: null, gasCodigo: null,
      estadoActual: null, estadoSugerido: null,
      diagnostico: 'NO_REGISTRADO', pesoRealKg: null, pesoEsperadoKg: null,
      phVigente: null, phObservacion: null, fotoTomada: false,
      alertas: ['Tag no asociado a ningún cilindro'], accion: 'RECHAZAR',
    }
  }

  const cylinder = tag.cylinder
  const gas = cylinder.gas
  let pesoRealKg = datos.pesoKg || null
  let pesoEsperadoKg: number | null = null
  let phVigente: boolean | null = datos.phValido ?? null
  let phObservacion = datos.phObservacion || null

  // --- Validación PH ---
  const phOk = cylinder.fechaProximoRetest
    ? new Date(cylinder.fechaProximoRetest) > new Date()
    : true

  if (phOk !== null && !phOk) {
    diagnostico = 'PH_VENCIDO'
    phVigente = false
    phObservacion = phObservacion || `PH vencido desde ${cylinder.fechaProximoRetest?.toLocaleDateString()}`
    alertas.push(phObservacion)
    accion = 'REVISAR'
  }

  if (datos.phValido === false) {
    phVigente = false
    phObservacion = datos.phObservacion || 'PH marcado como no vigente por operador'
    alertas.push(phObservacion)
    diagnostico = 'PH_VENCIDO'
    accion = 'REVISAR'
  }

  // --- Validación Peso ---
  if (pesoRealKg) {
    const regla = await db.reglaPeso.findUnique({ where: { gasId: gas.id } })
    if (regla) {
      pesoEsperadoKg = regla.pesoLlenoKg || regla.pesoMaxKg || null

      if (cylinder.estado === 'LLENO' && regla.pesoLlenoKg) {
        const diff = Math.abs(pesoRealKg - regla.pesoLlenoKg)
        const diffPercent = (diff / regla.pesoLlenoKg) * 100
        if (diffPercent > 10) {
          diagnostico = diagnostico === 'OK' ? 'INCONSISTENCIA_PESO' : diagnostico
          alertas.push(`Peso inconsistent: ${pesoRealKg}kg vs esperado ${regla.pesoLlenoKg}kg (${diffPercent.toFixed(1)}%)`)
          accion = 'REVISAR'
        }
      }

      if (regla.pesoMinKg && pesoRealKg < regla.pesoMinKg) {
        diagnostico = diagnostico === 'OK' ? 'INCONSISTENCIA_PESO' : diagnostico
        alertas.push(`Peso ${pesoRealKg}kg por debajo del mínimo ${regla.pesoMinKg}kg`)
        accion = 'REVISAR'
      }
    }
  }

  // --- Validación Foto ---
  const fotoTomada = !!datos.fotoBase64
  if (!fotoTomada && accion !== 'RECHAZAR') {
    diagnostico = diagnostico === 'OK' ? 'FALTA_FOTO' : diagnostico
    alertas.push('No se tomó foto de evidencia')
    accion = 'REVISAR'
  }

  // --- Acción final ---
  if (alertas.length >= 3 || diagnostico === 'NO_REGISTRADO' || diagnostico === 'SIN_TAG') {
    accion = 'RECHAZAR'
  }

  // --- Estado sugerido ---
  let estadoSugerido: string | null = null
  if (cylinder.estado === 'EN_CARGA' && diagnostico === 'OK') {
    estadoSugerido = 'LLENO'
  }
  if (cylinder.estado === 'LLENO' && (diagnostico === 'INCONSISTENCIA_PESO' || diagnostico === 'PH_VENCIDO')) {
    estadoSugerido = 'RETENIDO'
  }
  if (diagnostico === 'PH_VENCIDO' && accion !== 'RECHAZAR') {
    estadoSugerido = 'PH_VENCIDO'
  }

  return {
    cylinderId: cylinder.id,
    numeroSerie: cylinder.numeroSerie,
    gasCodigo: gas.codigo,
    estadoActual: cylinder.estado,
    estadoSugerido,
    diagnostico,
    pesoRealKg,
    pesoEsperadoKg,
    phVigente,
    phObservacion,
    fotoTomada,
    alertas,
    accion,
  }
}
