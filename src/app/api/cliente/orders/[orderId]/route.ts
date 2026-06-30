import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getUser(req: NextRequest) {
  const header = req.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const user = getUser(req)

    const order = await db.pedidoLectura.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { cylinder: { include: { gas: true } } },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (user?.tipo === 'cliente' && order.clienteId !== user.clienteId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch (e) {
    console.error('GET /api/cliente/orders/[orderId]', e)
    return NextResponse.json({ error: 'Error al obtener pedido' }, { status: 500 })
  }
}
