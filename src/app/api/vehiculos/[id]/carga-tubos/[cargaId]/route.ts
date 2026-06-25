import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string }> }) {
  try {
    const { id, cargaId } = await params
    const sesion = await db.cargaVehiculo.findFirstOrThrow({
      where: { id: cargaId, vehiculoId: id },
      include: {
        items: {
          include: {
            cylinder: {
              include: { gas: true },
            },
          },
          orderBy: { posicion: 'asc' },
        },
      },
    })
    return NextResponse.json(sesion)
  } catch (e) {
    console.error('GET carga-tubos/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string }> }) {
  try {
    const { id, cargaId } = await params
    await db.cargaVehiculo.delete({ where: { id: cargaId, vehiculoId: id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE carga-tubos/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
