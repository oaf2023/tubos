import { db } from '@/lib/db'

const PRECIOS_GAS: Record<string, number> = {
  AR: 15000, C2H2: 22000, O2: 12000, CO2: 18000, N2: 10000,
  'MIX-7525': 16000, HE: 28000, 'AR-HE': 24000, H2: 35000,
}

interface RenglonInput {
  gasId: string
  cantidad?: number
  operacionEnvase?: string
}

interface CreatePedidoInput {
  cliente: string
  clienteId?: string | null
  fecha?: string
  estadoCuenta?: string
  estado?: string
  observaciones?: string | null
  operacionEnvase?: string
  renglones: RenglonInput[]
}

export async function createPedido(input: CreatePedidoInput) {
  return db.$transaction(async (tx) => {
    const items: { concepto: string; monto: number }[] = []
    let total = 0

    for (const r of input.renglones) {
      const gas = await tx.gas.findUnique({ where: { id: r.gasId } })
      if (!gas) continue
      const precioUnit = PRECIOS_GAS[gas.codigo] || 15000
      const cant = r.cantidad || 1

      items.push({ concepto: `${gas.nombre} × ${cant}`, monto: precioUnit * cant })
      total += precioUnit * cant
    }

    const primerGasId = input.renglones[0]?.gasId
    const opEnvase = input.operacionEnvase || input.renglones[0]?.operacionEnvase || 'Sin envase'

    return tx.pedido.create({
      data: {
        fecha: input.fecha ? new Date(input.fecha) : new Date(),
        cliente: input.cliente,
        clienteId: input.clienteId || null,
        estadoCuenta: input.estadoCuenta || 'OK',
        gasId: primerGasId,
        operacionEnvase: opEnvase,
        phVigente: null,
        phObservacion: null,
        total,
        estado: (input.estado || 'PENDIENTE') as any,
        observaciones: input.observaciones || null,
        items: { create: items },
      },
      include: { gas: true, items: true, cilindros: true },
    })
  })
}
