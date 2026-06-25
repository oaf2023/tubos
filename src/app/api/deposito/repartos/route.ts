import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const repartos = await db.reparto.findMany({
      orderBy: { fecha: 'desc' },
      take: 50,
    })
    return NextResponse.json(repartos)
  } catch (e) {
    console.error('GET /api/deposito/repartos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.codigo) {
      return NextResponse.json({ error: 'codigo requerido' }, { status: 400 })
    }
    const reparto = await db.reparto.create({
      data: {
        codigo: body.codigo,
        clienteId: body.clienteId || null,
        cliente: body.cliente || null,
        vehiculoId: body.vehiculoId || null,
        origenZonaId: body.origenZonaId || null,
        estado: body.estado || 'PENDIENTE',
      },
    })
    return NextResponse.json(reparto, { status: 201 })
  } catch (e) {
    console.error('POST /api/deposito/repartos', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
