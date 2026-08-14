import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { motivoDevolucionAEstado, MOTIVOS_DEVOLUCION, type EstadoCilindroValido } from '@/lib/devolucion'

type Client = Prisma.TransactionClient | typeof db

const EVENT_HASH_SALT = process.env.EVENT_HASH_SALT || 'tubos-gastrack-default-salt'

export interface RegistroTuboParams {
  cylinderId: string
  accion: string
  tipoMovimiento: string
  descripcion: string
  estadoAnterior?: string | null
  estadoNuevo?: string | null
  clienteId?: string | null
  clienteNombre?: string | null
  ubicacion?: string | null
  lat?: number | null
  lng?: number | null
  usuarioId?: string | null
  usuarioNombre?: string | null
  observacion?: string | null
  fotoUrl?: string | null
  origen?: string
  remitoId?: string | null
  documentoId?: string | null
  autorizadoPor?: string | null
  fechaHora?: Date
}

/**
 * Escritor ÚNICO de trazabilidad de un cilindro.
 * Dentro de una transacción crea CylinderMovimiento + EventoTubo y
 * actualiza el estado/ubicación/cliente del cilindro. Todo queda en una
 * sola fuente de verdad con el operador autenticado en cada registro.
 */
export async function registrarMovimientoTubo(
  params: RegistroTuboParams,
  client?: Client,
) {
  const c = client || db

  const fechaHora = params.fechaHora || new Date()
  const usuarioNombre = params.usuarioNombre || params.usuarioId || null

  const hashPayload = `${params.cylinderId}${params.accion}${params.origen || 'CELULAR_QR'}${fechaHora.toISOString()}${EVENT_HASH_SALT}`
  const hashEvento = createHash('sha256').update(hashPayload).digest('hex')

  await c.eventoTubo.create({
    data: {
      cylinderId: params.cylinderId,
      fechaHora,
      origen: (params.origen || 'CELULAR_QR') as any,
      accion: params.accion as any,
      usuarioId: params.usuarioId || null,
      usuarioNombre,
      clienteId: params.clienteId || null,
      clienteNombre: params.clienteNombre || null,
      latitud: params.lat ?? null,
      longitud: params.lng ?? null,
      estadoAnterior: params.estadoAnterior || null,
      estadoNuevo: params.estadoNuevo || null,
      observacion: params.observacion || null,
      fotoUrl: params.fotoUrl || null,
      autorizadoPor: params.autorizadoPor || null,
      hashEvento,
    },
  })

  await c.cylinderMovimiento.create({
    data: {
      cylinderId: params.cylinderId,
      fecha: fechaHora,
      tipo: params.tipoMovimiento as any,
      descripcion: params.descripcion,
      usuario: params.usuarioNombre || params.usuarioId || null,
      remitoId: params.remitoId || null,
      documentoId: params.documentoId || null,
      latOrigen: params.lat ?? null,
      lngOrigen: params.lng ?? null,
      latDestino: params.lat ?? null,
      lngDestino: params.lng ?? null,
      ubicacion: params.ubicacion || null,
    },
  })

  if (params.estadoNuevo || params.clienteId !== undefined || params.ubicacion) {
    await c.cylinder.update({
      where: { id: params.cylinderId },
      data: {
        estado: params.estadoNuevo ? (params.estadoNuevo as any) : undefined,
        clienteId: params.clienteId !== undefined ? (params.clienteId || null) : undefined,
        cliente: params.clienteNombre !== undefined ? (params.clienteNombre || null) : undefined,
        ubicacionNombre: params.ubicacion ? params.ubicacion : undefined,
        ubicacionLat: params.lat ?? undefined,
        ubicacionLng: params.lng ?? undefined,
        ultimoMovimiento: fechaHora,
      },
    })
  }

  return hashEvento
}

export type CilindroEstadoValido = EstadoCilindroValido
export { motivoDevolucionAEstado, MOTIVOS_DEVOLUCION }

export interface ValidacionEntrega {
  valido: boolean
  motivo: string | null
  entregadoA: string | null
  entregadoAId: string | null
  fechaEntrega: Date | null
}

/**
 * Verifica si el cilindro fue entregado al cliente indicado:
 * 1) el estado actual del cilindro (EN_CLIENTE + clienteId asignado)
 * 2) la última ENTREGA registrada vía remito con item del cilindro.
 */
export async function validarEntregaCliente(
  cylinderId: string,
  clienteId: string | null | undefined,
  client?: Client,
): Promise<ValidacionEntrega> {
  const c = client || db

  const cylinder = await c.cylinder.findUnique({
    where: { id: cylinderId },
    select: {
      id: true,
      estado: true,
      clienteId: true,
      cliente: true,
      ultimoMovimiento: true,
    },
  })
  if (!cylinder) {
    return { valido: false, motivo: 'Tubo inexistente', entregadoA: null, entregadoAId: null, fechaEntrega: null }
  }

  const ultimaEntrega = await c.remitoItem.findFirst({
    where: {
      cylinderId,
      remito: { tipo: 'ENTREGA' },
    },
    orderBy: { remito: { createdAt: 'desc' } },
    include: { remito: { select: { id: true, numero: true, clienteId: true, cliente: true, createdAt: true } } },
  })

  const asignado = cylinder.clienteId || null
  const entregadoAId = ultimaEntrega?.remito.clienteId || null
  const entregadoA = ultimaEntrega?.remito.cliente || ultimaEntrega?.remito.clienteId || null
  const fechaEntrega = ultimaEntrega?.remito.createdAt || cylinder.ultimoMovimiento || null

  if (clienteId && assignedNoCoincide(entregadoAId, clienteId) && asignado !== clienteId) {
    return {
      valido: false,
      motivo: `El tubo NO fue entregado a este cliente${entregadoA ? ` (entregado a ${entregadoA})` : ''}`,
      entregadoA,
      entregadoAId,
      fechaEntrega: fechaEntrega || null,
    }
  }

  return {
    valido: true,
    motivo: null,
    entregadoA,
    entregadoAId,
    fechaEntrega: fechaEntrega || null,
  }
}

function assignedNoCoincide(entrega: string | null, clienteId: string): boolean {
  if (!entrega) return true
  return entrega !== clienteId && entrega !== 'lote' && entrega !== 'GENERAL'
}