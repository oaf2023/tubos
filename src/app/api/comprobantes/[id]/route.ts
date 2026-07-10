import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calcularTotales, serializeComprobante } from '@/lib/services/comprobante-service'

export async function GET(_req: NextRequest, { params }: any) {
  try {
    const doc = await db.documentoComercial.findUnique({ where: { id: params.id }, include: { items: true, tributos: true } })
    if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(serializeComprobante(doc))
  } catch (e) {
    console.error('GET /api/comprobantes/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: any) {
  try {
    const existing = await db.documentoComercial.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (existing.estado === 'AUTORIZADO') {
      return NextResponse.json({ error: 'No se puede modificar un comprobante autorizado. Use nota de crédito/débito para corregir.' }, { status: 409 })
    }
    if (existing.estado === 'ANULADO') {
      return NextResponse.json({ error: 'No se puede modificar un comprobante anulado' }, { status: 400 })
    }

    const body = await req.json()
    const tipoCambio = Number(body.tipoCambio || 1)
    const totales = calcularTotales(body.items || [], body.tributos || [], tipoCambio)
    await db.documentoComercialItem.deleteMany({ where: { documentoId: params.id } })
    await db.documentoComercialTributo.deleteMany({ where: { documentoId: params.id } })
    const doc = await db.documentoComercial.update({
      where: { id: params.id },
      data: {
        fecha: body.fecha ? new Date(body.fecha) : undefined,
        fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : null,
        periodoDesde: body.periodoDesde ? new Date(body.periodoDesde) : null,
        periodoHasta: body.periodoHasta ? new Date(body.periodoHasta) : null,
        estado: body.estado || undefined,
        clienteId: body.clienteId || null,
        clienteCodigo: body.clienteCodigo || null,
        clienteNombre: body.clienteNombre || undefined,
        clienteDocumentoTipo: body.clienteDocumentoTipo || null,
        clienteDocumentoNumero: body.clienteDocumentoNumero || null,
        clienteCondicionIva: body.clienteCondicionIva || null,
        clienteDomicilio: body.clienteDomicilio || null,
        clienteLocalidad: body.clienteLocalidad || null,
        clienteProvincia: body.clienteProvincia || null,
        clienteTelefono: body.clienteTelefono || null,
        moneda: body.moneda || undefined,
        tipoCambio,
        listaPrecio: body.listaPrecio || '1',
        operador: body.operador || null,
        condicionVenta: body.condicionVenta || null,
        origen: body.origen || undefined,
        comprobanteAsociadoId: body.comprobanteAsociadoId || null,
        cae: body.cae || null,
        caeVencimiento: body.caeVencimiento ? new Date(body.caeVencimiento) : null,
        codigoAutorizacion: body.codigoAutorizacion || null,
        qrPayload: body.qrPayload || null,
        observaciones: body.observaciones || null,
        ...totales,
        items: { create: totales.items.map((it) => ({ codigo: it.codigo || null, detalle: it.detalle, cantidad: it.cantidad, unidad: it.unidad || 'unidades', precioUnitario: it.precioUnitario, bonificacionPorcentaje: it.bonificacionPorcentaje, alicuotaIva: it.alicuotaIva, importeIva: it.importeIva, subtotal: it.subtotal, subtotalConIva: it.subtotalConIva, articuloId: it.articuloId || null, gasId: it.gasId || null, cylinderId: it.cylinderId || null, remitoItemId: it.remitoItemId || null, pedidoItemId: it.pedidoItemId || null, mlOrderItemId: it.mlOrderItemId || null })) },
        tributos: { create: (body.tributos || []).map((t: any) => ({ descripcion: t.descripcion, detalle: t.detalle || null, alicuota: Number(t.alicuota || 0), importe: Number(t.importe || 0) })) },
      },
      include: { items: true, tributos: true },
    })
    return NextResponse.json(serializeComprobante(doc))
  } catch (e) {
    console.error('PUT /api/comprobantes/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: any) {
  try {
    const existing = await db.documentoComercial.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (existing.estado === 'AUTORIZADO') {
      return NextResponse.json({ error: 'No se puede eliminar un comprobante autorizado. Debe anularlo con nota de crédito/débito.' }, { status: 409 })
    }
    await db.documentoComercial.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/comprobantes/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
