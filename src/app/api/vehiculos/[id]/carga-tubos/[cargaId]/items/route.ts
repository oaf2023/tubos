import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string }> }) {
  try {
    const { id, cargaId } = await params
    const body = await request.json()
    // Verify carga exists and belongs to this vehicle
    await db.cargaVehiculo.findFirstOrThrow({ where: { id: cargaId, vehiculoId: id } })
    const item = await db.cargaVehiculoItem.create({
      data: { cargaId, cylinderId: body.cylinderId, posicion: body.posicion },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'El tubo o posición ya existe en esta carga' }, { status: 409 })
    console.error('POST carga-tubos items', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
