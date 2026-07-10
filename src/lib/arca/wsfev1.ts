import { db } from '@/lib/db'
import { obtenerTicketAcceso, generateMockCae } from './wsaa'

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
    tributos?: Array<{ id: number; descripcion: string; baseImponible: number; importe: number }>
    concepto?: number
    periodoDesde?: string
    periodoHasta?: string
  }
}

export interface ArcaRespuestaCAE {
  resultado: 'A' | 'R' | 'O'
  cae: string | null
  caeVencimiento: string | null
  observaciones: string[]
  errors: string[]
  codigoAutorizacion?: string
  responseXml?: string
}

const WSFEv1_URLS: Record<string, string> = {
  HOMOLOGACION: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  PRODUCCION: 'https://wsfe.afip.gov.ar/wsfev1/service.asmx',
}

function getTipoCbte(tipo: string, letra: string): number {
  const map: Record<string, number> = {
    FACTURA_A: 1, FACTURA_B: 6, FACTURA_C: 11, FACTURA_E: 19,
    NOTA_CREDITO_A: 3, NOTA_CREDITO_B: 8,
    NOTA_DEBITO_A: 2, NOTA_DEBITO_B: 7,
  }
  return map[`${tipo}_${letra}`] || 0
}

function getAlicuotaId(codigo: number): number {
  const map: Record<number, number> = { 5: 27, 4: 21, 3: 10.5, 8: 5, 9: 2.5, 1: 0, 2: 0 }
  return map[codigo] || 0
}

function buildFecaeSolicitarXml(solicitud: ArcaSolicitudCAE, token: string, sign: string, cuit: string): string {
  const c = solicitud.comprobante
  const tipoCbte = getTipoCbte(c.tipoDocumento, c.letra)
  const moneda = c.moneda === 'DOL' ? 'DOL' : 'PES'

  let alicuotasXml = ''
  for (const a of c.alicuotas) {
    if (a.importe > 0) {
      alicuotasXml += `<Alicuota><Id>${a.id}</Id><BaseImp>${a.baseImponible.toFixed(2)}</BaseImp><Importe>${a.importe.toFixed(2)}</Importe></Alicuota>`
    }
  }

  let tributosXml = ''
  if (c.tributos && c.tributos.length > 0) {
    for (const t of c.tributos) {
      tributosXml += `<Tributo><Id>${t.id}</Id><Desc>${t.descripcion}</Desc><BaseImp>${t.baseImponible.toFixed(2)}</BaseImp><Alic>${0}</Alic><Importe>${t.importe.toFixed(2)}</Importe></Tributo>`
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.fe.wsfe.afip.gov.ar/">
  <soap:Header>
    <ser:Auth>
      <Token>${token}</Token>
      <Sign>${sign}</Sign>
      <Cuit>${cuit}</Cuit>
    </ser:Auth>
  </soap:Header>
  <soap:Body>
    <ser:FECAESolicitar>
      <ser:FeCAEReq>
        <ser:FeCabReq>
          <ser:CantRegs>1</ser:CantRegs>
          <ser:PtoVta>${c.puntoVenta}</ser:PtoVta>
          <ser:CbteTipo>${tipoCbte}</ser:CbteTipo>
        </ser:FeCabReq>
        <ser:FeDetReq>
          <ser:FECAEDetRequest>
            <ser:Concepto>${c.concepto || 1}</ser:Concepto>
            <ser:DocTipo>${c.tipoDocReceptor}</ser:DocTipo>
            <ser:DocNro>${c.nroDocReceptor}</ser:DocNro>
            <ser:CbteDesde>${c.numero}</ser:CbteDesde>
            <ser:CbteHasta>${c.numero}</ser:CbteHasta>
            <ser:CbteFch>${c.fecha.replace(/-/g, '')}</ser:CbteFch>
            <ser:ImpTotal>${c.importeTotal.toFixed(2)}</ser:ImpTotal>
            <ser:ImpTotConc>0.00</ser:ImpTotConc>
            <ser:ImpNeto>${c.importeNeto.toFixed(2)}</ser:ImpNeto>
            <ser:ImpOpEx>${c.exento.toFixed(2)}</ser:ImpOpEx>
            <ser:ImpTrib>0.00</ser:ImpTrib>
            <ser:ImpIVA>${c.importeIva.toFixed(2)}</ser:ImpIVA>
            <ser:MonCotiz>${c.tipoCambio.toFixed(6)}</ser:MonCotiz>
            <ser:MonId>${moneda}</ser:MonId>
            ${alicuotasXml ? `<ser:Iva>${alicuotasXml}</ser:Iva>` : ''}
            ${tributosXml ? `<ser:Tributos>${tributosXml}</ser:Tributos>` : ''}
          </ser:FECAEDetRequest>
        </ser:FeDetReq>
      </ser:FeCAEReq>
    </ser:FECAESolicitar>
  </soap:Body>
</soap:Envelope>`
}

function buildFeCompUltimoAutorizadoXml(token: string, sign: string, cuit: string, ptoVta: number, tipoCbte: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.fe.wsfe.afip.gov.ar/">
  <soap:Header>
    <ser:Auth>
      <Token>${token}</Token>
      <Sign>${sign}</Sign>
      <Cuit>${cuit}</Cuit>
    </ser:Auth>
  </soap:Header>
  <soap:Body>
    <ser:FECompUltimoAutorizado>
      <ser:PtoVta>${ptoVta}</ser:PtoVta>
      <ser:CbteTipo>${tipoCbte}</ser:CbteTipo>
    </ser:FECompUltimoAutorizado>
  </soap:Body>
</soap:Envelope>`
}

function buildFecaeConsultarXml(token: string, sign: string, cuit: string, ptoVta: number, tipoCbte: number, cbteNro: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.fe.wsfe.afip.gov.ar/">
  <soap:Header>
    <ser:Auth>
      <Token>${token}</Token>
      <Sign>${sign}</Sign>
      <Cuit>${cuit}</Cuit>
    </ser:Auth>
  </soap:Header>
  <soap:Body>
    <ser:FECompConsultar>
      <ser:FeCompConsReq>
        <ser:CbteTipo>${tipoCbte}</ser:CbteTipo>
        <ser:CbteNro>${cbteNro}</ser:CbteNro>
        <ser:PtoVta>${ptoVta}</ser:PtoVta>
      </ser:FeCompConsReq>
    </ser:FECompConsultar>
  </soap:Body>
</soap:Envelope>`
}

function parseFecaeSolicitarResponse(xml: string): ArcaRespuestaCAE {
  const observaciones: string[] = []
  const errors: string[] = []

  const obsMatches = xml.matchAll(/<Obs>[\s\S]*?<Msg>([\s\S]*?)<\/Msg>[\s\S]*?<\/Obs>/g)
  for (const m of obsMatches) observaciones.push(m[1].trim())

  const errMatches = xml.matchAll(/<Err>[\s\S]*?<Msg>([\s\S]*?)<\/Msg>[\s\S]*?<\/Err>/g)
  for (const m of errMatches) errors.push(m[1].trim())

  const resultado = xml.match(/<Resultado>([A-Z])<\/Resultado>/)
  const cae = xml.match(/<CAE>([\s\S]*?)<\/CAE>/)
  const venc = xml.match(/<CAEFchVto>([\s\S]*?)<\/CAEFchVto>/)

  if (!resultado) {
    const fault = xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/)
    return {
      resultado: 'R',
      cae: null,
      caeVencimiento: null,
      observaciones,
      errors: [fault?.[1] || 'Error desconocido en respuesta ARCA', ...errors],
    }
  }

  return {
    resultado: resultado[1] as 'A' | 'R' | 'O',
    cae: cae?.[1] || null,
    caeVencimiento: venc?.[1] || null,
    observaciones,
    errors,
    responseXml: xml,
  }
}

function parseUltimoAutorizadoResponse(xml: string): number {
  const match = xml.match(/<PtoVta>(\d+)<\/PtoVta>[\s\S]*?<CbteNro>(\d+)<\/CbteNro>/)
  if (!match) {
    const errMatch = xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/)
    throw new Error(`FECompUltimoAutorizado failed: ${errMatch?.[1] || 'respuesta inesperada'}`)
  }
  return parseInt(match[2], 10)
}

async function modoArca(): Promise<string> {
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
      observaciones: ['MODO_MANUAL: El sistema está en modo manual. Ingrese el CAE manualmente en la edición del comprobante.'],
      errors: ['Modo manual activo: no se puede solicitar CAE automáticamente'],
    }
  }

  if (modo === 'MOCK') {
    const mock = generateMockCae()
    return {
      resultado: 'A',
      cae: mock.cae,
      caeVencimiento: mock.vencimiento,
      observaciones: ['MOCK: CAE generado en modo simulación'],
      errors: [],
    }
  }

  const cfg = await db.configuracionFiscal.findUnique({ where: { id: 'default' } })
  const url = WSFEv1_URLS[modo]
  if (!url) {
    return {
      resultado: 'O',
      cae: null,
      caeVencimiento: null,
      observaciones: [],
      errors: [`Modo ARCA no soportado para WSFEv1: ${modo}`],
    }
  }

  const ta = await obtenerTicketAcceso(modo)
  if (!ta) {
    return {
      resultado: 'O',
      cae: null,
      caeVencimiento: null,
      observaciones: ['No se pudo obtener ticket de acceso ARCA'],
      errors: ['WSAA: ticket de acceso no disponible'],
    }
  }

  const cuit = (cfg?.cuit || '').replace(/\D/g, '')
  const xml = buildFecaeSolicitarXml(solicitud, ta.token, ta.sign, cuit)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://service.fe.wsfe.afip.gov.ar/FECAESolicitar',
      },
      body: xml,
    })

    const responseText = await response.text()
    const parsed = parseFecaeSolicitarResponse(responseText)

    if (parsed.cae) {
      parsed.codigoAutorizacion = parsed.cae
    }

    return parsed
  } catch (e) {
    return {
      resultado: 'R',
      cae: null,
      caeVencimiento: null,
      observaciones: [],
      errors: [`Error de conexión con ARCA: ${e instanceof Error ? e.message : 'desconocido'}`],
    }
  }
}

export async function feCompUltimoAutorizado(puntoVenta: number, tipoComprobante: number): Promise<number> {
  const modo = await modoArca()
  if (modo === 'MANUAL' || modo === 'MOCK') return 0

  const cfg = await db.configuracionFiscal.findUnique({ where: { id: 'default' } })
  const url = WSFEv1_URLS[modo]
  if (!url) return 0

  const ta = await obtenerTicketAcceso(modo)
  if (!ta) return 0

  const cuit = (cfg?.cuit || '').replace(/\D/g, '')
  const xml = buildFeCompUltimoAutorizadoXml(ta.token, ta.sign, cuit, puntoVenta, tipoComprobante)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://service.fe.wsfe.afip.gov.ar/FECompUltimoAutorizado',
      },
      body: xml,
    })

    const responseText = await response.text()
    return parseUltimoAutorizadoResponse(responseText)
  } catch {
    return 0
  }
}

export async function fecaeConsultar(cae: string): Promise<ArcaRespuestaCAE> {
  const modo = await modoArca()
  if (modo === 'MANUAL' || modo === 'MOCK') {
    return {
      resultado: 'A',
      cae,
      caeVencimiento: new Date(Date.now() + 15 * 86400_000).toISOString().slice(0, 10),
      observaciones: ['MOCK: Consulta de CAE simulada'],
      errors: [],
    }
  }

  const cfg = await db.configuracionFiscal.findUnique({ where: { id: 'default' } })
  const url = WSFEv1_URLS[modo]
  if (!url) {
    return { resultado: 'R', cae: null, caeVencimiento: null, observaciones: [], errors: ['Modo no soportado'] }
  }

  const ta = await obtenerTicketAcceso(modo)
  if (!ta) {
    return { resultado: 'R', cae: null, caeVencimiento: null, observaciones: [], errors: ['Sin ticket ARCA'] }
  }

  const cuit = (cfg?.cuit || '').replace(/\D/g, '')
  const xml = buildFecaeConsultarXml(ta.token, ta.sign, cuit, 0, 0, 0)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://service.fe.wsfe.afip.gov.ar/FECompConsultar',
      },
      body: xml,
    })
    const responseText = await response.text()
    return parseFecaeSolicitarResponse(responseText)
  } catch (e) {
    return {
      resultado: 'R', cae: null, caeVencimiento: null,
      observaciones: [],
      errors: [`Error consultando CAE: ${e instanceof Error ? e.message : 'desconocido'}`],
    }
  }
}
