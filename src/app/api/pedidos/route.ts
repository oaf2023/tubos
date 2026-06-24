import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const PRECIOS_GAS: Record<string, number> = {
  AR: 15000, C2H2: 22000, O2: 12000, CO2: 18000, N2: 10000,
  'MIX-7525': 16000, HE: 28000, 'AR-HE': 24000, H2: 35000,
}

export async function GET() {
  try {
    const pedidos = await db.pedido.findMany({
      include: { gas: true, items: true, cilindros: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(pedidos)
  } catch (e) {
    console.error('GET /api/pedidos', e)
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.cliente || !body.renglones || !Array.isArray(body.renglones) || body.renglones.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos: cliente y renglones (array no vacío)' },
        { status: 400 }
      )
    }

    const items: { concepto: string; monto: number }[] = []
    let total = 0

    for (const r of body.renglones) {
      const gas = await db.gas.findUnique({ where: { id: r.gasId } })
      if (!gas) continue
      const precioUnit = PRECIOS_GAS[gas.codigo] || 15000
      const cant = r.cantidad || 1

      items.push({ concepto: `${gas.nombre} — Carga × ${cant}`, monto: precioUnit * cant })
      total += precioUnit * cant

      if (r.operacionEnvase === 'VENTA_NUEVO') {
        items.push({ concepto: `${gas.nombre} — Cilindro nuevo × ${cant}`, monto: 45000 * cant })
        total += 45000 * cant
      }

      if (r.operacionEnvase === 'CANJE' && r.phVigente === false) {
        items.push({ concepto: `${gas.nombre} — Re-ensayo/PH × ${cant}`, monto: 8500 * cant })
        total += 8500 * cant
      }
    }

    const primerGasId = body.renglones[0]?.gasId

    const pedido = await db.pedido.create({
      data: {
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
        cliente: body.cliente,
        clienteId: body.clienteId || null,
        estadoCuenta: body.estadoCuenta || 'OK',
        gasId: primerGasId,
        operacionEnvase: body.renglones[0]?.operacionEnvase || 'CANJE',
        phVigente: null,
        phObservacion: null,
        total,
        estado: body.estado || 'PENDIENTE',
        observaciones: body.observaciones || null,
        items: { create: items },
      },
      include: { gas: true, items: true, cilindros: true },
    })

    return NextResponse.json(pedido, { status: 201 })
  } catch (e) {
    console.error('POST /api/pedidos', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear pedido' },
      { status: 500 }
    )
  }
}
