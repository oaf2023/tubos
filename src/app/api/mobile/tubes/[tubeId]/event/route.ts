import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { registrarMovimientoTubo, validarEntregaCliente, motivoDevolucionAEstado } from '@/lib/trazabilidad'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tubeId: string }> }) {
  try {
    const { tubeId } = await params
    const body = await req.json()
    const { accion, observacion, origen, latitud, longitud, fotoUrl, motivo, clienteId } = body

    if (!accion) {
      return NextResponse.json({ error: 'Acción requerida' }, { status: 400 })
    }

    const cylinder = await db.cylinder.findUnique({ where: { id: tubeId }, include: { gas: true } })
    if (!cylinder) {
      return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })
    }

    const userHeader = req.headers.get('x-user')
    let user: any = null
    if (userHeader) {
      try { user = JSON.parse(userHeader) } catch { /* ignore */ }
    }

    const estadoAnterior = cylinder.estado
    const usuarioNombre = user?.nombre || user?.usuario || null

    if (accion === 'RETIRO' || accion === 'DEVOLUCION') {
      const clienteValidar = clienteId || (user?.tipo === 'cliente' ? user.clienteId : cylinder.clienteId) || null
      const validacion = await validarEntregaCliente(tubeId, clienteValidar)
      const esGerencia = user?.nivelAcceso === 0

      if (!validacion.valido && clienteValidar && !esGerencia) {
        return NextResponse.json(
          {
            error: 'Operación no permitida',
            alerta: {
              codigo: 'TUBO_NO_ENTREGADO_CLIENTE',
              mensaje: validacion.motivo,
              entregadoA: validacion.entregadoA,
              fechaEntrega: validacion.fechaEntrega,
            },
          },
          { status: 409 },
        )
      }

      const estadoNuevo = accion === 'RETIRO' ? (motivo ? motivoDevolucionAEstado(motivo) : 'EN_DEPOSITO') : estadoAnterior
      const autorizado = !validacion.valido && esGerencia ? usuarioNombre : null
      const detalleObs = [
        observacion || null,
        motivo ? `Motivo devolución: ${motivo}` : null,
        autorizado ? `Autorizado fuera de validación por ${autorizado}` : null,
      ]
        .filter(Boolean)
        .join(' | ')

      await registrarMovimientoTubo({
        cylinderId: tubeId,
        accion: accion === 'RETIRO' ? 'RETIRO' : 'DEVOLUCION',
        tipoMovimiento: accion === 'RETIRO' ? 'RETIRO' : 'DEVOLUCION',
        descripcion: `Retiro/Devolución desde móvil: ${accion}${motivo ? ` (${motivo})` : ''}`,
        estadoAnterior,
        estadoNuevo: estadoNuevo as any,
        clienteId: cylinder.clienteId,
        clienteNombre: cylinder.cliente,
        ubicacion: cylinder.ubicacionNombre,
        lat: latitud ? parseFloat(latitud) : cylinder.ubicacionLat,
        lng: longitud ? parseFloat(longitud) : cylinder.ubicacionLng,
        usuarioId: user?.id || null,
        usuarioNombre,
        observacion: detalleObs,
        fotoUrl: fotoUrl || null,
        origen: origen || 'CELULAR_QR',
        autorizadoPor: autorizado,
      })

      await logAudit({
        accion: 'CAMBIO_ESTADO',
        entidad: 'Cylinder',
        entidadId: tubeId,
        usuario: usuarioNombre || 'anónimo',
        detalle: { accion, motivo, estadoAnterior, estadoNuevo, observacion, autorizado },
      })

      return NextResponse.json({ eventId: tubeId, estadoAnterior, estadoNuevo, autorizado, motivo })
    }

    const estadoNuevo = estadoAnterior

    if (user?.tipo === 'cliente' && user.clienteId !== cylinder.clienteId) {
      return NextResponse.json({ error: 'No tiene permisos sobre este tubo' }, { status: 403 })
    }

    const evento = await db.eventoTubo.create({
      data: {
        cylinderId: tubeId,
        origen: (origen || 'CELULAR_QR') as any,
        accion: accion as any,
        usuarioId: user?.id,
        usuarioNombre,
        clienteId: user?.tipo === 'cliente' ? user.clienteId : undefined,
        clienteNombre: user?.nombre,
        latitud: latitud || null,
        longitud: longitud || null,
        estadoAnterior,
        estadoNuevo,
        observacion: observacion || null,
        fotoUrl: fotoUrl || null,
      },
    })

    await logAudit({
      accion: 'CAMBIO_ESTADO',
      entidad: 'Cylinder',
      entidadId: tubeId,
      usuario: usuarioNombre || 'anónimo',
      detalle: { accion, estadoAnterior, observacion },
    })

    return NextResponse.json({ eventId: evento.id, estadoAnterior, estadoNuevo })
  } catch (e) {
    console.error('POST /api/mobile/tubes/[tubeId]/event', e)
    return NextResponse.json({ error: 'Error al registrar evento' }, { status: 500 })
  }
}