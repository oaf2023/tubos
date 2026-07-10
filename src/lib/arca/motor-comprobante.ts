import { ARCA_TIPOS_COMPROBANTE, type CondicionIvaEmisor, type CondicionIvaReceptor } from './catalogos'

const MAPA_CONDICION_EMISOR: Record<string, CondicionIvaEmisor> = {
  'resp.inscripto': 'Resp.Inscripto',
  'ri': 'Resp.Inscripto',
  'responsable inscripto': 'Resp.Inscripto',
  'sueto.exento': 'Sueto.Exento',
  'sujeto exento': 'Sueto.Exento',
  'exento': 'Sueto.Exento',
  'monotributo': 'MonoTributo',
  'mono': 'MonoTributo',
  'no responsable': 'NoResponsable',
}

const MAPA_CONDICION_RECEPTOR: Record<string, CondicionIvaReceptor> = {
  'resp.inscripto': 'Resp.Inscripto',
  'ri': 'Resp.Inscripto',
  'responsable inscripto': 'Resp.Inscripto',
  'sueto.exento': 'Sueto.Exento',
  'sujeto exento': 'Sueto.Exento',
  'exento': 'Sueto.Exento',
  'monotributo': 'MonoTributo',
  'mono': 'MonoTributo',
  'consumidor final': 'Consumidor Final',
  'cf': 'Consumidor Final',
  'no responsable': 'NoResponsable',
  'exterior': 'Exterior',
}

function normalizarCondicion(valor: string | null | undefined, mapa: Record<string, string>): string | null {
  if (!valor) return null
  const key = valor.toLowerCase().trim()
  return mapa[key] || null
}

function normalizarEmisor(valor: string | null | undefined): CondicionIvaEmisor | null {
  return normalizarCondicion(valor, MAPA_CONDICION_EMISOR) as CondicionIvaEmisor | null
}

function normalizarReceptor(valor: string | null | undefined): CondicionIvaReceptor | null {
  return normalizarCondicion(valor, MAPA_CONDICION_RECEPTOR) as CondicionIvaReceptor | null
}

interface OpcionComprobante {
  key: string
  label: string
  tipoDocumento: string
  letra: string
  codigoARCA: number
}

const REGLAS: Array<{ emisor: CondicionIvaEmisor; receptor: CondicionIvaReceptor | 'any'; resultado: string }> = [
  { emisor: 'Resp.Inscripto', receptor: 'Resp.Inscripto', resultado: 'FACTURA_A' },
  { emisor: 'Resp.Inscripto', receptor: 'Sueto.Exento', resultado: 'FACTURA_B' },
  { emisor: 'Resp.Inscripto', receptor: 'MonoTributo', resultado: 'FACTURA_B' },
  { emisor: 'Resp.Inscripto', receptor: 'Consumidor Final', resultado: 'FACTURA_B' },
  { emisor: 'Resp.Inscripto', receptor: 'NoResponsable', resultado: 'FACTURA_B' },
  { emisor: 'Resp.Inscripto', receptor: 'Exterior', resultado: 'FACTURA_E' },
  { emisor: 'Resp.Inscripto', receptor: 'any', resultado: 'FACTURA_B' },
  { emisor: 'Sueto.Exento', receptor: 'any', resultado: 'FACTURA_C' },
  { emisor: 'MonoTributo', receptor: 'any', resultado: 'FACTURA_C' },
  { emisor: 'NoResponsable', receptor: 'any', resultado: 'FACTURA_C' },
]

export function sugerirComprobante(
  emisorCondicionIva: string | null | undefined,
  receptorCondicionIva: string | null | undefined
): OpcionComprobante | null {
  const emisor = normalizarEmisor(emisorCondicionIva)
  const receptor = normalizarReceptor(receptorCondicionIva)

  if (!emisor) return null

  let match = REGLAS.find(r => r.emisor === emisor && r.receptor === (receptor || 'any'))
  if (!match && receptor) {
    match = REGLAS.find(r => r.emisor === emisor && (r.receptor === receptor))
  }
  if (!match) {
    match = REGLAS.find(r => r.emisor === emisor && r.receptor === 'any')
  }
  if (!match) return null

  const tipo = ARCA_TIPOS_COMPROBANTE[match.resultado]
  if (!tipo) return null

  return {
    key: match.resultado,
    label: tipo.descripcion,
    tipoDocumento: tipo.tipoDocumento,
    letra: tipo.letra,
    codigoARCA: tipo.codigo,
  }
}

export function opcionesValidasParaReceptor(
  emisorCondicionIva: string | null | undefined,
  receptorCondicionIva: string | null | undefined
): OpcionComprobante[] {
  const sugerido = sugerirComprobante(emisorCondicionIva, receptorCondicionIva)
  if (sugerido) return [sugerido]

  const emisor = normalizarEmisor(emisorCondicionIva)
  if (!emisor) {
    return Object.entries(ARCA_TIPOS_COMPROBANTE)
      .filter(([, t]) => t.tipoDocumento === 'FACTURA' || t.tipoDocumento === 'NOTA_CREDITO')
      .map(([key, t]) => ({ key, label: t.descripcion, tipoDocumento: t.tipoDocumento, letra: t.letra, codigoARCA: t.codigo }))
  }

  return REGLAS
    .filter(r => r.emisor === emisor)
    .map(r => {
      const t = ARCA_TIPOS_COMPROBANTE[r.resultado]
      return t ? { key: r.resultado, label: t.descripcion, tipoDocumento: t.tipoDocumento, letra: t.letra, codigoARCA: t.codigo } : null
    })
    .filter((x): x is OpcionComprobante => x !== null)
}

export function getCodigoARCA(tipoDocumento: string, letra: string): number {
  const key = `${tipoDocumento}_${letra}`
  return ARCA_TIPOS_COMPROBANTE[key]?.codigo || 0
}
