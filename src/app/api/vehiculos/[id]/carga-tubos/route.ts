import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sesiones = await db.cargaVehiculo.findMany({
      where: { vehiculoId: id },
      include: { _count: { select: { items: true } } },
      orderBy: { fecha: 'desc' },
    })
    return NextResponse.json(sesiones)
  } catch (e) {
    console.error('GET carga-tubos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const sesion = await db.cargaVehiculo.create({
      data: { vehiculoId: id, ...body },
    })
    return NextResponse.json(sesion, { status: 201 })
  } catch (e) {
    console.error('POST carga-tubos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
