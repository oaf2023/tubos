import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const facturas = await db.factura.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    return NextResponse.json(facturas)
  } catch (e) {
    console.error('GET /api/facturas', e)
    return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clienteId, cliente, fechaVencimiento, fechaDesde, fechaHasta, tipoPeriodo,
      remitoIds, items, observaciones, subtotal, descuento, impuestos,
      saldoAnterior, notasCredito, pagosAplicados, totalGeneral,
    } = body

    const max = await db.factura.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
    const numero = (max?.numero ?? 0) + 1

    const totalItems = (items || []).reduce((s: number, it: any) => s + (it.subtotal || 0), 0)

    const factura = await db.factura.create({
      data: {
        numero,
        clienteId,
        cliente,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        fechaDesde: fechaDesde ? new Date(fechaDesde) : null,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : null,
        tipoPeriodo: tipoPeriodo || null,
        remitoIds: (remitoIds || []).join(','),
        subtotal: subtotal ?? totalItems,
        descuento: descuento ?? 0,
        impuestos: impuestos ?? 0,
        total: totalItems,
        saldoAnterior: saldoAnterior ?? 0,
        notasCredito: notasCredito ?? 0,
        pagosAplicados: pagosAplicados ?? 0,
        totalGeneral: totalGeneral ?? (totalItems + (saldoAnterior ?? 0) - (notasCredito ?? 0) - (pagosAplicados ?? 0)),
        estado: body.estado || 'PENDIENTE',
        observaciones,
        items: {
          create: (items || []).map((it: any) => ({
            concepto: it.concepto,
            tipo: it.tipo || 'ALQUILER',
            remitoItemId: it.remitoItemId || null,
            cylinderId: it.cylinderId || null,
            numeroSerie: it.numeroSerie || null,
            diasFacturados: it.diasFacturados || null,
            cantidad: it.cantidad || 1,
            precioUnitario: it.precioUnitario || 0,
            subtotal: it.subtotal || 0,
          })),
        },
      },
      include: { items: true },
    })
    return NextResponse.json(factura)
  } catch (e) {
    console.error('POST /api/facturas', e)
    return NextResponse.json({ error: 'Error al crear factura' }, { status: 500 })
  }
}
