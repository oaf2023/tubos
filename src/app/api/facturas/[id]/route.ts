import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    const factura = await db.factura.findUnique({ where: { id }, include: { items: true } })
    if (!factura) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(factura)
  } catch (e) {
    console.error('GET /api/facturas/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    const body = await req.json()
    const {
      estado, fechaVencimiento, fechaDesde, fechaHasta, tipoPeriodo,
      observaciones, subtotal, descuento, impuestos, total,
      saldoAnterior, notasCredito, pagosAplicados, totalGeneral, items,
      remitoIds, clienteId,
    } = body

    // Obtener factura actual para saber remitos previos
    const existing = await db.factura.findUnique({ where: { id }, select: { remitoIds: true } })

    // Desmarcar remitos anteriores
    if (existing?.remitoIds) {
      const prevIds = existing.remitoIds.split(',').filter(Boolean)
      if (prevIds.length > 0) {
        await db.remito.updateMany({
          where: { id: { in: prevIds } },
          data: { facturaId: null },
        })
      }
    }

    await db.facturaItem.deleteMany({ where: { facturaId: id } })

    const newRemitoIds = remitoIds || []

    const factura = await db.factura.update({
      where: { id },
      data: {
        estado: estado ?? undefined,
        clienteId: clienteId ?? undefined,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
        fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
        tipoPeriodo: tipoPeriodo ?? undefined,
        remitoIds: newRemitoIds.join(',') || '',
        subtotal: subtotal ?? undefined,
        descuento: descuento ?? undefined,
        impuestos: impuestos ?? undefined,
        total: total ?? undefined,
        saldoAnterior: saldoAnterior ?? undefined,
        notasCredito: notasCredito ?? undefined,
        pagosAplicados: pagosAplicados ?? undefined,
        totalGeneral: totalGeneral ?? undefined,
        observaciones: observaciones ?? undefined,
        items: items ? {
          create: items.map((it: any) => ({
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
        } : undefined,
      },
      include: { items: true },
    })

    // Marcar nuevos remitos como facturados
    if (newRemitoIds.length > 0) {
      await db.remito.updateMany({
        where: { id: { in: newRemitoIds } },
        data: { facturaId: id },
      })
    }

    return NextResponse.json(factura)
  } catch (e) {
    console.error('PUT /api/facturas/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { id } = params
    // Desmarcar remitos asociados antes de eliminar
    const factura = await db.factura.findUnique({ where: { id }, select: { remitoIds: true } })
    if (factura?.remitoIds) {
      const remitoIds = factura.remitoIds.split(',').filter(Boolean)
      if (remitoIds.length > 0) {
        await db.remito.updateMany({
          where: { id: { in: remitoIds } },
          data: { facturaId: null },
        })
      }
    }
    await db.factura.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/facturas/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
