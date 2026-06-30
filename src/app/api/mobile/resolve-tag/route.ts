import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { createHash } from 'crypto'

const EVENT_HASH_SALT = process.env.EVENT_HASH_SALT || 'tubos-gastrack-default-salt'

export async function POST(req: NextRequest) {
  try {
    const { valor, origen, read_source, device_id, lat, lng } = await req.json()
    if (!valor) {
      return NextResponse.json({ error: 'Valor del tag requerido' }, { status: 400 })
    }

    const idTubo = await db.identificadorTubo.findFirst({
      where: { valor, activo: true },
      include: {
        cylinder: {
          include: { gas: true },
        },
      },
    })

    if (!idTubo) {
      return NextResponse.json({ error: 'Tag no registrado' }, { status: 404 })
    }

    const cylinder = idTubo.cylinder
    const userHeader = req.headers.get('x-user')
    let user: any = null
    if (userHeader) {
      try { user = JSON.parse(userHeader) } catch { /* ignore */ }
    }

    const tubeId = cylinder.id

    const alertas: string[] = []
    const hoy = new Date()
    const venc = new Date(cylinder.fechaProximoRetest)
    if (venc < hoy) {
      alertas.push('PH VENCIDA')
    } else {
      const diff = (venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      if (diff <= 60) alertas.push('PH PRÓXIMA A VENCER')
    }
    if (cylinder.estado === 'PH_VENCIDO') alertas.push('RECALIFICACIÓN REQUERIDA')
    if (cylinder.estado === 'MANTENIMIENTO') alertas.push('EN MANTENIMIENTO')

    const quickViewBase = {
      tubeId: cylinder.id,
      codigoTubo: cylinder.numeroSerie,
      tipoGas: cylinder.gas.nombre,
      gasCodigo: cylinder.gas.codigo,
      gasColor: cylinder.gas.colorHex,
      capacidad: cylinder.capacidadLitros,
      estado: cylinder.estado,
      alertas,
    }

    if (!user) {
      await logAudit({
        accion: 'CAMBIO_ESTADO',
        entidad: 'IdentificadorTubo',
        entidadId: idTubo.id,
        usuario: 'anónimo',
        detalle: { tubeId: cylinder.id, tagValor: valor, origen, publico: true },
      })

      const fechaHora = new Date().toISOString()
      const hashPayload = `${tubeId}CONSULTA${origen || 'CELULAR_QR'}${fechaHora}${EVENT_HASH_SALT}`
      const hashEvento = createHash('sha256').update(hashPayload).digest('hex')

      await db.eventoTubo.create({
        data: {
          cylinderId: tubeId,
          origen: origen || 'CELULAR_QR',
          readSource: read_source || null,
          accion: 'CONSULTA',
          latitud: lat || null,
          longitud: lng || null,
          hashEvento,
        },
      })

      return NextResponse.json({
        tubeId,
        quickView: quickViewBase,
        quick_view_url: `/api/mobile/tubes/${tubeId}/quick-view`,
      })
    }

    const hasPermission = user.tipo !== 'cliente' || user.clienteId === cylinder.clienteId

    const quickViewFull = {
      ...quickViewBase,
      clienteAsignado: cylinder.cliente,
      clienteId: cylinder.clienteId,
      presionActual: cylinder.presionActual,
      ubicacion: cylinder.ubicacionNombre,
      provincia: cylinder.provincia,
      fechaVencimientoPrueba: cylinder.fechaProximoRetest,
      ultimoMovimiento: cylinder.ultimoMovimiento,
    }

    await logAudit({
      accion: 'CAMBIO_ESTADO',
      entidad: 'IdentificadorTubo',
      entidadId: idTubo.id,
      usuario: user?.usuario || 'anónimo',
      detalle: { tubeId: cylinder.id, tagValor: valor, origen, permitido: hasPermission },
    })

    const fechaHora = new Date().toISOString()
    const hashPayload = `${tubeId}CONSULTA${origen || 'CELULAR_QR'}${fechaHora}${EVENT_HASH_SALT}`
    const hashEvento = createHash('sha256').update(hashPayload).digest('hex')

    await db.eventoTubo.create({
      data: {
        cylinderId: cylinder.id,
        origen: origen || 'CELULAR_QR',
        readSource: read_source || null,
        accion: 'CONSULTA',
        usuarioId: user?.id,
        usuarioNombre: user?.nombre,
        clienteId: user?.tipo === 'cliente' ? user.clienteId : undefined,
        latitud: lat || null,
        longitud: lng || null,
        hashEvento,
      },
    })

    return NextResponse.json({
      tubeId,
      quickView: quickViewFull,
      quick_view_url: `/api/mobile/tubes/${tubeId}/quick-view`,
      permisos: {
        puedeOperar: hasPermission,
        puedePedirReposicion: hasPermission,
        puedeRetirar: hasPermission,
        puedeReportar: hasPermission,
      },
      accionesDisponibles: hasPermission
        ? ['CONTROL', 'PEDIDO_REPOSICION', 'RETIRO', 'NOVEDAD', 'REPORTAR']
        : ['CONSULTA'],
    })
  } catch (e) {
    console.error('POST /api/mobile/resolve-tag', e)
    return NextResponse.json({ error: 'Error al resolver tag' }, { status: 500 })
  }
}
