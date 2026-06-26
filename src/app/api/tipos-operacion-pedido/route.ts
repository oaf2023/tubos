import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const tipos = await db.tipoOperacionPedido.findMany({ orderBy: { orden: 'asc' } })
    return NextResponse.json(tipos)
  } catch (e) {
    console.error('GET /api/tipos-operacion-pedido', e)
    return NextResponse.json({ error: 'Error al listar tipos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, activo, orden } = await req.json()
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }
    const tipo = await db.tipoOperacionPedido.create({
      data: { nombre: nombre.trim(), activo: activo ?? true, orden: orden ?? 0 },
    })
    return NextResponse.json(tipo, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Ya existe un tipo con ese nombre' }, { status: 400 })
    console.error('POST /api/tipos-operacion-pedido', e)
    return NextResponse.json({ error: 'Error al crear tipo' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, nombre, activo, orden } = await req.json()
    if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    const data: Record<string, unknown> = {}
    if (nombre !== undefined) data.nombre = nombre.trim()
    if (activo !== undefined) data.activo = Boolean(activo)
    if (orden !== undefined) data.orden = orden
    const tipo = await db.tipoOperacionPedido.update({ where: { id }, data })
    return NextResponse.json(tipo)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Ya existe un tipo con ese nombre' }, { status: 400 })
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Tipo no encontrado' }, { status: 404 })
    console.error('PUT /api/tipos-operacion-pedido', e)
    return NextResponse.json({ error: 'Error al actualizar tipo' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    await db.tipoOperacionPedido.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Tipo no encontrado' }, { status: 404 })
    console.error('DELETE /api/tipos-operacion-pedido', e)
    return NextResponse.json({ error: 'Error al eliminar tipo' }, { status: 500 })
  }
}
