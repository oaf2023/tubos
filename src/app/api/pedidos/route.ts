import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse } from '@/lib/api-response'
import { createPedido } from '@/lib/services/pedido-service'

export async function GET() {
  try {
    const pedidos = await db.pedido.findMany({
      include: { gas: true, items: true, cilindros: true },
      orderBy: { createdAt: 'desc' },
    })
    return jsonResponse(pedidos)
  } catch (e) {
    console.error('GET /api/pedidos', e)
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.cliente || !body.renglones || !Array.isArray(body.renglones) || body.renglones.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos: cliente y renglones (array no vacío)' },
        { status: 400 }
      )
    }

    const pedido = await createPedido(body)
    return jsonResponse(pedido, 201)
  } catch (e) {
    console.error('POST /api/pedidos', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear pedido' },
      { status: 500 }
    )
  }
}
