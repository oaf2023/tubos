import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const cilindros = await db.pedidoCilindro.findMany({
      where: { pedidoId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(cilindros)
  } catch (e) {
    console.error('GET /api/pedidos/[id]/cilindros', e)
    return NextResponse.json({ error: 'Error al obtener cilindros' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: pedidoId } = await params
    const body = await request.json()

    if (!body.numeroSerie || typeof body.numeroSerie !== 'string') {
      return NextResponse.json(
        { error: 'numeroSerie es obligatorio' },
        { status: 400 },
      )
    }

    // Verificar si el cilindro existe en inventario
    const cylinder = await db.cylinder.findUnique({
      where: { numeroSerie: body.numeroSerie.trim() },
      include: { gas: true },
    })

    const cilindro = await db.pedidoCilindro.create({
      data: {
        pedidoId,
        numeroSerie: body.numeroSerie.trim(),
        gasCodigo: cylinder?.gas.codigo || body.gasCodigo || null,
        verified: !!cylinder,
      },
    })

    return NextResponse.json({ ...cilindro, cylinder: cylinder || null }, { status: 201 })
  } catch (e) {
    console.error('POST /api/pedidos/[id]/cilindros', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al agregar cilindro' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: pedidoId } = await params
    const { searchParams } = new URL(request.url)
    const cilindroId = searchParams.get('cilindroId')
    if (!cilindroId) {
      return NextResponse.json({ error: 'cilindroId es obligatorio' }, { status: 400 })
    }

    await db.pedidoCilindro.delete({
      where: { id: cilindroId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/pedidos/[id]/cilindros', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al eliminar cilindro' },
      { status: 500 },
    )
  }
}
