import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { requireRole } from '@/lib/auth'

function getUser(req: NextRequest) {
  const header = req.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const roleCheck = await requireRole('admin', 'deposito', 'reparto')(req)
    if (roleCheck) return roleCheck

    const { orderId } = await params
    const user = getUser(req)

    const order = await db.pedidoLectura.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    if (order.estado !== 'EN_REPARTO') return NextResponse.json({ error: 'El pedido debe estar EN_REPARTO' }, { status: 400 })

    await db.pedidoLectura.update({
      where: { id: orderId },
      data: { estado: 'ENTREGADO' },
    })

    await logAudit({
      accion: 'CAMBIO_ESTADO',
      entidad: 'PedidoLectura',
      entidadId: orderId,
      usuario: user?.usuario || 'interno',
      detalle: { estadoAnterior: order.estado, estadoNuevo: 'ENTREGADO' },
    })

    return NextResponse.json({ success: true, estado: 'ENTREGADO' })
  } catch (e) {
    console.error('POST /api/internal/orders/[orderId]/deliver', e)
    return NextResponse.json({ error: 'Error al entregar pedido' }, { status: 500 })
  }
}
