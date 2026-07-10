export interface ArcaTipoCbte {
  codigo: number
  descripcion: string
  letra: string
  fiscal: boolean
  permiteConsumidorFinal: boolean
  requiereCuitReceptor: boolean
  tipoDocumento: string
}

export const ARCA_TIPOS_COMPROBANTE: Record<string, ArcaTipoCbte> = {
  FACTURA_A: { codigo: 1, descripcion: 'Factura A', letra: 'A', fiscal: true, permiteConsumidorFinal: false, requiereCuitReceptor: true, tipoDocumento: 'FACTURA' },
  FACTURA_B: { codigo: 6, descripcion: 'Factura B', letra: 'B', fiscal: true, permiteConsumidorFinal: true, requiereCuitReceptor: false, tipoDocumento: 'FACTURA' },
  FACTURA_C: { codigo: 11, descripcion: 'Factura C', letra: 'C', fiscal: true, permiteConsumidorFinal: true, requiereCuitReceptor: false, tipoDocumento: 'FACTURA' },
  FACTURA_E: { codigo: 19, descripcion: 'Factura E (Exportación)', letra: 'E', fiscal: true, permiteConsumidorFinal: false, requiereCuitReceptor: true, tipoDocumento: 'FACTURA' },
  NOTA_CREDITO_A: { codigo: 3, descripcion: 'Nota de Crédito A', letra: 'A', fiscal: true, permiteConsumidorFinal: false, requiereCuitReceptor: true, tipoDocumento: 'NOTA_CREDITO' },
  NOTA_CREDITO_B: { codigo: 8, descripcion: 'Nota de Crédito B', letra: 'B', fiscal: true, permiteConsumidorFinal: true, requiereCuitReceptor: false, tipoDocumento: 'NOTA_CREDITO' },
  NOTA_DEBITO_A: { codigo: 2, descripcion: 'Nota de Débito A', letra: 'A', fiscal: true, permiteConsumidorFinal: false, requiereCuitReceptor: true, tipoDocumento: 'NOTA_DEBITO' },
  NOTA_DEBITO_B: { codigo: 7, descripcion: 'Nota de Débito B', letra: 'B', fiscal: true, permiteConsumidorFinal: true, requiereCuitReceptor: false, tipoDocumento: 'NOTA_DEBITO' },
  PRESUPUESTO_X: { codigo: 0, descripcion: 'Presupuesto', letra: 'X', fiscal: false, permiteConsumidorFinal: true, requiereCuitReceptor: false, tipoDocumento: 'PRESUPUESTO' },
  REMITO_X: { codigo: 0, descripcion: 'Remito', letra: 'X', fiscal: false, permiteConsumidorFinal: true, requiereCuitReceptor: false, tipoDocumento: 'REMITO' },
  ORDEN_INTERNA_X: { codigo: 0, descripcion: 'Orden Interna', letra: 'X', fiscal: false, permiteConsumidorFinal: true, requiereCuitReceptor: false, tipoDocumento: 'ORDEN_INTERNA' },
}

export type CondicionIvaEmisor = 'Resp.Inscripto' | 'Sueto.Exento' | 'MonoTributo' | 'NoResponsable'
export type CondicionIvaReceptor = 'Resp.Inscripto' | 'Sueto.Exento' | 'MonoTributo' | 'Consumidor Final' | 'NoResponsable' | 'Exterior'

export interface AlicuotaIva {
  id: number
  descripcion: string
  porcentaje: number
  codigoARCA: number
}

export const ARCA_ALICUOTAS_IVA: AlicuotaIva[] = [
  { id: 1, descripcion: 'IVA 27%', porcentaje: 27, codigoARCA: 5 },
  { id: 2, descripcion: 'IVA 21%', porcentaje: 21, codigoARCA: 4 },
  { id: 3, descripcion: 'IVA 10.5%', porcentaje: 10.5, codigoARCA: 3 },
  { id: 4, descripcion: 'IVA 5%', porcentaje: 5, codigoARCA: 8 },
  { id: 5, descripcion: 'IVA 2.5%', porcentaje: 2.5, codigoARCA: 9 },
  { id: 6, descripcion: 'IVA 0%', porcentaje: 0, codigoARCA: 1 },
  { id: 7, descripcion: 'Exento', porcentaje: 0, codigoARCA: 2 },
]

export type TipoDocumentoReceptor = 'CUIT' | 'C.U.I.T.' | 'DNI' | 'D.N.I.' | 'LC' | 'LE' | 'Pasaporte' | 'CDI' | 'Otro'

export const ARCA_TIPOS_DOCUMENTO_RECEPTOR: Record<TipoDocumentoReceptor, number> = {
  'CUIT': 80,
  'C.U.I.T.': 80,
  'DNI': 96,
  'D.N.I.': 96,
  'LC': 90,
  'LE': 89,
  'Pasaporte': 94,
  'CDI': 86,
  'Otro': 99,
}

export function getCodigoDocumentoARCA(tipo: string | null | undefined): number {
  if (!tipo) return 99
  return ARCA_TIPOS_DOCUMENTO_RECEPTOR[tipo as TipoDocumentoReceptor] || 99
}

export interface MonedaARCA {
  codigo: string
  descripcion: string
  codigoARCA: string
}

export const ARCA_MONEDAS: MonedaARCA[] = [
  { codigo: 'ARS', descripcion: 'Pesos Argentinos', codigoARCA: 'PES' },
  { codigo: 'USD', descripcion: 'Dólares Estadounidenses', codigoARCA: 'DOL' },
  { codigo: 'EUR', descripcion: 'Euros', codigoARCA: 'EUR' },
  { codigo: 'BRL', descripcion: 'Reales Brasil', codigoARCA: 'BRL' },
]
