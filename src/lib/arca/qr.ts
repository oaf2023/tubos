import { getCodigoDocumentoARCA } from './catalogos'

export interface ArcaQrData {
  ver: number
  fecha: string
  cuit: number
  ptoVta: number
  tipoCmp: number
  nroCmp: number
  importe: number
  moneda: string
  ctz: number
  tipoDocRec: number
  nroDocRec: number
  tipoCodAut: string
  codAut: number
}

const ARCA_QR_BASE_URL = 'https://www.afip.gob.ar/fe/qr/'

export function buildArcaQrPayload(doc: {
  fecha?: string | Date
  puntoVenta?: number | string
  tipoDocumento: string
  letra: string
  numero?: number | string
  total?: number | string
  moneda?: string
  tipoCambio?: number | string
  clienteDocumentoTipo?: string | null
  clienteDocumentoNumero?: string | null
  cae?: string | null
}, config: {
  cuit?: string
}): string {
  const cuit = (config?.cuit || '').replace(/\D/g, '')
  const tipoMap: Record<string, string> = {
    FACTURA_A: '1', FACTURA_B: '6', FACTURA_C: '11', FACTURA_E: '19',
    NOTA_CREDITO_A: '3', NOTA_CREDITO_B: '8',
    NOTA_DEBITO_A: '2', NOTA_DEBITO_B: '7',
    PRESUPUESTO_X: '0', REMITO_X: '0', ORDEN_INTERNA_X: '0',
  }
  const key = `${doc.tipoDocumento}_${doc.letra}`
  const payload: ArcaQrData = {
    ver: 1,
    fecha: String(doc.fecha || '').slice(0, 10),
    cuit: Number(cuit) || 0,
    ptoVta: Number(doc.puntoVenta) || 0,
    tipoCmp: Number(tipoMap[key] || '0'),
    nroCmp: Number(doc.numero) || 0,
    importe: Number(doc.total || 0),
    moneda: doc.moneda === 'USD' ? 'DOL' : 'PES',
    ctz: Number(doc.tipoCambio || 1),
    tipoDocRec: getCodigoDocumentoARCA(doc.clienteDocumentoTipo),
    nroDocRec: Number((doc.clienteDocumentoNumero || '').replace(/\D/g, '')) || 0,
    tipoCodAut: 'E',
    codAut: Number((doc.cae || '').replace(/\D/g, '')) || 0,
  }
  return JSON.stringify(payload)
}

export function buildArcaQrUrl(payloadJson: string): string {
  if (!payloadJson) return ''
  try {
    const base64 = Buffer.from(payloadJson, 'utf-8').toString('base64url')
    return `${ARCA_QR_BASE_URL}?p=${base64}`
  } catch {
    return ''
  }
}

export function buildArcaQrUrlFromDoc(doc: any, config: any): string {
  const payload = buildArcaQrPayload(doc, config)
  return buildArcaQrUrl(payload)
}
