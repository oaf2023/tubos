import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

function getUser(req: NextRequest) {
  const header = req.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const user = getUser(req)

    const order = await db.pedidoLectura.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (user?.tipo === 'cliente' && order.clienteId !== user.clienteId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    if (order.estado !== 'BORRADOR') {
      return NextResponse.json({ error: 'El pedido ya fue enviado' }, { status: 400 })
    }

    if (order.items.length === 0) {
      return NextResponse.json({ error: 'El pedido debe tener al menos un item' }, { status: 400 })
    }

    await db.pedidoLectura.update({
      where: { id: orderId },
      data: {
        estado: 'ENVIADO',
        fechaEnvio: new Date(),
      },
    })

    for (const item of order.items) {
      if (item.cylinderId) {
        await db.eventoTubo.create({
          data: {
            cylinderId: item.cylinderId,
            origen: 'CLIENTE_MOVIL',
            accion: 'PEDIDO_REPOSICION',
            usuarioId: user?.id,
            usuarioNombre: user?.nombre,
            clienteId: order.clienteId,
            clienteNombre: order.clienteNombre,
            observacion: `Pedido ${orderId} - ${item.accion}`,
          },
        })
      }
    }

    await logAudit({
      accion: 'CAMBIO_ESTADO',
      entidad: 'PedidoLectura',
      entidadId: orderId,
      usuario: user?.usuario || 'cliente',
      detalle: { estadoAnterior: 'BORRADOR', estadoNuevo: 'ENVIADO' },
    })

    return NextResponse.json({ success: true, estado: 'ENVIADO' })
  } catch (e) {
    console.error('POST /api/cliente/orders/[orderId]/submit', e)
    return NextResponse.json({ error: 'Error al enviar pedido' }, { status: 500 })
  }
}
