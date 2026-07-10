import { db } from '@/lib/db'
import { createHash, createSign } from 'crypto'

export interface ArcaTicketAcceso {
  token: string
  sign: string
  expiration: Date
  generatedAt: Date
}

interface ArcaCredentialData {
  id: string
  alias: string
  environment: string
  certPem: string
  keyPem: string
  cuit: string
}

const WSAA_URLS: Record<string, string> = {
  HOMOLOGACION: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  PRODUCCION: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
}

function buildTra(service: string, cuit: string): string {
  const now = new Date()
  const exp = new Date(now.getTime() + 3600_000)
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${now.getTime()}</uniqueId>
    <generationTime>${now.toISOString().replace(/\.\d{3}/, '')}</generationTime>
    <expirationTime>${exp.toISOString().replace(/\.\d{3}/, '')}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`
}

function signTra(traXml: string, keyPem: string): string {
  const signer = createSign('sha256')
  signer.update(traXml)
  signer.end()
  const signature = signer.sign(keyPem, 'base64')
  return signature
}

function buildCms(traXml: string, signature: string, certPem: string): string {
  const traB64 = Buffer.from(traXml, 'utf-8').toString('base64')
  const cmsBody = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${new Date().getTime()}</uniqueId>
    <generationTime>${new Date().toISOString().replace(/\.\d{3}/, '')}</generationTime>
    <expirationTime>${new Date(Date.now() + 3600_000).toISOString().replace(/\.\d{3}/, '')}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`
  return `<CMS>${Buffer.from(cmsBody).toString('base64')}</CMS>`
}

function generateMockToken(service: string): ArcaTicketAcceso {
  const now = new Date()
  const exp = new Date(now.getTime() + 3600_000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: 'mock-arca-wsaa',
    service,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(exp.getTime() / 1000),
  })).toString('base64url')
  return {
    token: `${header}.${payload}.mock_signature_no_verificar`,
    sign: Buffer.from('mock-sign-' + Date.now()).toString('base64'),
    expiration: exp,
    generatedAt: now,
  }
}

async function loginWsaa(credential: ArcaCredentialData, service: string): Promise<ArcaTicketAcceso> {
  const url = WSAA_URLS[credential.environment]
  if (!url) throw new Error(`Entorno ARCA no soportado: ${credential.environment}`)

  const traXml = buildTra(service, credential.cuit)
  const signature = signTra(traXml, credential.keyPem)
  const cms = buildCms(traXml, signature, credential.certPem)

  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.servicios.gov.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: soapRequest,
  })

  const responseText = await response.text()
  const tokenMatch = responseText.match(/<token>([\s\S]*?)<\/token>/)
  const signMatch = responseText.match(/<sign>([\s\S]*?)<\/sign>/)
  const expMatch = responseText.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/)

  if (!tokenMatch || !signMatch) {
    const faultMatch = responseText.match(/<faultstring>([\s\S]*?)<\/faultstring>/)
    throw new Error(`WSAA login failed: ${faultMatch?.[1] || responseText.slice(0, 500)}`)
  }

  const expiration = expMatch ? new Date(expMatch[1]) : new Date(Date.now() + 3600_000)

  return {
    token: tokenMatch[1].trim(),
    sign: signMatch[1].trim(),
    expiration,
    generatedAt: new Date(),
  }
}

export async function obtenerTicketAcceso(modo?: string): Promise<ArcaTicketAcceso | null> {
  const cfg = await db.configuracionFiscal.findUnique({ where: { id: 'default' } })
  const effectiveModo = modo || cfg?.modoArca || 'MANUAL'

  if (effectiveModo === 'MANUAL') return null

  const credential = await db.arcaCredential.findFirst({
    where: {
      activo: true,
      environment: effectiveModo === 'PRODUCCION' ? 'PRODUCCION' : 'HOMOLOGACION',
    },
  })

  if (!credential) {
    if (effectiveModo === 'MOCK') return generateMockToken('wsfe')
    throw new Error(`No hay credencial ARCA activa para entorno ${effectiveModo}. Configure una credencial en Configuración > Comprobantes.`)
  }

  const existingTicket = await db.arcaTicket.findFirst({
    where: {
      credentialId: credential.id,
      expirationTime: { gt: new Date() },
    },
    orderBy: { expirationTime: 'desc' },
  })
  if (existingTicket) {
    return {
      token: existingTicket.token,
      sign: existingTicket.sign,
      expiration: existingTicket.expirationTime,
      generatedAt: existingTicket.generationTime,
    }
  }

  const ta = await loginWsaa(credential, 'wsfe')

  await db.arcaTicket.create({
    data: {
      credentialId: credential.id,
      servicio: 'wsfe',
      environment: credential.environment,
      token: ta.token,
      sign: ta.sign,
      generationTime: ta.generatedAt,
      expirationTime: ta.expiration,
      cuit: credential.cuit,
    },
  })

  await db.arcaCredential.update({
    where: { id: credential.id },
    data: { ultimoUsado: new Date() },
  })

  return ta
}

function generateMockCae(): { cae: string; vencimiento: string } {
  const anio = new Date().getFullYear()
  const mes = String(new Date().getMonth() + 1).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 90000000) + 10000000)
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 15)
  return {
    cae: `${anio}${mes}${random}`,
    vencimiento: fecha.toISOString().slice(0, 10),
  }
}

export function limpiarCacheTA(): void {
  // La caché de tickets está en DB (ArcaTicket), se limpia forzando expiración
}

export { generateMockToken, generateMockCae }
