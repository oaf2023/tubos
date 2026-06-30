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
    if (order.estado !== 'VALIDADO') return NextResponse.json({ error: 'El pedido debe estar VALIDADO' }, { status: 400 })

    await db.pedidoLectura.update({
      where: { id: orderId },
      data: { estado: 'EN_REPARTO' },
    })

    await logAudit({
      accion: 'CAMBIO_ESTADO',
      entidad: 'PedidoLectura',
      entidadId: orderId,
      usuario: user?.usuario || 'interno',
      detalle: { estadoAnterior: order.estado, estadoNuevo: 'EN_REPARTO' },
    })

    return NextResponse.json({ success: true, estado: 'EN_REPARTO' })
  } catch (e) {
    console.error('POST /api/internal/orders/[orderId]/dispatch', e)
    return NextResponse.json({ error: 'Error al despachar pedido' }, { status: 500 })
  }
}
