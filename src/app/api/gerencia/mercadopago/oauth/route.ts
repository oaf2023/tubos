import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireGerenciaNivel0 } from '@/lib/api-auth'
import { getMercadoPagoCredentials } from '@/lib/mercadopago-config'
import { encryptSecret } from '@/lib/secret-crypto'

export async function POST(req: NextRequest) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden

  try {
    const body = await req.json()
    const credentials = await getMercadoPagoCredentials()
    if (!credentials?.clientId) {
      return NextResponse.json({ error: 'Primero guardá el Client ID' }, { status: 400 })
    }

    if (body.action === 'authorization-url') {
      const redirectUri = credentials.redirectUri || 'https://localhost:3000/callback'
      const state = randomBytes(18).toString('base64url')
      const url = new URL('https://auth.mercadopago.com.ar/authorization')
      url.searchParams.set('client_id', credentials.clientId)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('platform_id', 'mp')
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('state', state)
      return NextResponse.json({ url: url.toString(), state })
    }

    if (body.action !== 'exchange-code') {
      return NextResponse.json({ error: 'Acción OAuth inválida' }, { status: 400 })
    }
    if (!credentials.clientSecret) {
      return NextResponse.json({ error: 'Primero guardá el Client Secret' }, { status: 400 })
    }
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!code) return NextResponse.json({ error: 'Ingresá el Authorization Code' }, { status: 400 })

    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
        redirect_uri: credentials.redirectUri || 'https://localhost:3000/callback',
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.access_token) {
      return NextResponse.json(
        { error: data?.message || data?.error || 'Mercado Pago no pudo canjear el código' },
        { status: 400 },
      )
    }

    const user = getRequestUser(req)
    const expiresIn = Number(data.expires_in)
    await db.mercadoPagoConfig.update({
      where: { id: 'default' },
      data: {
        accessTokenEncrypted: encryptSecret(data.access_token),
        refreshTokenEncrypted: data.refresh_token
          ? encryptSecret(data.refresh_token)
          : undefined,
        tokenExpiresAt: Number.isFinite(expiresIn)
          ? new Date(Date.now() + expiresIn * 1000)
          : null,
        updatedBy: user?.id ? String(user.id) : user?.username || null,
      },
    })

    return NextResponse.json({
      ok: true,
      hasAccessToken: true,
      hasRefreshToken: Boolean(data.refresh_token || credentials.refreshToken),
    })
  } catch (error) {
    console.error('POST /api/gerencia/mercadopago/oauth', error)
    return NextResponse.json({ error: 'No se pudo completar la autorización con Mercado Pago' }, { status: 502 })
  }
}
