import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const clientes = await db.cliente.findMany({
      where: {
        lat: { not: null },
        lng: { not: null },
        activo: true,
      },
      include: {
        _count: { select: { cylinders: true } },
      },
      orderBy: { nombre: 'asc' },
    })

    const result = await Promise.all(
      clientes.map(async (c) => {
        const pedidosPendientes = await db.pedido.findMany({
          where: {
            clienteId: c.id,
            estado: 'PENDIENTE',
          },
          include: {
            items: true,
            cilindros: true,
          },
          orderBy: { fecha: 'desc' },
        })

        const totalPendientes = pedidosPendientes.length
        const totalCilindrosPendientes = pedidosPendientes.reduce(
          (sum, p) => sum + p.cilindros.length,
          0
        )

        return {
          id: c.id,
          nombre: c.nombre,
          taxId: c.taxId,
          contacto: c.contacto,
          lat: c.lat,
          lng: c.lng,
          ubicaciones: c.ubicaciones,
          totalCilindros: c._count.cylinders,
          pedidosPendientes: totalPendientes,
          cilindrosPendientes: totalCilindrosPendientes,
        }
      })
    )

    return NextResponse.json(result)
  } catch (e) {
    console.error('GET /api/clientes/con-coordenadas', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener clientes con coordenadas' }, { status: 500 })
  }
}
