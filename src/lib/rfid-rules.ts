type EstadoCilindro =
  | 'LLENO' | 'VACIO' | 'EN_USO' | 'EN_CLIENTE'
  | 'EN_REPARTO' | 'EN_CARGA' | 'EN_DEPOSITO'
  | 'MANTENIMIENTO' | 'TRANSITO' | 'RETENIDO'
  | 'PH_VENCIDO' | 'BAJA' | 'EXTRAVIADO'

const ESTADOS_CARGA: EstadoCilindro[] = ['LLENO', 'VACIO', 'PH_VENCIDO', 'RETENIDO', 'MANTENIMIENTO']
const ESTADOS_DESPACHO: EstadoCilindro[] = ['LLENO']

type ReglaTransicion = {
  zona: string
  desde: EstadoCilindro[]
  hacia: EstadoCilindro
  auto: boolean // true = aplica automáticamente
}

const REGLAS: ReglaTransicion[] = [
  // Zona VACIOS: solo se aceptan cilindros vacíos o en devolución
  { zona: 'VACIOS', desde: ['VACIO', 'EN_USO', 'EN_CLIENTE'], hacia: 'VACIO', auto: true },
  { zona: 'VACIOS', desde: ['TRANSITO'], hacia: 'VACIO', auto: true },
  { zona: 'VACIOS', desde: ['EXTRAVIADO'], hacia: 'EXTRAVIADO', auto: false },

  // Zona LLENOS: almacena cilindros llenos listos para despacho
  { zona: 'LLENOS', desde: ['EN_CARGA', 'EN_DEPOSITO'], hacia: 'LLENO', auto: true },

  // SALIDA_REPARTO: cilindros que salen a reparto
  { zona: 'SALIDA_REPARTO', desde: ['LLENO'], hacia: 'EN_REPARTO', auto: true },

  // ENVIO_CARGA: cilindros que van a carga
  { zona: 'ENVIO_CARGA', desde: ['VACIO', 'PH_VENCIDO', 'MANTENIMIENTO'], hacia: 'EN_CARGA', auto: true },
  { zona: 'ENVIO_CARGA', desde: ['RETENIDO'], hacia: 'EN_CARGA', auto: true },

  // RECEPCION_CARGA: cilindros que vuelven de carga (llenado)
  { zona: 'RECEPCION_CARGA', desde: ['EN_CARGA'], hacia: 'EN_DEPOSITO', auto: false },

  // MANTENIMIENTO: ingreso a taller
  { zona: 'MANTENIMIENTO', desde: ['VACIO', 'PH_VENCIDO', 'RETENIDO'], hacia: 'MANTENIMIENTO', auto: true },
  { zona: 'MANTENIMIENTO', desde: ['EN_DEPOSITO'], hacia: 'MANTENIMIENTO', auto: true },

  // BAJA: descarte
  { zona: 'BAJA', desde: ['VACIO', 'PH_VENCIDO', 'MANTENIMIENTO'], hacia: 'BAJA', auto: false },
]

export function getTransicion(zonaTipo: string, estadoActual: EstadoCilindro): { estadoNuevo: EstadoCilindro | null; auto: boolean } {
  for (const r of REGLAS) {
    if (r.zona === zonaTipo && r.desde.includes(estadoActual)) {
      return { estadoNuevo: r.hacia, auto: r.auto }
    }
  }
  return { estadoNuevo: null, auto: false }
}

export function estadoValidoParaCarga(estado: EstadoCilindro): boolean {
  return ESTADOS_CARGA.includes(estado)
}

export function estadoValidoParaDespacho(estado: EstadoCilindro): boolean {
  return ESTADOS_DESPACHO.includes(estado)
}

export function getReglasPorZona() {
  const porZona: Record<string, { desde: string[]; hacia: string; auto: boolean }[]> = {}
  for (const r of REGLAS) {
    if (!porZona[r.zona]) porZona[r.zona] = []
    porZona[r.zona].push({ desde: r.desde, hacia: r.hacia, auto: r.auto })
  }
  return porZona
}
