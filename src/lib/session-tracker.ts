import { db } from '@/lib/db'

/**
 * Detecta sesiones concurrentes y las marca como inactivas.
 * Retorna los datos de la sesión anterior si hubo conflicto, o null.
 */
export async function detectSessionConflict(
  usuarioId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<{
  conflicto: boolean
  sesionAnterior?: {
    deviceInfo: string | null
    ip: string | null
    loginAt: Date
  }
} | null> {
  try {
    // Buscar sesiones activas del mismo usuario (excluyendo la recién creada)
    const sesionesActivas = await db.sesionActiva.findMany({
      where: {
        usuarioId,
        active: true,
      },
      orderBy: { lastSeen: 'desc' },
    })

    if (sesionesActivas.length === 0) {
      // No hay sesiones previas — crear registro para esta sesión
      await db.sesionActiva.create({
        data: {
          usuarioId,
          deviceInfo: parseDeviceInfo(userAgent),
          ip,
          active: true,
        },
      })
      return { conflicto: false }
    }

    // Hay al menos una sesión activa previa
    const sesionAnterior = sesionesActivas[0]

    // Marcar todas las sesiones anteriores como inactivas
    await db.sesionActiva.updateMany({
      where: {
        usuarioId,
        active: true,
      },
      data: { active: false },
    })

    // Crear registro para la nueva sesión
    await db.sesionActiva.create({
      data: {
        usuarioId,
        deviceInfo: parseDeviceInfo(userAgent),
        ip,
        active: true,
      },
    })

    return {
      conflicto: true,
      sesionAnterior: {
        deviceInfo: sesionAnterior.deviceInfo,
        ip: sesionAnterior.ip,
        loginAt: sesionAnterior.loginAt,
      },
    }
  } catch (e) {
    console.error('Error detectando sesiones concurrentes:', e)
    return null
  }
}

/**
 * Parsea el User-Agent en un string legible.
 */
function parseDeviceInfo(userAgent: string | null): string {
  if (!userAgent) return 'Desconocido'

  const ua = userAgent.toLowerCase()

  // Browser
  let browser = 'Otro'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome/')) browser = 'Chrome'
  else if (ua.includes('firefox/')) browser = 'Firefox'
  else if (ua.includes('safari/')) browser = 'Safari'

  // OS
  let os = 'Otro'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

  return `${browser} / ${os}`
}

/**
 * Registra un logout en sesiones activas.
 */
export async function deactivateSession(usuarioId: string): Promise<void> {
  try {
    await db.sesionActiva.updateMany({
      where: { usuarioId, active: true },
      data: { active: false },
    })
  } catch (e) {
    console.error('Error desactivando sesión:', e)
  }
}

/**
 * Actualiza lastSeen de la sesión activa (llamar desde heartbeat).
 */
export async function touchSession(usuarioId: string): Promise<void> {
  try {
    await db.sesionActiva.updateMany({
      where: { usuarioId, active: true },
      data: { lastSeen: new Date() },
    })
  } catch {
    // Silenciar errores de heartbeat
  }
}
