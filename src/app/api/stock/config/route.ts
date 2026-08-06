import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const configs = await db.configStockGas.findMany({
      include: { gas: { select: { id: true, codigo: true, nombre: true } } },
      orderBy: { gas: { codigo: 'asc' } },
    })
    return NextResponse.json(configs)
  } catch (e) {
    console.error('GET /api/stock/config', e)
    return NextResponse.json({ error: 'Error al obtener configuración de stock' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.gasId) {
      return NextResponse.json({ error: 'gasId es requerido' }, { status: 400 })
    }
    const gasExiste = await db.gas.findUnique({ where: { id: body.gasId }, select: { id: true } })
    if (!gasExiste) {
      return NextResponse.json({ error: 'Gas no encontrado' }, { status: 404 })
    }
    const data: Record<string, unknown> = {}
    if (body.stockMinimo !== undefined) data.stockMinimo = parseInt(body.stockMinimo, 10)
    if (body.stockSeguridad !== undefined) data.stockSeguridad = parseInt(body.stockSeguridad, 10)
    if (body.cantidadOptimaPedido !== undefined) data.cantidadOptimaPedido = parseInt(body.cantidadOptimaPedido, 10)

    const config = await db.configStockGas.upsert({
      where: { gasId: body.gasId },
      update: data,
      create: {
        gasId: body.gasId,
        stockMinimo: parseInt(body.stockMinimo ?? 0, 10),
        stockSeguridad: parseInt(body.stockSeguridad ?? 0, 10),
        cantidadOptimaPedido: parseInt(body.cantidadOptimaPedido ?? 0, 10),
      },
      include: { gas: { select: { id: true, codigo: true, nombre: true } } },
    })
    return NextResponse.json(config)
  } catch (e) {
    console.error('PUT /api/stock/config', e)
    return NextResponse.json({ error: 'Error al actualizar configuración de stock' }, { status: 500 })
  }
}
