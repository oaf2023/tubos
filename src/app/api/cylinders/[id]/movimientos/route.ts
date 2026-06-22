import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/cylinders/[id]/movimientos - historial de auditoría de un tubo
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const movimientos = await db.cylinderMovimiento.findMany({
      where: { cylinderId: id },
      orderBy: { fecha: 'desc' },
      take: 100,
    })
    return NextResponse.json(movimientos)
  } catch (e) {
    console.error('GET movimientos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// POST /api/cylinders/[id]/movimientos - registrar nuevo movimiento manual
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const mov = await db.cylinderMovimiento.create({
      data: {
        cylinderId: id,
        tipo: body.tipo || 'INSPECCION',
        descripcion: body.descripcion || '',
        usuario: body.usuario || 'sistema',
        ubicacion: body.ubicacion || null,
        latOrigen: body.latOrigen ? parseFloat(body.latOrigen) : null,
        lngOrigen: body.lngOrigen ? parseFloat(body.lngOrigen) : null,
        latDestino: body.latDestino ? parseFloat(body.latDestino) : null,
        lngDestino: body.lngDestino ? parseFloat(body.lngDestino) : null,
      },
    })
    return NextResponse.json(mov, { status: 201 })
  } catch (e) {
    console.error('POST movimientos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
