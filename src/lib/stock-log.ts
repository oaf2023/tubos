import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

type Client = Prisma.TransactionClient | typeof db

export type TipoMovimientoStock = 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA'

const ESTADOS_FUERA_DE_DEPOSITO = ['EN_CLIENTE', 'EN_REPARTO', 'BAJA', 'EXTRAVIADO']

export function tipoMovimientoDesdeEstado(
  desde: string | null | undefined,
  hacia: string,
): TipoMovimientoStock {
  if (!desde) return 'ENTRADA'
  if (ESTADOS_FUERA_DE_DEPOSITO.includes(hacia)) return 'SALIDA'
  if (ESTADOS_FUERA_DE_DEPOSITO.includes(desde)) return 'ENTRADA'
  return 'TRANSFERENCIA'
}

export async function registrarMovimientoStock(
  params: {
    gasId: string
    tipo: TipoMovimientoStock
    cantidad: number
    estadoAnterior?: string | null
    estadoNuevo?: string | null
    usuario?: string | null
    observacion?: string | null
  },
  client?: Client,
) {
  const c = client || db
  return c.movimientoStock.create({
    data: {
      gasId: params.gasId,
      tipo: params.tipo,
      cantidad: params.cantidad,
      estadoAnterior: params.estadoAnterior || null,
      estadoNuevo: params.estadoNuevo || null,
      usuario: params.usuario || null,
      observacion: params.observacion || null,
    },
  })
}

export async function registrarMovimientoPorEstadoCilindro(
  params: {
    cylinderId: string
    gasId: string
    estadoAnterior: string | null | undefined
    estadoNuevo: string
    usuario?: string | null
    observacion?: string | null
  },
  client?: Client,
) {
  return registrarMovimientoStock(
    {
      gasId: params.gasId,
      tipo: tipoMovimientoDesdeEstado(params.estadoAnterior, params.estadoNuevo),
      cantidad: 1,
      estadoAnterior: params.estadoAnterior || null,
      estadoNuevo: params.estadoNuevo,
      usuario: params.usuario,
      observacion:
        params.observacion ||
        `Cilindro ${params.cylinderId}: ${params.estadoAnterior || '—'} → ${params.estadoNuevo}`,
    },
    client,
  )
}
