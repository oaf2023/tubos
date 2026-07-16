import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/secret-crypto'

export async function getMercadoPagoCredentials() {
  const config = await db.mercadoPagoConfig.findUnique({ where: { id: 'default' } })
  if (!config) return null

  return {
    clientId: config.clientId,
    clientSecret: decryptSecret(config.clientSecretEncrypted),
    redirectUri: config.redirectUri,
    accessToken: decryptSecret(config.accessTokenEncrypted),
    refreshToken: decryptSecret(config.refreshTokenEncrypted),
    webhookSecret: decryptSecret(config.webhookSecretEncrypted),
    tokenExpiresAt: config.tokenExpiresAt,
  }
}
