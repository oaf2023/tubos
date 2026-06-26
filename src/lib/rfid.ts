import { db } from './db'

const VENTANA_DEDUP_MS = 5000 // 5 segundos ventana de deduplicación
const MAX_SESION_MS = 30000 // 30 segundos máxima sesión

export async function findOrCreateSesion(lectorId: string, zonaId: string, tid: string) {
  const existing = await db.sesionLecturaRFID.findFirst({
    where: {
      lectorId,
      zonaId,
      tid,
      procesado: false,
      ultimaLectura: { gte: new Date(Date.now() - MAX_SESION_MS) },
    },
    orderBy: { ultimaLectura: 'desc' },
  })

  if (existing) {
    return await db.sesionLecturaRFID.update({
      where: { id: existing.id },
      data: {
        conteo: { increment: 1 },
        ultimaLectura: new Date(),
      },
    })
  }

  return await db.sesionLecturaRFID.create({
    data: { lectorId, zonaId, tid },
  })
}

export function esDuplicado(ultimaLectura: Date): boolean {
  return Date.now() - ultimaLectura.getTime() < VENTANA_DEDUP_MS
}

export async function cerrarSesionesVencidas() {
  const vencidas = await db.sesionLecturaRFID.findMany({
    where: {
      procesado: false,
      ultimaLectura: { lt: new Date(Date.now() - MAX_SESION_MS) },
    },
  })
  for (const s of vencidas) {
    await db.sesionLecturaRFID.update({
      where: { id: s.id },
      data: { procesado: true, fin: new Date() },
    })
  }
  return vencidas.length
}

export async function getUltimaSesion(cylinderId: string) {
  return db.sesionLecturaRFID.findFirst({
    where: { cylinderId },
    orderBy: { ultimaLectura: 'desc' },
  })
}
