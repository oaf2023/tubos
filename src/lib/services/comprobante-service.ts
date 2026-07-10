import { db } from '@/lib/db'

const DOC_DEFAULTS: Record<string, { letra: string; codigo: string; abrev: string; pv: string; fiscal: boolean; sinFiscal: boolean; copias: string }> = {
  FACTURA_A: { letra: 'A', codigo: '01', abrev: 'Fact', pv: '0007', fiscal: true, sinFiscal: false, copias: 'ORIGINAL,DUPLICADO,TRIPLICADO' },
  FACTURA_B: { letra: 'B', codigo: '06', abrev: 'Fact', pv: '0014', fiscal: true, sinFiscal: false, copias: 'ORIGINAL,DUPLICADO' },
  FACTURA_C: { letra: 'C', codigo: '11', abrev: 'Fact', pv: '0014', fiscal: true, sinFiscal: false, copias: 'ORIGINAL,DUPLICADO' },
  FACTURA_E: { letra: 'E', codigo: '19', abrev: 'Fact', pv: '0007', fiscal: true, sinFiscal: false, copias: 'ORIGINAL,DUPLICADO' },
  NOTA_CREDITO_A: { letra: 'A', codigo: '03', abrev: 'Ncre', pv: '0003', fiscal: true, sinFiscal: false, copias: 'ORIGINAL' },
  NOTA_CREDITO_B: { letra: 'B', codigo: '08', abrev: 'Ncre', pv: '0003', fiscal: true, sinFiscal: false, copias: 'ORIGINAL' },
  NOTA_DEBITO_A: { letra: 'A', codigo: '02', abrev: 'Ndeb', pv: '0003', fiscal: true, sinFiscal: false, copias: 'ORIGINAL' },
  NOTA_DEBITO_B: { letra: 'B', codigo: '07', abrev: 'Ndeb', pv: '0003', fiscal: true, sinFiscal: false, copias: 'ORIGINAL' },
  PRESUPUESTO_X: { letra: 'X', codigo: '00', abrev: 'Pres', pv: '0004', fiscal: false, sinFiscal: true, copias: 'ORIGINAL' },
  REMITO_X: { letra: 'X', codigo: '00', abrev: 'Remi', pv: '0030', fiscal: false, sinFiscal: true, copias: 'ORIGINAL,DUPLICADO' },
  ORDEN_INTERNA_X: { letra: 'X', codigo: '00', abrev: 'Cint', pv: '0009', fiscal: false, sinFiscal: true, copias: 'ORIGINAL,DUPLICADO' },
}

function docKey(tipoDocumento: string, letra: string) {
  if (tipoDocumento === 'FACTURA' && letra === 'A') return 'FACTURA_A'
  if (tipoDocumento === 'FACTURA' && letra === 'B') return 'FACTURA_B'
  if (tipoDocumento === 'FACTURA' && letra === 'C') return 'FACTURA_C'
  if (tipoDocumento === 'FACTURA' && letra === 'E') return 'FACTURA_E'
  if (tipoDocumento === 'NOTA_CREDITO' && letra === 'A') return 'NOTA_CREDITO_A'
  if (tipoDocumento === 'NOTA_CREDITO' && letra === 'B') return 'NOTA_CREDITO_B'
  if (tipoDocumento === 'NOTA_DEBITO' && letra === 'A') return 'NOTA_DEBITO_A'
  if (tipoDocumento === 'NOTA_DEBITO' && letra === 'B') return 'NOTA_DEBITO_B'
  if (tipoDocumento === 'PRESUPUESTO') return 'PRESUPUESTO_X'
  if (tipoDocumento === 'REMITO') return 'REMITO_X'
  if (tipoDocumento === 'ORDEN_INTERNA') return 'ORDEN_INTERNA_X'
  return `${tipoDocumento}_${letra}`
}

export async function ensureDefaultComprobanteConfig() {
  await db.configuracionFiscal.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
  for (const [key, d] of Object.entries(DOC_DEFAULTS)) {
    const tipoDocumento = key.startsWith('FACTURA') ? 'FACTURA'
      : key.startsWith('NOTA_CREDITO') ? 'NOTA_CREDITO'
      : key.startsWith('NOTA_DEBITO') ? 'NOTA_DEBITO'
      : key.startsWith('PRESUPUESTO') ? 'PRESUPUESTO'
      : key.startsWith('REMITO') ? 'REMITO'
      : 'ORDEN_INTERNA'
    await db.documentoNumerador.upsert({
      where: { tipoDocumento_letra_puntoVenta: { tipoDocumento: tipoDocumento as any, letra: d.letra, puntoVenta: d.pv } },
      update: {},
      create: { tipoDocumento: tipoDocumento as any, letra: d.letra, codigoComprobante: d.codigo, abreviatura: d.abrev, puntoVenta: d.pv, fiscal: d.fiscal, sinValidezFiscal: d.sinFiscal, copias: d.copias },
    })
  }
}

function asNumber(v: any) { return Number(v || 0) }
function round2(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100 }

export function serializeComprobante(doc: any) {
  const convert = (obj: any): any => {
    if (obj == null) return obj
    if (typeof obj === 'object' && typeof obj.toNumber === 'function') return obj.toNumber()
    if (obj instanceof Date) return obj.toISOString()
    if (Array.isArray(obj)) return obj.map(convert)
    if (typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, convert(v)]))
    return obj
  }
  return convert(doc)
}

export function calcularTotales(items: any[] = [], tributos: any[] = [], tipoCambio = 1) {
  let netoGravado = 0
  let netoExento = 0
  let netoNoGravado = 0
  const iva = { iva27: 0, iva21: 0, iva105: 0, iva5: 0, iva25: 0, iva0: 0 }
  const mappedItems = items.map((it) => {
    const cantidad = asNumber(it.cantidad) || 1
    const precioUnitario = asNumber(it.precioUnitario)
    const bonif = asNumber(it.bonificacionPorcentaje)
    const alicuota = asNumber(it.alicuotaIva)
    const subtotal = round2(cantidad * precioUnitario * (1 - bonif / 100))
    let importeIva = 0
    if (alicuota > 0) {
      netoGravado += subtotal
      importeIva = round2(subtotal * alicuota / 100)
      if (alicuota === 27) iva.iva27 += importeIva
      else if (alicuota === 21) iva.iva21 += importeIva
      else if (alicuota === 10.5) iva.iva105 += importeIva
      else if (alicuota === 5) iva.iva5 += importeIva
      else if (alicuota === 2.5) iva.iva25 += importeIva
    } else if (it.exento) {
      netoExento += subtotal
    } else {
      netoNoGravado += subtotal
    }
    return { ...it, cantidad, precioUnitario, bonificacionPorcentaje: bonif, alicuotaIva: alicuota, subtotal, importeIva, subtotalConIva: round2(subtotal + importeIva) }
  })
  const otrosTributos = round2(tributos.reduce((s, t) => s + asNumber(t.importe), 0))
  const total = round2(netoGravado + netoExento + netoNoGravado + Object.values(iva).reduce((a, b) => a + b, 0) + otrosTributos)
  return {
    items: mappedItems,
    netoGravado: round2(netoGravado),
    netoExento: round2(netoExento),
    netoNoGravado: round2(netoNoGravado),
    ...Object.fromEntries(Object.entries(iva).map(([k, v]) => [k, round2(v)])),
    percepciones: otrosTributos,
    otrosTributos,
    total,
    totalPesos: round2(total * (tipoCambio || 1)),
  }
}

export async function createComprobante(input: any) {
  await ensureDefaultComprobanteConfig()
  return db.$transaction(async (tx) => {
    const tipoDocumento = input.tipoDocumento || 'FACTURA'
    const letra = input.letra || (tipoDocumento === 'FACTURA' ? 'B' : 'X')
    const fallback = DOC_DEFAULTS[docKey(tipoDocumento, letra)] || DOC_DEFAULTS.FACTURA_B
    const numerador = await tx.documentoNumerador.findFirst({ where: { tipoDocumento, letra, activo: true }, orderBy: { createdAt: 'asc' } })
    const cfg = await tx.configuracionFiscal.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
    const puntoVenta = input.puntoVenta || numerador?.puntoVenta || fallback.pv
    const abreviatura = input.abreviatura || numerador?.abreviatura || fallback.abrev
    const codigoComprobante = input.codigoComprobante || numerador?.codigoComprobante || fallback.codigo
    const numero = (numerador?.ultimoNumero ?? 0) + 1
    const numeroFormateado = `${abreviatura} ${letra} ${puntoVenta}-${String(numero).padStart(8, '0')}`
    const tipoCambio = asNumber(input.tipoCambio) || asNumber(cfg.tipoCambioSugerido) || 1
    const totales = calcularTotales(input.items || [], input.tributos || [], tipoCambio)
    const doc = await tx.documentoComercial.create({
      data: {
        tipoDocumento, letra, codigoComprobante, abreviatura, puntoVenta, numero, numeroFormateado,
        fecha: input.fecha ? new Date(input.fecha) : new Date(),
        fechaVencimiento: input.fechaVencimiento ? new Date(input.fechaVencimiento) : null,
        periodoDesde: input.periodoDesde ? new Date(input.periodoDesde) : null,
        periodoHasta: input.periodoHasta ? new Date(input.periodoHasta) : null,
        estado: input.estado || 'BORRADOR', fiscal: input.fiscal ?? numerador?.fiscal ?? fallback.fiscal, sinValidezFiscal: input.sinValidezFiscal ?? numerador?.sinValidezFiscal ?? fallback.sinFiscal,
        clienteId: input.clienteId || null, clienteCodigo: input.clienteCodigo || null, clienteNombre: input.clienteNombre || 'Consumidor Final', clienteDocumentoTipo: input.clienteDocumentoTipo || null, clienteDocumentoNumero: input.clienteDocumentoNumero || null, clienteCondicionIva: input.clienteCondicionIva || null, clienteDomicilio: input.clienteDomicilio || null, clienteLocalidad: input.clienteLocalidad || null, clienteProvincia: input.clienteProvincia || null, clientePais: input.clientePais || 'ARGENTINA', clienteTelefono: input.clienteTelefono || null,
        moneda: input.moneda || cfg.monedaDefault, tipoCambio, listaPrecio: input.listaPrecio || '1', operador: input.operador || null, condicionVenta: input.condicionVenta || 'Cuenta Corriente', origen: input.origen || 'MANUAL', origenId: input.origenId || null, remitoIds: (input.remitoIds || []).join?.(',') || input.remitoIds || '', pedidoIds: (input.pedidoIds || []).join?.(',') || input.pedidoIds || '',
        mlOrderId: input.mlOrderId || null, mlSaleNumber: input.mlSaleNumber || null, mlShipmentId: input.mlShipmentId || null, mlTrackingCode: input.mlTrackingCode || null, mlBuyerName: input.mlBuyerName || null, mlBuyerDocument: input.mlBuyerDocument || null, mlBuyerAddress: input.mlBuyerAddress || null, mpPaymentId: input.mpPaymentId || null, mpPaymentMethod: input.mpPaymentMethod || null, mpPaymentStatus: input.mpPaymentStatus || null, mpPaidAmount: input.mpPaidAmount || null,
        comprobanteAsociadoId: input.comprobanteAsociadoId || null,
        cae: input.cae || null, caeVencimiento: input.caeVencimiento ? new Date(input.caeVencimiento) : null, codigoAutorizacion: input.codigoAutorizacion || null, qrPayload: input.qrPayload || null,
        ...totales,
        observaciones: input.observaciones || null,
        items: { create: totales.items.map((it) => ({ codigo: it.codigo || null, detalle: it.detalle, cantidad: it.cantidad, unidad: it.unidad || 'unidades', precioUnitario: it.precioUnitario, bonificacionPorcentaje: it.bonificacionPorcentaje, alicuotaIva: it.alicuotaIva, importeIva: it.importeIva, subtotal: it.subtotal, subtotalConIva: it.subtotalConIva, articuloId: it.articuloId || null, gasId: it.gasId || null, cylinderId: it.cylinderId || null, remitoItemId: it.remitoItemId || null, pedidoItemId: it.pedidoItemId || null, mlOrderItemId: it.mlOrderItemId || null })) },
        tributos: { create: (input.tributos || []).map((t: any) => ({ descripcion: t.descripcion, detalle: t.detalle || null, alicuota: asNumber(t.alicuota), importe: asNumber(t.importe) })) },
      },
      include: { items: true, tributos: true },
    })
    if (numerador) await tx.documentoNumerador.update({ where: { id: numerador.id }, data: { ultimoNumero: numero } })
    return doc
  })
}
