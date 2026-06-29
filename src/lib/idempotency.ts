import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export function getIdempotencyKey(req: NextRequest): string | null {
  const key = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key')
  return key || null
}

export async function checkIdempotency(key: string) {
  const existing = await db.idempotencyKey.findUnique({ where: { key } })

  if (existing) {
    // If expired, delete and return null
    if (existing.expiresAt < new Date()) {
      await db.idempotencyKey.delete({ where: { id: existing.id } })
      return null
    }

    return {
      response: JSON.parse(existing.response),
      status: existing.status,
    }
  }

  return null
}

export async function saveIdempotency(key: string, response: unknown, status: number) {
  await db.idempotencyKey.create({
    data: {
      key,
      response: JSON.stringify(response),
      status,
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    },
  })
}

export async function cleanupExpiredKeys() {
  try {
    const { count } = await db.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    if (count > 0) console.log(`[idempotency] Cleaned up ${count} expired keys`)
  } catch (e) {
    console.error('[idempotency] Cleanup error:', e)
  }
}
