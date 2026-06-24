import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const remitos = await db.remito.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    return NextResponse.json(remitos)
  } catch (e) {
    console.error('GET /api/remitos', e)
    return NextResponse.json({ error: 'Error al obtener remitos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clienteId, cliente, tipo, tecnico, observaciones, items } = body

    const max = await db.remito.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
    const numero = (max?.numero ?? 0) + 1

    const remito = await db.remito.create({
      data: {
        numero,
        clienteId,
        cliente,
        tipo: tipo || 'ENTREGA',
        estado: 'PENDIENTE',
        tecnico,
        observaciones,
        items: {
          create: (items || []).map((it: any) => ({
            cylinderId: it.cylinderId || null,
            numeroSerie: it.numeroSerie || null,
            gasId: it.gasId,
            gasCodigo: it.gasCodigo,
            tipoOperacion: it.tipoOperacion || 'ALQUILER',
            cantidad: it.cantidad || 1,
            precioUnitario: it.precioUnitario || null,
            subtotal: it.subtotal || null,
          })),
        },
      },
      include: { items: true },
    })
    return NextResponse.json(remito)
  } catch (e) {
    console.error('POST /api/remitos', e)
    return NextResponse.json({ error: 'Error al crear remito' }, { status: 500 })
  }
}
