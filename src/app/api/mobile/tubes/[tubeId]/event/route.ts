import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { createHash } from 'crypto'

const EVENT_HASH_SALT = process.env.EVENT_HASH_SALT || 'tubos-gastrack-default-salt'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tubeId: string }> }) {
  try {
    const { tubeId } = await params
    const body = await req.json()
    const { accion, observacion, origen, latitud, longitud, fotoUrl } = body

    if (!accion) {
      return NextResponse.json({ error: 'Acción requerida' }, { status: 400 })
    }

    const cylinder = await db.cylinder.findUnique({ where: { id: tubeId } })
    if (!cylinder) {
      return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })
    }

    const userHeader = req.headers.get('x-user')
    let user: any = null
    if (userHeader) {
      try { user = JSON.parse(userHeader) } catch { /* ignore */ }
    }

    if (user?.tipo === 'cliente' && user.clienteId !== cylinder.clienteId) {
      return NextResponse.json({ error: 'No tiene permisos sobre este tubo' }, { status: 403 })
    }

    const estadoAnterior = cylinder.estado
    let estadoNuevo = estadoAnterior

    if (accion === 'RETIRO') {
      estadoNuevo = 'EN_DEPOSITO'
    }

    if (estadoNuevo !== estadoAnterior) {
      await db.cylinder.update({
        where: { id: tubeId },
        data: { estado: estadoNuevo as any },
      })
    }

    const fechaHora = new Date().toISOString()
    const hashPayload = `${tubeId}${accion}${origen || 'CELULAR_QR'}${fechaHora}${EVENT_HASH_SALT}`
    const hashEvento = createHash('sha256').update(hashPayload).digest('hex')

    const evento = await db.eventoTubo.create({
      data: {
        cylinderId: tubeId,
        origen: origen || 'CELULAR_QR',
        accion,
        usuarioId: user?.id,
        usuarioNombre: user?.nombre,
        clienteId: user?.tipo === 'cliente' ? user.clienteId : undefined,
        clienteNombre: user?.nombre,
        latitud: latitud || null,
        longitud: longitud || null,
        estadoAnterior,
        estadoNuevo,
        observacion: observacion || null,
        fotoUrl: fotoUrl || null,
        hashEvento,
      },
    })

    await logAudit({
      accion: 'CAMBIO_ESTADO',
      entidad: 'Cylinder',
      entidadId: tubeId,
      usuario: user?.usuario || 'anónimo',
      detalle: { accion, estadoAnterior, estadoNuevo, observacion, hashEvento },
    })

    return NextResponse.json({ eventId: evento.id, estadoAnterior, estadoNuevo, hashEvento })
  } catch (e) {
    console.error('POST /api/mobile/tubes/[tubeId]/event', e)
    return NextResponse.json({ error: 'Error al registrar evento' }, { status: 500 })
  }
}
