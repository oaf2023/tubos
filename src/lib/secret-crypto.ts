import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const VERSION = 'v1'

function encryptionKey() {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!secret) throw new Error('Falta CREDENTIALS_ENCRYPTION_KEY o JWT_SECRET')
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':')
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return null
  const [version, iv, tag, encrypted] = value.split(':')
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error('Formato de credencial cifrada inválido')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
