import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export interface NovedadDetectada {
  tipo: string
  detalle: string
  auto: boolean
}

export interface TuboVerificado {
  id: string
  numeroSerie: string
  gasCodigo: string
  gasNombre: string
  estado: string
  cliente: string | null
}

export interface ResultadoVerificacion {
  valido: boolean
  remitoItemId: string | null
  yaDescargado: boolean
  cylinder: TuboVerificado | null
  novedades: NovedadDetectada[]
  motivo: string | null
}

type Tx = Prisma.TransactionClient

export async function resolverTuboPorValor(valor: string, tx: Tx = db): Promise<TuboVerificado | null> {
  const porTag = await tx.identificadorTubo.findFirst({
    where: { valor, activo: true },
    include: { cylinder: { include: { gas: true } } },
  })
  const cylinder = porTag?.cylinder
    ? porTag.cylinder
    : await tx.cylinder.findUnique({
        where: { numeroSerie: valor },
        include: { gas: true },
      })
  if (!cylinder) return null
  return {
    id: cylinder.id,
    numeroSerie: cylinder.numeroSerie,
    gasCodigo: cylinder.gas.codigo,
    gasNombre: cylinder.gas.nombre,
    estado: cylinder.estado,
    cliente: cylinder.cliente,
  }
}

export async function verificarTuboParaDescarga(
  remito: { id: string; clienteId?: string | null; cliente?: string | null },
  valor: string,
  tx: Tx = db,
): Promise<ResultadoVerificacion> {
  const novedades: NovedadDetectada[] = []
  const cylinder = await resolverTuboPorValor(valor, tx)
  if (!cylinder) {
    return { valido: false, remitoItemId: null, yaDescargado: false, cylinder: null, novedades: [], motivo: 'Tubo no encontrado. Verificá el código o la serie.' }
  }

  if (cylinder.estado === 'PH_VENCIDO') {
    novedades.push({ tipo: 'PH_VENCIDA', detalle: 'El tubo tiene la PH vencida (recalificación requerida)', auto: true })
  }

  const remitoCompleto = await tx.remito.findUniqueOrThrow({
    where: { id: remito.id },
    include: { items: true },
  })

  const item = remitoCompleto.items.find((i) => i.cylinderId === cylinder.id)

  if (item) {
    if (item.descargado) {
      return {
        valido: false,
        remitoItemId: item.id,
        yaDescargado: true,
        cylinder,
        novedades: [],
        motivo: 'Este tubo ya fue descargado en este remito',
      }
    }
    if (item.gasCodigo !== cylinder.gasCodigo) {
      novedades.push({
        tipo: 'GAS_INCORRECTO',
        detalle: `El remito espera ${item.gasCodigo} pero el tubo es ${cylinder.gasCodigo} (${cylinder.gasNombre})`,
        auto: true,
      })
    }
    if (cylinder.estado === 'EN_CLIENTE' && cylinder.cliente && remitoCompleto.cliente && cylinder.cliente !== remitoCompleto.cliente) {
      novedades.push({
        tipo: 'TUBO_OTRO_CLIENTE',
        detalle: `El tubo figura entregado a ${cylinder.cliente} (este remito es para ${remitoCompleto.cliente})`,
        auto: true,
      })
    }
    if (cylinder.estado !== 'EN_REPARTO' && cylinder.estado !== 'LLENO') {
      novedades.push({
        tipo: 'OTRO',
        detalle: `Estado actual del tubo: ${cylinder.estado} (esperado EN_REPARTO/LLENO)`,
        auto: true,
      })
    }
    return { valido: novedades.length === 0, remitoItemId: item.id, yaDescargado: false, cylinder, novedades, motivo: null }
  }

  const otroRemito = await tx.remito.findFirst({
    where: {
      id: { not: remito.id },
      items: { some: { cylinderId: cylinder.id } },
      estado: { not: 'FIRMADO' },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (otroRemito) {
    novedades.push({
      tipo: 'TUBO_OTRO_REMITO',
      detalle: `El tubo corresponde al remito N°${otroRemito.numero}${otroRemito.cliente ? ` (${otroRemito.cliente})` : ''}, no a este`,
      auto: true,
    })
  } else if (cylinder.estado === 'EN_CLIENTE' && cylinder.cliente) {
    novedades.push({
      tipo: 'TUBO_OTRO_CLIENTE',
      detalle: `El tubo está entregado a ${cylinder.cliente} y no figura en este remito`,
      auto: true,
    })
  } else if (cylinder.estado === 'LLENO' || cylinder.estado === 'EN_DEPOSITO') {
    novedades.push({
      tipo: 'SOBRANTE',
      detalle: 'El tubo no figura en este remito (posible sobrante de carga)',
      auto: true,
    })
  } else {
    novedades.push({
      tipo: 'OTRO',
      detalle: 'El tubo no figura en este remito',
      auto: true,
    })
  }
  return { valido: false, remitoItemId: null, yaDescargado: false, cylinder, novedades, motivo: null }
}

export async function recalcularEstadoRemito(tx: Tx, remitoId: string): Promise<string> {
  const remito = await tx.remito.findUniqueOrThrow({ where: { id: remitoId }, include: { items: true } })
  if (remito.estado === 'FIRMADO') return remito.estado
  if (remito.items.length === 0) return remito.estado
  const descargados = remito.items.filter((i) => i.descargado).length
  const nuevo: string = descargados === remito.items.length ? 'COMPLETADO' : descargados > 0 ? 'PARCIAL' : 'PENDIENTE'
  if (nuevo !== remito.estado) {
    await tx.remito.update({ where: { id: remitoId }, data: { estado: nuevo as any } })
  }
  return nuevo
}