import { db } from './db'
import type { PrismaClient } from '@prisma/client'

type AuditAccion = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'CAMBIO_ESTADO'

interface AuditInput {
  accion: AuditAccion
  entidad: string
  entidadId?: string
  usuario?: string | null
  detalle?: Record<string, any> | null
  direccionIp?: string
}

export async function logAudit(input: AuditInput, tx?: PrismaClient) {
  const client = tx || db
  try {
    await client.auditLog.create({
      data: {
        accion: input.accion,
        entidad: input.entidad,
        entidadId: input.entidadId || null,
        usuario: input.usuario || null,
        detalle: input.detalle ? JSON.stringify(input.detalle) : null,
        direccionIp: input.direccionIp || null,
      },
    })
  } catch (e) {
    console.error('[audit] Failed to log:', e)
  }
}
