import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const pedidos = await db.pedido.findMany({
      where: {
        estado: 'PENDIENTE',
      },
      include: {
        gas: { select: { id: true, nombre: true, codigo: true } },
      },
      orderBy: { fecha: 'desc' },
    })

    const cilindrosPorPedido = await db.pedidoCilindro.groupBy({
      by: ['pedidoId'],
      _count: true,
    })
    const cilindroCountMap = new Map(cilindrosPorPedido.map((c) => [c.pedidoId, c._count]))

    const itemsPorPedido = await db.pedidoItem.groupBy({
      by: ['pedidoId'],
      _count: true,
    })
    const itemsCountMap = new Map(itemsPorPedido.map((i) => [i.pedidoId, i._count]))

    const result = pedidos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      clienteId: p.clienteId,
      cliente: p.cliente,
      gas: p.gas.nombre,
      operacionEnvase: p.operacionEnvase,
      total: p.total,
      itemsCount: itemsCountMap.get(p.id) ?? 0,
      cilindrosCount: cilindroCountMap.get(p.id) ?? 0,
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error('GET /api/pedidos/pendientes-entrega', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener pedidos pendientes' }, { status: 500 })
  }
}
