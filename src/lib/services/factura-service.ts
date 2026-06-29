import { db } from '@/lib/db'

interface FacturaItemInput {
  concepto: string
  tipo?: string
  remitoItemId?: string | null
  cylinderId?: string | null
  numeroSerie?: string | null
  diasFacturados?: number | null
  cantidad?: number
  precioUnitario?: number
  subtotal?: number
}

interface CreateFacturaInput {
  clienteId: string
  cliente: string
  fechaVencimiento?: string | null
  fechaDesde?: string | null
  fechaHasta?: string | null
  tipoPeriodo?: string | null
  remitoIds?: string[]
  items?: FacturaItemInput[]
  observaciones?: string
  subtotal?: number
  descuento?: number
  impuestos?: number
  saldoAnterior?: number
  notasCredito?: number
  pagosAplicados?: number
  totalGeneral?: number
  estado?: string
}

export async function createFactura(input: CreateFacturaInput) {
  return db.$transaction(async (tx) => {
    const max = await tx.factura.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
    const numero = (max?.numero ?? 0) + 1

    const items = input.items || []
    const totalItems = items.reduce((s, it) => s + (it.subtotal || 0), 0)

    return tx.factura.create({
      data: {
        numero,
        clienteId: input.clienteId,
        cliente: input.cliente,
        fechaVencimiento: input.fechaVencimiento ? new Date(input.fechaVencimiento) : null,
        fechaDesde: input.fechaDesde ? new Date(input.fechaDesde) : null,
        fechaHasta: input.fechaHasta ? new Date(input.fechaHasta) : null,
        tipoPeriodo: input.tipoPeriodo || null,
        remitoIds: (input.remitoIds || []).join(','),
        subtotal: input.subtotal ?? totalItems,
        descuento: input.descuento ?? 0,
        impuestos: input.impuestos ?? 0,
        total: totalItems,
        saldoAnterior: input.saldoAnterior ?? 0,
        notasCredito: input.notasCredito ?? 0,
        pagosAplicados: input.pagosAplicados ?? 0,
        totalGeneral: input.totalGeneral ?? (
          totalItems + (input.saldoAnterior ?? 0) -
          (input.notasCredito ?? 0) - (input.pagosAplicados ?? 0)
        ),
        estado: (input.estado || 'PENDIENTE') as any,
        observaciones: input.observaciones || null,
        items: {
          create: items.map((it) => ({
            concepto: it.concepto,
            tipo: (it.tipo || 'ALQUILER') as any,
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
  })
}
