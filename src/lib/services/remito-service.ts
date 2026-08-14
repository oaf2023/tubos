import { db } from '@/lib/db'
import { registrarMovimientoTubo, motivoDevolucionAEstado } from '@/lib/trazabilidad'

interface RemitoItemInput {
  id?: string | null
  cylinderId?: string | null
  numeroSerie?: string | null
  gasId: string
  gasCodigo: string
  tipoOperacion?: string
  cantidad?: number
  fechaDevolucion?: string | null
  motivoDevolucion?: string | null
  precioUnitario?: number | null
  subtotal?: number | null
}

interface CreateRemitoInput {
  clienteId?: string | null
  cliente?: string | null
  tipo?: string
  tecnico?: string
  observaciones?: string
  usuario?: { id?: string; nombre?: string; usuario?: string } | null
  items?: RemitoItemInput[]
}

export async function createRemito(input: CreateRemitoInput) {
  return db.$transaction(async (tx) => {
    const max = await tx.remito.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
    const numero = (max?.numero ?? 0) + 1

    const remito = await tx.remito.create({
      data: {
        numero,
        clienteId: input.clienteId || null,
        cliente: input.cliente || null,
        tipo: (input.tipo || 'ENTREGA') as any,
        estado: 'PENDIENTE',
        tecnico: input.tecnico || input.usuario?.nombre || input.usuario?.usuario || null,
        observaciones: input.observaciones || null,
      },
    })

    const itemsCreados: any[] = []
    for (const it of input.items || []) {
      const item = await tx.remitoItem.create({
        data: {
          remitoId: remito.id,
          cylinderId: it.cylinderId || null,
          numeroSerie: it.numeroSerie || null,
          gasId: it.gasId,
          gasCodigo: it.gasCodigo,
          tipoOperacion: (it.tipoOperacion || 'ALQUILER') as any,
          cantidad: it.cantidad || 1,
          fechaDevolucion: it.fechaDevolucion ? new Date(it.fechaDevolucion) : null,
          motivoDevolucion: (it.motivoDevolucion || null) as any,
          devolucionRegistradaPor: it.motivoDevolucion ? input.usuario?.nombre || 'anónimo' : null,
          precioUnitario: it.precioUnitario ?? null,
          subtotal: it.subtotal ?? null,
        },
      })
      itemsCreados.push(item)

      if (it.cylinderId) {
        const esEntrega = (it.tipoOperacion || 'ALQUILER') !== 'DEVOLUCION'
        if (esEntrega || it.tipoOperacion === 'CAMBIO') {
          await registrarMovimientoTubo(
            {
              cylinderId: it.cylinderId,
              accion: 'ENTREGA',
              tipoMovimiento: 'ENTREGA',
              descripcion: `Entrega remito N°${numero}${input.cliente ? ` - ${input.cliente}` : ''}`,
              estadoNuevo: 'EN_CLIENTE',
              clienteId: input.clienteId || null,
              clienteNombre: input.cliente || null,
              usuarioId: input.usuario?.id || null,
              usuarioNombre: input.usuario?.nombre || input.usuario?.usuario || null,
              remitoId: remito.id,
              origen: 'PORTAL_UHF',
            },
            tx,
          )
        } else {
          const estadoNuevo = it.motivoDevolucion
            ? motivoDevolucionAEstado(it.motivoDevolucion)
            : 'EN_DEPOSITO'
          await registrarMovimientoTubo(
            {
              cylinderId: it.cylinderId,
              accion: 'DEVOLUCION',
              tipoMovimiento: 'DEVOLUCION',
              descripcion: `Devolución remito N°${numero}${it.motivoDevolucion ? ` (${it.motivoDevolucion})` : ''}`,
              estadoAnterior: 'EN_CLIENTE',
              estadoNuevo,
              clienteId: null,
              clienteNombre: null,
              usuarioId: input.usuario?.id || null,
              usuarioNombre: input.usuario?.nombre || input.usuario?.usuario || null,
              remitoId: remito.id,
              origen: 'PORTAL_UHF',
            },
            tx,
          )
        }
      }
    }

    return { ...remito, items: itemsCreados }
  })
}