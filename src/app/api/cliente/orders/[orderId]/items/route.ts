import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getUser(req: NextRequest) {
  const header = req.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const user = getUser(req)
    const body = await req.json()
    const { cylinderId, codigoTubo, tipoGas, capacidad, accion, cantidad, observacion, fotoUrl } = body

    if (!accion) {
      return NextResponse.json({ error: 'Acción requerida' }, { status: 400 })
    }

    const order = await db.pedidoLectura.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (order.estado !== 'BORRADOR') {
      return NextResponse.json({ error: 'Solo se pueden modificar pedidos en borrador' }, { status: 400 })
    }

    if (user?.tipo === 'cliente' && order.clienteId !== user.clienteId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    let tuboData: any = { cylinderId: null, codigoTubo: codigoTubo || null }
    if (cylinderId) {
      const cylinder = await db.cylinder.findUnique({
        where: { id: cylinderId },
        include: { gas: true },
      })
      if (cylinder) {
        tuboData = {
          cylinderId: cylinder.id,
          codigoTubo: cylinder.numeroSerie,
          tipoGas: `${cylinder.gas.nombre} (${cylinder.gas.codigo})`,
          capacidad: cylinder.capacidadLitros,
        }
      }
    }

    const item = await db.pedidoLecturaItem.create({
      data: {
        pedidoId: orderId,
        cylinderId: tuboData.cylinderId,
        codigoTubo: tuboData.codigoTubo,
        tipoGas: tipoGas || tuboData.tipoGas || null,
        capacidad: capacidad || tuboData.capacidad || null,
        accion,
        cantidad: cantidad || 1,
        observacion: observacion || null,
        fotoUrl: fotoUrl || null,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST /api/cliente/orders/[orderId]/items', e)
    return NextResponse.json({ error: 'Error al agregar item' }, { status: 500 })
  }
}
