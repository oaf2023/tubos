import { db } from '@/lib/db'
import { createHash } from 'crypto'

type CacheEntry = {
  distanciaKm: number
  duracionMin: number
  geometry: string | null
}

function makeHash(coords: { lat: number; lng: number }[]): string {
  const data = coords.map((c) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`).join('|')
  return createHash('md5').update(data).digest('hex')
}

export async function getRouteCache(
  coords: { lat: number; lng: number }[]
): Promise<CacheEntry | null> {
  const hash = makeHash(coords)
  const cached = await db.routeCache.findUnique({ where: { hash } })
  if (!cached) return null
  if (cached.expiresAt < new Date()) {
    await db.routeCache.delete({ where: { id: cached.id } }).catch(() => {})
    return null
  }
  return {
    distanciaKm: cached.distanciaKm,
    duracionMin: cached.duracionMin,
    geometry: cached.geometry,
  }
}

export async function setRouteCache(
  coords: { lat: number; lng: number }[],
  data: CacheEntry
): Promise<void> {
  const hash = makeHash(coords)
  const first = coords[0]
  const last = coords[coords.length - 1]
  await db.routeCache.upsert({
    where: { hash },
    create: {
      hash,
      origenLat: first.lat,
      origenLng: first.lng,
      destLat: last.lat,
      destLng: last.lng,
      distanciaKm: data.distanciaKm,
      duracionMin: data.duracionMin,
      geometry: data.geometry ?? '',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      distanciaKm: data.distanciaKm,
      duracionMin: data.duracionMin,
      geometry: data.geometry ?? '',
    },
  })
}

export async function clearExpiredCache(): Promise<number> {
  const result = await db.routeCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
