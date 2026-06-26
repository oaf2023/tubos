import { db } from './db'

interface AuditInput {
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  entidad: string
  entidadId?: string
  usuario?: string | null
  detalle?: Record<string, any> | null
  direccionIp?: string
}

export async function logAudit(input: AuditInput) {
  try {
    await db.auditLog.create({
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
