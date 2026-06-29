import { db } from '@/lib/db'
import { findOrCreateSesion, cerrarSesionesVencidas } from '@/lib/rfid'
import { getTransicion } from '@/lib/rfid-rules'
import { logAudit } from '@/lib/audit'

interface ProcessEventoInput {
  lectorId: string
  zonaId: string
  tid: string
  origen?: string
  usuario?: string | null
  observacion?: string | null
}

interface ProcesarResultado {
  sesion: { id: string; conteo: number; procesado: boolean }
  evento: {
    id: string
    tid: string
    estadoAnterior: string | null
    estadoNuevo: string | null
  } | null
  tag: {
    tid: string
    asociado: boolean
    cylinderId: string | null
  }
  esNuevo: boolean
  cilindro: {
    id: string
    numeroSerie: string
    estado: string
  } | null
}

export async function procesarEventoRFID(input: ProcessEventoInput): Promise<ProcesarResultado> {
  const { lectorId, zonaId, tid, origen, usuario, observacion } = input

  const lector = await db.lectorIoT.findUnique({ where: { id: lectorId }, include: { zona: true } })
  if (!lector || !lector.activo) {
    throw new Error('Lector no encontrado o inactivo')
  }

  const zona = await db.zonaLectura.findUnique({ where: { id: zonaId } })
  if (!zona || !zona.activo) {
    throw new Error('Zona no encontrada o inactiva')
  }

  const tag = await db.tagRFID.findUnique({ where: { tid }, include: { cylinder: true } })
  const sesion = await findOrCreateSesion(lectorId, zonaId, tid)

  let evento = null
  let esNuevo = false

  if (sesion.conteo <= 1) {
    esNuevo = true
    const estadoAnterior = tag?.cylinder?.estado || null
    const transicion = estadoAnterior
      ? getTransicion(zona.tipo, estadoAnterior as any)
      : { estadoNuevo: null, auto: false }

    const result = await db.$transaction(async (tx) => {
      const ev = await tx.eventoRFID.create({
        data: {
          tid,
          lectorId,
          zonaId,
          cylinderId: tag?.cylinderId || null,
          timestamp: new Date(),
          estadoAnterior,
          estadoNuevo: transicion.estadoNuevo,
          origen: (origen || 'AUTOMATICO') as any,
          usuario: usuario || null,
          observacion: observacion || null,
        },
      })

      if (transicion.auto && transicion.estadoNuevo && tag?.cylinderId) {
        await tx.cylinder.update({
          where: { id: tag.cylinderId },
          data: { estado: transicion.estadoNuevo },
        })
        await logAudit({
          accion: 'CAMBIO_ESTADO',
          entidad: 'Cylinder',
          entidadId: tag.cylinderId,
          usuario: usuario || 'sistema',
          detalle: { desde: estadoAnterior, hacia: transicion.estadoNuevo, zona: zona.tipo, eventoRfidId: ev.id },
        }, tx)
      }

      return { evento: ev }
    })

    evento = result.evento
  }

  await cerrarSesionesVencidas()

  return {
    sesion: { id: sesion.id, conteo: sesion.conteo, procesado: sesion.procesado },
    evento: evento ? {
      id: evento.id,
      tid: evento.tid,
      estadoAnterior: evento.estadoAnterior,
      estadoNuevo: evento.estadoNuevo,
    } : null,
    tag: tag
      ? { tid: tag.tid, asociado: !!tag.cylinderId, cylinderId: tag.cylinderId }
      : { tid, asociado: false, cylinderId: null },
    esNuevo,
    cilindro: tag?.cylinder ? {
      id: tag.cylinder.id,
      numeroSerie: tag.cylinder.numeroSerie,
      estado: tag.cylinder.estado,
    } : null,
  }
}
