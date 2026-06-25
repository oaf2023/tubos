import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const stock = await db.stockGas.findMany({
      include: { gas: true },
      orderBy: { gas: { nombre: 'asc' } },
    })
    const zonas = await db.zonaLectura.findMany({ orderBy: { nombre: 'asc' } })
    const lectores = await db.lectorIoT.findMany({ include: { zona: true } })
    const ultimosEventos = await db.eventoRFID.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: { zona: true, lector: true, tag: true },
    })
    return NextResponse.json({ stock, zonas, lectores, ultimosEventos })
  } catch (e) {
    console.error('GET /api/deposito', e)
    return NextResponse.json({ error: 'Error al obtener datos del depósito' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    if (action === 'movimiento-manual') {
      const mov = await db.movimientoStock.create({
        data: {
          gasId: body.gasId,
          tipo: body.tipo,
          cantidad: body.cantidad,
          estadoAnterior: body.estadoAnterior,
          estadoNuevo: body.estadoNuevo,
          usuario: body.usuario,
          observacion: body.observacion,
        },
      })
      return NextResponse.json(mov, { status: 201 })
    }
    return NextResponse.json({ error: 'acción no reconocida' }, { status: 400 })
  } catch (e) {
    console.error('POST /api/deposito', e)
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 })
  }
}
