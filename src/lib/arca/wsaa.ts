export interface ArcaTicketAcceso {
  token: string
  sign: string
  expiration: Date
  generatedAt: Date
}

let taCache: ArcaTicketAcceso | null = null

function generarTokenMock(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: 'mock-arca-wsaa',
    service: 'wsfe',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url')
  return `${header}.${payload}.mock_signature_no_verificar`
}

export async function obtenerTicketAcceso(modo: string = 'MANUAL'): Promise<ArcaTicketAcceso | null> {
  if (modo === 'MANUAL') return null

  if (taCache && taCache.expiration > new Date()) {
    return taCache
  }

  const ta: ArcaTicketAcceso = {
    token: generarTokenMock(),
    sign: Buffer.from('mock-sign-' + Date.now()).toString('base64'),
    expiration: new Date(Date.now() + 3600000),
    generatedAt: new Date(),
  }

  taCache = ta
  return ta
}

export function limpiarCacheTA(): void {
  taCache = null
}
