import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { valor, origen } = await req.json()
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
    const quickView = {
      tubeId: cylinder.id,
      codigoTubo: cylinder.numeroSerie,
      tipoGas: cylinder.gas.nombre,
      gasCodigo: cylinder.gas.codigo,
      capacidad: cylinder.capacidadLitros,
      estado: cylinder.estado,
      clienteAsignado: cylinder.cliente,
      clienteId: cylinder.clienteId,
      ubicacion: cylinder.ubicacionNombre,
      provincia: cylinder.provincia,
      fechaVencimientoPrueba: cylinder.fechaProximoRetest,
      colorGas: cylinder.gas.colorHex,
      alertas: [] as string[],
    }

    const hoy = new Date()
    const venc = new Date(cylinder.fechaProximoRetest)
    if (venc < hoy) {
      quickView.alertas.push('PH VENCIDA')
    } else {
      const diff = (venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      if (diff <= 60) quickView.alertas.push('PH PRÓXIMA A VENCER')
    }
    if (cylinder.estado === 'PH_VENCIDO') quickView.alertas.push('RECALIFICACIÓN REQUERIDA')
    if (cylinder.estado === 'MANTENIMIENTO') quickView.alertas.push('EN MANTENIMIENTO')

    const hasPermission = !user || user.tipo !== 'cliente' || user.clienteId === cylinder.clienteId

    await logAudit({
      accion: 'CAMBIO_ESTADO',
      entidad: 'IdentificadorTubo',
      entidadId: idTubo.id,
      usuario: user?.usuario || 'anónimo',
      detalle: { tubeId: cylinder.id, tagValor: valor, origen, permitido: hasPermission },
    })

    await db.eventoTubo.create({
      data: {
        cylinderId: cylinder.id,
        origen: origen || 'CELULAR_QR',
        accion: 'CONSULTA',
        usuarioId: user?.id,
        usuarioNombre: user?.nombre,
        clienteId: user?.tipo === 'cliente' ? user.clienteId : undefined,
      },
    })

    return NextResponse.json({
      tubeId,
      quickView,
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
