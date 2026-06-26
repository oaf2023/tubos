import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { findOrCreateSesion, cerrarSesionesVencidas } from '@/lib/rfid'
import { getTransicion } from '@/lib/rfid-rules'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lectorId, zonaId, tid } = body

    if (!lectorId || !zonaId || !tid) {
      return NextResponse.json({ error: 'lectorId, zonaId y tid son requeridos' }, { status: 400 })
    }

    const lector = await db.lectorIoT.findUnique({ where: { id: lectorId }, include: { zona: true } })
    if (!lector || !lector.activo) {
      return NextResponse.json({ error: 'Lector no encontrado o inactivo' }, { status: 404 })
    }

    const zona = await db.zonaLectura.findUnique({ where: { id: zonaId } })
    if (!zona || !zona.activo) {
      return NextResponse.json({ error: 'Zona no encontrada o inactiva' }, { status: 404 })
    }

    const tag = await db.tagRFID.findUnique({ where: { tid }, include: { cylinder: true } })

    const sesion = await findOrCreateSesion(lectorId, zonaId, tid)

    let evento = null
    let esNuevo = false

    if (sesion.conteo <= 1) {
      esNuevo = true
      const estadoAnterior = tag?.cylinder?.estado || null
      const transicion = estadoAnterior ? getTransicion(zona.tipo, estadoAnterior as any) : { estadoNuevo: null, auto: false }

      evento = await db.eventoRFID.create({
        data: {
          tid,
          lectorId,
          zonaId,
          cylinderId: tag?.cylinderId || null,
          timestamp: new Date(),
          estadoAnterior,
          estadoNuevo: transicion.estadoNuevo,
          origen: body.origen || 'AUTOMATICO',
          usuario: body.usuario || null,
          observacion: body.observacion || null,
        },
      })

      if (transicion.auto && transicion.estadoNuevo && tag?.cylinderId) {
        await db.cylinder.update({
          where: { id: tag.cylinderId },
          data: { estado: transicion.estadoNuevo },
        })
        await logAudit({
          accion: 'CAMBIO_ESTADO',
          entidad: 'Cylinder',
          entidadId: tag.cylinderId,
          usuario: body.usuario || 'sistema',
          detalle: { desde: estadoAnterior, hacia: transicion.estadoNuevo, zona: zona.tipo, eventoRfidId: evento.id },
        })
      }
    }

    await cerrarSesionesVencidas()

    return NextResponse.json({
      sesion: { id: sesion.id, conteo: sesion.conteo, procesado: sesion.procesado },
      evento: evento ? {
        id: evento.id,
        tid: evento.tid,
        estadoAnterior: evento.estadoAnterior,
        estadoNuevo: evento.estadoNuevo,
      } : null,
      tag: tag ? { tid: tag.tid, asociado: !!tag.cylinderId, cylinderId: tag.cylinderId } : { tid, asociado: false },
      esNuevo,
      cilindro: tag?.cylinder ? {
        id: tag.cylinder.id,
        numeroSerie: tag.cylinder.numeroSerie,
        estado: tag.cylinder.estado,
      } : null,
    })
  } catch (e) {
    console.error('POST /api/rfid/eventos', e)
    return NextResponse.json({ error: 'Error al procesar evento RFID' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const tid = searchParams.get('tid') || undefined

    const where: any = {}
    if (tid) where.tid = tid

    const eventos = await db.eventoRFID.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        lector: { select: { codigo: true, nombre: true } },
        zona: { select: { codigo: true, nombre: true, tipo: true } },
      },
    })

    return NextResponse.json(eventos)
  } catch (e) {
    console.error('GET /api/rfid/eventos', e)
    return NextResponse.json({ error: 'Error al obtener eventos RFID' }, { status: 500 })
  }
}
