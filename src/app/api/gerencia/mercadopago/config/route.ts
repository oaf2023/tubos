import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireGerenciaNivel0 } from '@/lib/api-auth'
import { encryptSecret } from '@/lib/secret-crypto'

function publicConfig(config: Awaited<ReturnType<typeof db.mercadoPagoConfig.findUnique>>) {
  return {
    clientId: config?.clientId || '',
    redirectUri: config?.redirectUri || '',
    hasClientSecret: Boolean(config?.clientSecretEncrypted),
    hasAccessToken: Boolean(config?.accessTokenEncrypted),
    hasRefreshToken: Boolean(config?.refreshTokenEncrypted),
    hasWebhookSecret: Boolean(config?.webhookSecretEncrypted),
    tokenExpiresAt: config?.tokenExpiresAt?.toISOString() || null,
    updatedAt: config?.updatedAt?.toISOString() || null,
  }
}

export async function GET(req: NextRequest) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden

  try {
    const config = await db.mercadoPagoConfig.findUnique({ where: { id: 'default' } })
    return NextResponse.json(publicConfig(config))
  } catch (error) {
    console.error('GET /api/gerencia/mercadopago/config', error)
    return NextResponse.json({ error: 'No se pudo obtener la configuración de Mercado Pago' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden

  try {
    const body = await req.json()
    const user = getRequestUser(req)
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
    const redirectUri = typeof body.redirectUri === 'string' ? body.redirectUri.trim() : ''
    const secretFields = [
      ['clientSecret', 'clientSecretEncrypted'],
      ['accessToken', 'accessTokenEncrypted'],
      ['refreshToken', 'refreshTokenEncrypted'],
      ['webhookSecret', 'webhookSecretEncrypted'],
    ] as const
    const secrets: Record<string, string> = {}

    for (const [input, column] of secretFields) {
      if (typeof body[input] === 'string' && body[input].trim()) {
        secrets[column] = encryptSecret(body[input].trim())
      }
    }

    const values = {
      clientId: clientId || null,
      redirectUri: redirectUri || null,
      updatedBy: user?.id ? String(user.id) : user?.username || null,
      ...secrets,
    }
    const config = await db.mercadoPagoConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...values },
      update: values,
    })

    return NextResponse.json(publicConfig(config))
  } catch (error) {
    console.error('PUT /api/gerencia/mercadopago/config', error)
    return NextResponse.json({ error: 'No se pudo guardar la configuración de Mercado Pago' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden

  try {
    await db.mercadoPagoConfig.deleteMany({ where: { id: 'default' } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/gerencia/mercadopago/config', error)
    return NextResponse.json({ error: 'No se pudo eliminar la configuración de Mercado Pago' }, { status: 500 })
  }
}
