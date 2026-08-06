import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const NO_MERCADERIA = /^(PER|PERCEPCION|DESCUENTO|FLETE|SEGURO|COMISION|REDONDEO)/i

const ALIASES: Record<string, string[]> = {
  O2: ['oxigeno', 'oxigen'],
  CO2: ['anhidrido', 'carbonic', 'co2'],
  AR: ['argon'],
  'AR-HE': ['ar-he'],
  C2H2: ['acetileno', 'acetilen', 'c2h2'],
  N2: ['nitrogeno'],
  HE: ['helio'],
  H2: ['hidrogeno'],
  G10: ['g10'],
  G15: ['g15'],
  G30: ['g30'],
  G45: ['g45'],
  'MIX-7525': ['mix'],
  P10: ['p10'],
  SF: ['sf6', 'hexafluoruro'],
  THERMO: ['termo', 'thermo'],
  YALE: ['yale'],
}

const ESTADO_STOCK: Record<string, string> = {
  LLENO: 'llenos',
  VACIO: 'vacios',
  EN_REPARTO: 'enReparto',
  EN_CARGA: 'enCarga',
  MANTENIMIENTO: 'mantenimiento',
}

function escRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clasificarGas(descripcion: string, gases: { id: string; codigo: string; nombre: string }[]): string | null {
  const d = descripcion.toLowerCase()
  for (const g of gases) {
    if (new RegExp(`\\b${escRegex(g.codigo.toLowerCase())}\\b`).test(d)) return g.id
  }
  const tamano = d.match(/\((\d+)\s*kg\)|-\s*(\d+)\s*kg/i)
  if (tamano) {
    const kg = tamano[1] || tamano[2]
    const g = gases.find((x) => x.codigo === `G${kg}`)
    if (g) return g.id
  }
  for (const g of gases) {
    for (const a of ALIASES[g.codigo] || []) if (d.includes(a)) return g.id
  }
  for (const g of gases) {
    if (new RegExp(`\\b${escRegex(g.nombre.toLowerCase())}\\b`).test(d)) return g.id
  }
  return null
}

const pad = (n: number) => String(n).padStart(2, '0')
const mesKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const r2 = (n: number) => Math.round(n * 100) / 100

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const meses = Math.min(Math.max(parseInt(url.searchParams.get('meses') || '12', 10) || 12, 1), 60)
    const ahora = new Date()
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1), 1)

    const [gases, configs, stocks, movs, conteos, recepciones, pedidos, ncCount, totalComp, descRows] =
      await Promise.all([
        db.gas.findMany({ select: { id: true, codigo: true, nombre: true, colorHex: true } }),
        db.configStockGas.findMany(),
        db.stockGas.findMany(),
        db.movimientoStock.findMany({
          where: { createdAt: { gte: desde } },
          select: { gasId: true, tipo: true, cantidad: true, createdAt: true },
        }),
        db.conteoFisico.findMany({
          where: { fecha: { gte: desde } },
          include: { items: { select: { gasId: true, estado: true, cantidadReal: true } } },
          orderBy: { fecha: 'desc' },
        }),
        db.recepcionStock.findMany({
          where: { fecha: { gte: desde } },
          include: { gas: { select: { codigo: true } } },
          orderBy: { fecha: 'desc' },
        }),
        db.pedido.groupBy({ by: ['estado'], _count: { _all: true } }),
        db.comprobanteHistorico.count({ where: { fecha: { gte: desde }, tipo: { startsWith: 'Nota Crédito' } } }),
        db.comprobanteHistorico.count({ where: { fecha: { gte: desde } } }),
        db.$queryRawUnsafe(
          `SELECT ci."descripcion" AS d, SUM(ci."cantidad")::float8 AS uds, SUM(ci."subtotal")::float8 AS imp
           FROM "ComprobanteItemHistorico" ci
           JOIN "ComprobanteHistorico" ch ON ch."id" = ci."comprobanteId"
           WHERE ci."cantidad" > 0 AND ci."subtotal" > 0
             AND EXTRACT(YEAR FROM ch."fecha") >= EXTRACT(YEAR FROM NOW()) - 3
           GROUP BY 1`,
        ) as Promise<any[]>,
      ])

    // ---------- Precios promedio por gas ----------
    const cacheDesc = new Map<string, string | null>()
    const precioPorGas = new Map<string, { uds: number; imp: number }>()
    for (const row of descRows) {
      if (!row.d || NO_MERCADERIA.test(row.d)) continue
      let gasId = cacheDesc.get(row.d)
      if (gasId === undefined) {
        gasId = clasificarGas(row.d, gases)
        cacheDesc.set(row.d, gasId)
      }
      if (!gasId) continue
      const acc = precioPorGas.get(gasId) || { uds: 0, imp: 0 }
      acc.uds += Number(row.uds) || 0
      acc.imp += Number(row.imp) || 0
      precioPorGas.set(gasId, acc)
    }
    const precioProm = new Map<string, number>()
    for (const [gid, a] of precioPorGas) {
      if (a.uds > 0 && a.imp > 0) precioProm.set(gid, a.imp / a.uds)
    }

    // ---------- Stock actual por gas ----------
    const stockTotalActual = new Map<string, number>()
    const stockPorEstado = new Map<string, Record<string, number>>()
    for (const s of stocks) {
      stockTotalActual.set(s.gasId, s.llenos + s.vacios + s.enReparto + s.enCarga + s.mantenimiento)
      stockPorEstado.set(s.gasId, {
        llenos: s.llenos,
        vacios: s.vacios,
        enReparto: s.enReparto,
        enCarga: s.enCarga,
        mantenimiento: s.mantenimiento,
      })
    }

    // ---------- Movimientos por gas|mes ----------
    const movPorGasMes = new Map<string, { entrada: number; salida: number }>()
    for (const m of movs) {
      const mes = mesKey(m.createdAt)
      const k = `${m.gasId}|${mes}`
      const cur = movPorGasMes.get(k) || { entrada: 0, salida: 0 }
      if (m.tipo === 'ENTRADA') cur.entrada += m.cantidad
      else if (m.tipo === 'SALIDA') cur.salida += m.cantidad
      movPorGasMes.set(k, cur)
    }

    // ---------- Rango de meses con datos ----------
    const mesesArr: string[] = []
    let cursor = new Date(desde)
    while (cursor <= ahora) {
      mesesArr.push(mesKey(cursor))
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    const mesMinimo = [...movPorGasMes.keys()].map((k) => k.split('|')[1]).sort()[0]
    const rango = mesMinimo ? mesesArr.filter((m) => m >= mesMinimo) : mesesArr.slice(-1)

    // ---------- Serie mensual por gas (camino inverso desde stock actual) ----------
    const stockFinalPorMes = new Map<string, Map<string, number>>()
    for (let i = rango.length - 1; i >= 0; i--) {
      const mes = rango[i]
      const map = new Map<string, number>()
      const nextMes = i < rango.length - 1 ? rango[i + 1] : null
      const nextMap = nextMes ? stockFinalPorMes.get(nextMes) : null
      for (const [gasId, total] of stockTotalActual) {
        let stock = nextMap?.get(gasId) ?? total
        if (nextMes) {
          const mm = movPorGasMes.get(`${gasId}|${nextMes}`)
          if (mm) stock = Math.max(0, stock - (mm.entrada - mm.salida))
        }
        map.set(gasId, stock)
      }
      stockFinalPorMes.set(mes, map)
    }

    const sumaSerie = (f: (v: Map<string, number>) => number) => {
      const vals = [...rango].map((m) => f(stockFinalPorMes.get(m)!))
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    }
    const stockPromedioUnidades = rango.length
      ? rango.reduce(
          (acc, m) =>
            acc +
            [...(stockFinalPorMes.get(m)?.values() ?? [])].reduce((a, b) => a + b, 0),
          0,
        ) / rango.length
      : 0
    const stockPromedioValor = rango.length
      ? sumaSerie((map) =>
          [...map.entries()].reduce((acc, [gid, n]) => acc + n * (precioProm.get(gid) || 0), 0),
        )
      : 0

    // ---------- Ventas, rotación, cobertura ----------
    const totalEntradas = new Map<string, number>()
    const totalSalidas = new Map<string, number>()
    let unidadesVendidasPeriodo = 0
    for (const [k, mm] of movPorGasMes) {
      const gid = k.split('|')[0]
      totalEntradas.set(gid, (totalEntradas.get(gid) || 0) + mm.entrada)
      totalSalidas.set(gid, (totalSalidas.get(gid) || 0) + mm.salida)
      unidadesVendidasPeriodo += mm.salida
    }
    const valorVentasPeriodo = [...totalSalidas.entries()].reduce(
      (acc, [gid, n]) => acc + n * (precioProm.get(gid) || 0),
      0,
    )
    const ventasMensuales = unidadesVendidasPeriodo / Math.max(rango.length, 1)
    const stockActualUnidades = [...stockTotalActual.values()].reduce((a, b) => a + b, 0)
    const coberturaGlobal = ventasMensuales > 0 ? stockActualUnidades / ventasMensuales : null
    const rotacion = stockPromedioValor > 0 ? valorVentasPeriodo / stockPromedioValor : null
    const diasInventario =
      valorVentasPeriodo > 0
        ? (stockPromedioValor / (valorVentasPeriodo * (12 / Math.max(meses, 1)))) * 365
        : null

    // ---------- Config stock óptimo ----------
    const configPorGas = new Map(configs.map((c) => [c.gasId, c]))
    let stockObjetivoGlobal = 0
    for (const c of configs) {
      stockObjetivoGlobal += c.cantidadOptimaPedido + c.stockMinimo + c.stockSeguridad
    }

    // ---------- Conteos físicos: contracción ----------
    const teoricoReal = new Map<string, { teorico: number; real: number }>()
    let teoricoGlobal = 0
    let realGlobal = 0
    const conteosOut = conteos.map((c) => {
      let teorico = 0
      let real = 0
      for (const it of c.items) {
        const st = stockPorEstado.get(it.gasId)
        const base = it.estado === 'TOTAL' ? stockTotalActual.get(it.gasId) || 0 : st ? st[ESTADO_STOCK[it.estado] || ''] || 0 : 0
        const acc = teoricoReal.get(it.gasId) || { teorico: 0, real: 0 }
        acc.teorico += base
        acc.real += it.cantidadReal
        teoricoReal.set(it.gasId, acc)
        teorico += base
        real += it.cantidadReal
        teoricoGlobal += base
        realGlobal += it.cantidadReal
      }
      return {
        id: c.id,
        fecha: c.fecha,
        usuario: c.usuario,
        teorico,
        real,
        diferencia: real - teorico,
        contraccion: teorico > 0 ? ((teorico - real) / teorico) * 100 : null,
      }
    })
    const contraccionGlobal = teoricoGlobal > 0 ? ((teoricoGlobal - realGlobal) / teoricoGlobal) * 100 : null

    // ---------- Pedidos: backorders y nivel de servicio ----------
    const cntPed = (e: string) => pedidos.find((p) => p.estado === e)?._count._all ?? 0
    const pendientes = cntPed('PENDIENTE')
    const completados = cntPed('COMPLETADO')
    const cancelados = cntPed('CANCELADO')
    const totalPedidos = pedidos.reduce((a, p) => a + p._count._all, 0)
    const backorders = totalPedidos > 0 ? (pendientes / totalPedidos) * 100 : null
    const nivelServicio =
      totalPedidos > 0 ? (completados / (completados + pendientes + cancelados)) * 100 : null

    // ---------- Sales-through ----------
    const recibidoPeriodo =
      [...totalEntradas.values()].reduce((a, b) => a + b, 0) +
      recepciones.reduce((a, r) => a + r.cantidad, 0)
    const salesThrough =
      recepciones.length > 0 && recibidoPeriodo > 0
        ? Math.min((unidadesVendidasPeriodo / recibidoPeriodo) * 100, 100)
        : null

    // ---------- Perdida: contracción + no suministrada ----------
    const perdida = (contraccionGlobal && contraccionGlobal > 0 ? contraccionGlobal : 0) + (backorders || 0)

    const retorno = totalComp > 0 ? (ncCount / totalComp) * 100 : null

    // ---------- Detalle por gas ----------
    const porGas = gases
      .map((g) => {
        const actual = stockTotalActual.get(g.id) || 0
        const cfg = configPorGas.get(g.id)
        const objetivo = cfg ? cfg.cantidadOptimaPedido + cfg.stockMinimo + cfg.stockSeguridad : null
        const vm = (totalSalidas.get(g.id) || 0) / Math.max(rango.length, 1)
        const tr = teoricoReal.get(g.id)
        const valor = actual * (precioProm.get(g.id) || 0)
        return {
          gasId: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          colorHex: g.colorHex,
          stockActual: actual,
          stockObjetivo: objetivo,
          stockMinimo: cfg?.stockMinimo ?? null,
          stockSeguridad: cfg?.stockSeguridad ?? null,
          cantidadOptimaPedido: cfg?.cantidadOptimaPedido ?? null,
          coberturaMeses: vm > 0 ? actual / vm : null,
          ventasMensuales: r2(vm),
          ventasValorPeriodo: r2((totalSalidas.get(g.id) || 0) * (precioProm.get(g.id) || 0)),
          rotacion:
            actual > 0
              ? r2(((totalSalidas.get(g.id) || 0) * (precioProm.get(g.id) || 0)) / Math.max(valor, 1))
              : null,
          contraccion: tr && tr.teorico > 0 ? r2(((tr.teorico - tr.real) / tr.teorico) * 100) : null,
          precioPromedio: precioProm.get(g.id) ? r2(precioProm.get(g.id)!) : null,
          valorStock: r2(valor),
        }
      })
      .filter((g) => g.stockActual > 0 || g.stockObjetivo !== null || g.ventasMensuales > 0)

    // ---------- Serie global ----------
    const serie = rango.map((mes) => {
      let entrada = 0
      let salida = 0
      let stockFinal = 0
      let stockValor = 0
      for (const gid of stockTotalActual.keys()) {
        const mm = movPorGasMes.get(`${gid}|${mes}`)
        if (mm) {
          entrada += mm.entrada
          salida += mm.salida
        }
        const sf = stockFinalPorMes.get(mes)?.get(gid) || 0
        stockFinal += sf
        stockValor += sf * (precioProm.get(gid) || 0)
      }
      return { mes, entrada, salida, stockFinal, stockValor: r2(stockValor) }
    })

    return NextResponse.json({
      periodo: meses,
      resumen: {
        stockPromedioUnidades: Math.round(stockPromedioUnidades),
        stockPromedioValor: r2(stockPromedioValor),
        stockActualUnidades,
        stockObjetivoUnidades: stockObjetivoGlobal,
        coberturaMeses: coberturaGlobal != null ? r2(coberturaGlobal) : null,
        diasInventario: diasInventario != null ? r2(diasInventario) : null,
        rotacion: rotacion != null ? r2(rotacion) : null,
        contraccion: contraccionGlobal != null ? r2(contraccionGlobal) : null,
        perdida: r2(perdida),
        retorno: retorno != null ? r2(retorno) : null,
        salesThrough: salesThrough != null ? r2(salesThrough) : null,
        backorders: backorders != null ? r2(backorders) : null,
        pedidosPendientes: pendientes,
        nivelServicio: nivelServicio != null ? r2(nivelServicio) : null,
        unidadesVendidasPeriodo: Math.round(unidadesVendidasPeriodo),
        valorVentasPeriodo: r2(valorVentasPeriodo),
        valorInventario: r2([...stockTotalActual.entries()].reduce((a, [gid, n]) => a + n * (precioProm.get(gid) || 0), 0)),
      },
      serie,
      porGas,
      conteos: conteosOut,
      recepciones: recepciones.map((r) => ({
        id: r.id,
        fecha: r.fecha,
        gasId: r.gasId,
        codigo: r.gas.codigo,
        cantidad: r.cantidad,
        proveedor: r.proveedor,
        documento: r.documento,
        usuario: r.usuario,
      })),
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/kpis-inventario', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
