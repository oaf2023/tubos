import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clienteId, fechaDesde, fechaHasta, incluirFacturados } = body

    if (!clienteId || !fechaDesde || !fechaHasta) {
      return NextResponse.json({ error: 'clienteId, fechaDesde y fechaHasta son requeridos' }, { status: 400 })
    }

    const desde = new Date(fechaDesde)
    const hasta = new Date(fechaHasta)

    const [gases, remitos, facturasExistentes] = await Promise.all([
      db.gas.findMany(),
      db.remito.findMany({
        where: { clienteId },
        include: { items: true },
        orderBy: { fecha: 'asc' },
      }),
      incluirFacturados ? [] : db.factura.findMany({
        where: { clienteId, estado: { notIn: ['ANULADA', 'BORRADOR'] } },
        select: { remitoIds: true },
      }),
    ])

    const remitosFacturados = new Set<string>()
    if (!incluirFacturados) {
      for (const f of facturasExistentes) {
        for (const id of f.remitoIds.split(',').filter(Boolean)) {
          remitosFacturados.add(id)
        }
      }
    }

    const gasPrecios: Record<string, { diario: number; mensual: number; venta: number; codigo: string; nombre: string }> = {}
    for (const g of gases) {
      gasPrecios[g.id] = {
        diario: g.precioAlquilerDiario ?? 0,
        mensual: g.precioAlquilerMensual ?? 0,
        venta: g.precioVenta ?? 0,
        codigo: g.codigo,
        nombre: g.nombre,
      }
    }

    const items: any[] = []
    let subtotal = 0

    for (const remito of remitos) {
      if (remitosFacturados.has(remito.id)) continue

      for (const ri of remito.items) {
        const gp = gasPrecios[ri.gasId] || gasPrecios[Object.keys(gasPrecios).find(k => gasPrecios[k].codigo === ri.gasCodigo) || '']

        if (ri.tipoOperacion === 'ALQUILER' || ri.tipoOperacion === 'CAMBIO') {
          const entrega = new Date(remito.fecha)
          const devolucion = ri.fechaDevolucion ? new Date(ri.fechaDevolucion) : hasta
          const inicioFact = entrega > desde ? entrega : desde
          const finFact = devolucion < hasta ? devolucion : hasta

          if (inicioFact > finFact) continue

          const dias = ri.diasAlquiler ?? diffDays(inicioFact, finFact) + 1
          const diario = gp?.diario ?? 0
          const mensual = gp?.mensual ?? 0

          if (dias >= 28 && mensual > 0) {
            const meses = Math.ceil(dias / 30)
            const importe = mensual * meses * ri.cantidad
            items.push({
              concepto: `Alquiler mensual tubo ${ri.gasCodigo} - ${meses} mes(es) (${dias} días)`,
              tipo: 'ALQUILER',
              remitoItemId: ri.id,
              cylinderId: ri.cylinderId || undefined,
              numeroSerie: ri.numeroSerie || undefined,
              diasFacturados: dias,
              cantidad: ri.cantidad,
              precioUnitario: mensual * meses,
              subtotal: importe,
            })
            subtotal += importe
          } else if (diario > 0) {
            const importe = diario * dias * ri.cantidad
            items.push({
              concepto: `Alquiler diario tubo ${ri.gasCodigo} - ${dias} días`,
              tipo: 'ALQUILER',
              remitoItemId: ri.id,
              cylinderId: ri.cylinderId || undefined,
              numeroSerie: ri.numeroSerie || undefined,
              diasFacturados: dias,
              cantidad: ri.cantidad,
              precioUnitario: diario * dias,
              subtotal: importe,
            })
            subtotal += importe
          }
        }

        if (ri.tipoOperacion === 'VENTA' || ri.tipoOperacion === 'VENTA_NUEVO') {
          const pu = ri.precioUnitario ?? gp?.venta ?? 0
          const importe = pu * ri.cantidad
          items.push({
            concepto: `Venta ${ri.gasCodigo} - ${ri.numeroSerie || 'carga'}`,
            tipo: 'GAS',
            remitoItemId: ri.id,
            cylinderId: ri.cylinderId || undefined,
            numeroSerie: ri.numeroSerie || undefined,
            cantidad: ri.cantidad,
            precioUnitario: pu,
            subtotal: importe,
          })
          subtotal += importe
        }
      }
    }

    return NextResponse.json({ items, subtotal, gasPrecios })
  } catch (e) {
    console.error('POST /api/facturas/calcular-alquiler', e)
    return NextResponse.json({ error: 'Error al calcular alquiler' }, { status: 500 })
  }
}
