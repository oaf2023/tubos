import { db } from '@/lib/db'

interface RemitoItemInput {
  cylinderId?: string | null
  numeroSerie?: string | null
  gasId: string
  gasCodigo: string
  tipoOperacion?: string
  cantidad?: number
  precioUnitario?: number | null
  subtotal?: number | null
}

interface CreateRemitoInput {
  clienteId: string
  cliente: string
  tipo?: string
  tecnico?: string
  observaciones?: string
  items?: RemitoItemInput[]
}

export async function createRemito(input: CreateRemitoInput) {
  return db.$transaction(async (tx) => {
    const max = await tx.remito.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
    const numero = (max?.numero ?? 0) + 1

    return tx.remito.create({
      data: {
        numero,
        clienteId: input.clienteId,
        cliente: input.cliente,
        tipo: (input.tipo || 'ENTREGA') as any,
        estado: 'PENDIENTE',
        tecnico: input.tecnico || null,
        observaciones: input.observaciones || null,
        items: {
          create: (input.items || []).map((it) => ({
            cylinderId: it.cylinderId || null,
            numeroSerie: it.numeroSerie || null,
            gasId: it.gasId,
            gasCodigo: it.gasCodigo,
            tipoOperacion: (it.tipoOperacion || 'ALQUILER') as any,
            cantidad: it.cantidad || 1,
            precioUnitario: it.precioUnitario ?? null,
            subtotal: it.subtotal ?? null,
          })),
        },
      },
      include: { items: true },
    })
  })
}
