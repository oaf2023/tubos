import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncMantenimientoToGraph } from '@/lib/neo4j'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const registros = await db.mantenimiento.findMany({
      where: { cylinderId: id },
      orderBy: { fecha: 'desc' },
      take: 100,
    })
    return NextResponse.json(registros)
  } catch (e) {
    console.error('GET mantenimiento', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.tipo) {
      return NextResponse.json({ error: 'tipo es obligatorio' }, { status: 400 })
    }

    const mant = await db.mantenimiento.create({
      data: {
        cylinderId: id,
        tipo: body.tipo,
        descripcion: body.descripcion || null,
        tecnico: body.tecnico || null,
        costo: body.costo ? parseFloat(body.costo) : null,
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
      },
    })

    // Sincronizar con Neo4j
    await syncMantenimientoToGraph({
      id: mant.id,
      cylinderId: mant.cylinderId,
      tipo: mant.tipo,
      descripcion: mant.descripcion,
      tecnico: mant.tecnico,
      costo: mant.costo,
      fecha: mant.fecha,
    })

    return NextResponse.json(mant, { status: 201 })
  } catch (e) {
    console.error('POST mantenimiento', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: cylinderId } = await params
    const { searchParams } = new URL(request.url)
    const mantId = searchParams.get('mantenimientoId')
    if (!mantId) {
      return NextResponse.json({ error: 'mantenimientoId es obligatorio' }, { status: 400 })
    }
    await db.mantenimiento.delete({ where: { id: mantId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE mantenimiento', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
