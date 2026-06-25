import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MAPA_ESTADOS: Record<string, string> = {
  VACIOS: 'VACIO_DEPOSITO',
  LLENOS: 'LLENO_DISPONIBLE',
  SALIDA_REPARTO: 'EN_REPARTO',
  ENVIO_CARGA: 'ENVIADO_A_CARGA',
  RECEPCION_CARGA: 'LLENO_DISPONIBLE',
  MANTENIMIENTO: 'MANTENIMIENTO',
  BAJA: 'BAJA',
}

export async function GET() {
  try {
    const eventos = await db.eventoRFID.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { zona: true, lector: true, tag: true },
    })
    return NextResponse.json(eventos)
  } catch (e) {
    console.error('GET /api/deposito/eventos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.tid || !body.lectorId) {
      return NextResponse.json({ error: 'tid y lectorId requeridos' }, { status: 400 })
    }

    const lector = await db.lectorIoT.findUnique({
      where: { id: body.lectorId },
      include: { zona: true },
    })
    if (!lector) return NextResponse.json({ error: 'Lector no encontrado' }, { status: 404 })

    const tag = await db.tagRFID.findUnique({ where: { tid: body.tid } })
    let cylinderId = tag?.cylinderId || null
    let estadoAnterior: string | null = null

    if (cylinderId) {
      const cylinder = await db.cylinder.findUnique({ where: { id: cylinderId } })
      estadoAnterior = cylinder?.estado || null

      const estadoNuevo = MAPA_ESTADOS[lector.zona.tipo]
      if (estadoNuevo && cylinder) {
        await db.cylinder.update({
          where: { id: cylinderId },
          data: { estado: estadoNuevo },
        })
      }
    }

    const evento = await db.eventoRFID.create({
      data: {
        tid: body.tid,
        cylinderId,
        lectorId: body.lectorId,
        zonaId: lector.zonaId,
        estadoAnterior,
        estadoNuevo: lector.zona.tipo ? MAPA_ESTADOS[lector.zona.tipo] || null : null,
        origen: body.origen || 'AUTOMATICO',
        usuario: body.usuario || null,
        observacion: body.observacion || null,
      },
    })

    if (cylinderId) {
      const cylinder = await db.cylinder.findUnique({ where: { id: cylinderId } })
      if (cylinder) {
        await db.cylinderMovimiento.create({
          data: {
            cylinderId,
            tipo: 'TRASLADO',
            descripcion: `Lectura RFID en zona ${lector.zona.nombre} (${lector.zona.tipo})`,
            usuario: body.usuario || 'SISTEMA',
            ubicacion: lector.zona.nombre,
          },
        })
      }
    }

    return NextResponse.json(evento, { status: 201 })
  } catch (e) {
    console.error('POST /api/deposito/eventos', e)
    return NextResponse.json({ error: 'Error al procesar evento RFID' }, { status: 500 })
  }
}
