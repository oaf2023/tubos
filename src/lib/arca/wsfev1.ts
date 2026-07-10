export interface ArcaSolicitudCAE {
  comprobante: {
    tipoDocumento: string
    letra: string
    puntoVenta: number
    numero: number
    fecha: string
    cuitEmisor: number
    cuitReceptor: number | null
    tipoDocReceptor: number
    nroDocReceptor: number
    importeNeto: number
    importeIva: number
    importeTotal: number
    moneda: string
    tipoCambio: number
    alicuotas: Array<{ id: number; baseImponible: number; importe: number }>
    exento: number
  }
}

export interface ArcaRespuestaCAE {
  resultado: 'A' | 'R' | 'O'
  cae: string | null
  caeVencimiento: string | null
  observaciones: string[]
  errors: string[]
}

interface UltimoAutorizado {
  puntoVenta: number
  tipoComprobante: number
  ultimoNumero: number
}

let ultimosAutorizados: UltimoAutorizado[] = []

export function setUltimoAutorizadoMock(puntoVenta: number, tipoComprobante: number, numero: number): void {
  const idx = ultimosAutorizados.findIndex(u => u.puntoVenta === puntoVenta && u.tipoComprobante === tipoComprobante)
  if (idx >= 0) {
    ultimosAutorizados[idx].ultimoNumero = numero
  } else {
    ultimosAutorizados.push({ puntoVenta, tipoComprobante, ultimoNumero: numero })
  }
}

function generarCaeMock(): string {
  const anio = new Date().getFullYear()
  const mes = String(new Date().getMonth() + 1).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 90000000) + 10000000)
  return `${anio}${mes}${random}`
}

function generarVencimientoMock(): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 15)
  return fecha.toISOString().slice(0, 10)
}

async function modoArca(): Promise<string> {
  const { db } = await import('@/lib/db')
  const cfg = await db.configuracionFiscal.findUnique({ where: { id: 'default' } })
  return cfg?.modoArca || 'MANUAL'
}

export async function fecaeSolicitar(solicitud: ArcaSolicitudCAE): Promise<ArcaRespuestaCAE> {
  const modo = await modoArca()

  if (modo === 'MANUAL') {
    return {
      resultado: 'O',
      cae: null,
      caeVencimiento: null,
      observaciones: ['MODO_MANUAL: El sistema está en modo manual. Configure ARCA en Tablas > Comprobantes > Configuración.'],
      errors: ['Modo manual activo: no se puede solicitar CAE automáticamente'],
    }
  }

  if (modo === 'MOCK') {
    const cae = generarCaeMock()
    const vencimiento = generarVencimientoMock()
    return {
      resultado: 'A',
      cae,
      caeVencimiento: vencimiento,
      observaciones: ['MOCK: CAE generado en modo simulación'],
      errors: [],
    }
  }

  if (modo === 'HOMOLOGACION') {
    return {
      resultado: 'O',
      cae: null,
      caeVencimiento: null,
      observaciones: ['HOMOLOGACION: Falta configuración de certificado X.509 para conectar con ARCA'],
      errors: ['Módulo WSAA/WSFEv1 no conectado al entorno de homologación'],
    }
  }

  return {
    resultado: 'O',
    cae: null,
    caeVencimiento: null,
    observaciones: [],
    errors: ['Modo ARCA no reconocido'],
  }
}

export async function feCompUltimoAutorizado(puntoVenta: number, tipoComprobante: number): Promise<number> {
  const ua = ultimosAutorizados.find(u => u.puntoVenta === puntoVenta && u.tipoComprobante === tipoComprobante)
  return ua?.ultimoNumero ?? 0
}

export async function fecaeConsultar(cae: string): Promise<ArcaRespuestaCAE> {
  return {
    resultado: 'A',
    cae,
    caeVencimiento: generarVencimientoMock(),
    observaciones: ['MOCK: Consulta de CAE simulada'],
    errors: [],
  }
}
