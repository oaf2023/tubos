// Backfill de historia de stock para KPIs de inventario.
// Construye MovimientoStock mensual por gas desde:
//  - ENTRADA: cilindros creados en el mes (Cylinder.createdAt)
//  - SALIDA:  ventas mensuales por gas (ComprobanteItemHistorico por descripcion)
// Inicializa StockGas desde el estado actual de Cylinder.
// Idempotente: borra movimientos con observacion [backfill] antes de recrearlos.
// Uso: node scripts/backfill-stock-historia.mjs
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ALIASES = {
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

const NO_MERCADERIA = /^(PER|PERCEPCION|DESCUENTO|FLETE|SEGURO|COMISION|REDONDEO|SEGURO)/i

function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clasificarGas(item, gases) {
  const d = String(item.descripcion || '').toLowerCase()
  for (const g of gases) {
    const token = new RegExp(`\\b${escRegex(g.codigo.toLowerCase())}\\b`)
    if (token.test(d)) return g.id
  }
  const tamano = d.match(/\((\d+)\s*kg\)|-\s*(\d+)\s*kg/i)
  if (tamano) {
    const kg = tamano[1] || tamano[2]
    const g = gases.find((x) => x.codigo === `G${kg}`)
    if (g) return g.id
  }
  for (const g of gases) {
    const alias = ALIASES[g.codigo] || []
    for (const a of alias) {
      if (d.includes(a)) return g.id
    }
  }
  for (const g of gases) {
    const nombre = new RegExp(`\\b${escRegex(g.nombre.toLowerCase())}\\b`)
    if (nombre.test(d)) return g.id
  }
  return null
}

async function main() {
  const gases = await db.gas.findMany({ select: { id: true, codigo: true, nombre: true } })

  console.log(`Borrando movimientos [backfill] previos...`)
  const borrados = await db.movimientoStock.deleteMany({ where: { observacion: { startsWith: '[backfill]' } } })
  console.log(`  eliminados: ${borrados.count}`)

  const mesKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  // ---------- ENTRADAS: cilindros creados por mes ----------
  console.log('ENTRADAS por mes (cilindros creados)...')
  const entradasRaw = await db.$queryRawUnsafe(
    `SELECT "gasId", to_char("createdAt", 'YYYY-MM') AS mes, COUNT(*)::int AS n
     FROM "Cylinder" WHERE "createdAt" IS NOT NULL GROUP BY 1, 2 ORDER BY 2`,
  )
  const entradas = new Map()
  for (const r of entradasRaw) {
    if (!r.gasId) continue
    const k = `${r.mes}|${r.gasId}`
    entradas.set(k, Number(r.n))
  }

  // ---------- SALIDAS: ventas mensuales por gas ----------
  console.log('SALIDAS por mes (ventas por descripcion)...')
  const items = await db.$queryRawUnsafe(
    `SELECT ci."descripcion", ci."cantidad", to_char(ch."fecha", 'YYYY-MM') AS mes
     FROM "ComprobanteItemHistorico" ci
     JOIN "ComprobanteHistorico" ch ON ch."id" = ci."comprobanteId"
     WHERE ci."cantidad" > 0
       AND EXTRACT(YEAR FROM ch."fecha") BETWEEN 2010 AND 2026`,
  )
  const salidas = new Map()
  const genericoPorMes = new Map()
  let sinClasificar = 0
  let sinClasificarUnidades = 0
  for (const it of items) {
    if (!it.descripcion || NO_MERCADERIA.test(it.descripcion)) continue
    const unidades = Number(it.cantidad) || 0
    if (/gas envasado x kg\b/.test(String(it.descripcion).toLowerCase())) {
      genericoPorMes.set(it.mes, (genericoPorMes.get(it.mes) || 0) + unidades)
      continue
    }
    const gasId = clasificarGas(it, gases)
    if (!gasId) {
      sinClasificar++
      sinClasificarUnidades += unidades
      continue
    }
    const k = `${it.mes}|${gasId}`
    salidas.set(k, (salidas.get(k) || 0) + unidades)
  }
  const familiaLpg = new Set(
    gases.filter((g) => /^G\d+$/.test(g.codigo) || g.codigo === 'YALE').map((g) => g.id),
  )
  for (const [mes, unidades] of genericoPorMes) {
    let total = 0
    for (const gid of familiaLpg) total += salidas.get(`${mes}|${gid}`) || 0
    if (total <= 0) continue
    for (const gid of familiaLpg) {
      const k = `${mes}|${gid}`
      salidas.set(k, (salidas.get(k) || 0) + (unidades * (salidas.get(k) || 0)) / total)
    }
  }
  console.log(`  items totales: ${items.length}, sin clasificar: ${sinClasificar} (${Math.round(sinClasificarUnidades)} uds), generico repartido: ${Math.round([...genericoPorMes.values()].reduce((a, b) => a + b, 0))} uds`)

  // ---------- Persistir movimientos mensuales ----------
  const fechas = new Set()
  for (const k of entradas.keys()) fechas.add(k.split('|')[0])
  for (const k of salidas.keys()) fechas.add(k.split('|')[0])

  let creados = 0
  for (const mes of [...fechas].sort()) {
    const [y, m] = mes.split('-').map(Number)
    const ultimoDia = new Date(Date.UTC(y, m, 0, 23, 59, 59))
    for (const g of gases) {
      const e = entradas.get(`${mes}|${g.id}`)
      const s = salidas.get(`${mes}|${g.id}`)
      if (e && e > 0) {
        await db.movimientoStock.create({
          data: {
            gasId: g.id,
            tipo: 'ENTRADA',
            cantidad: e,
            usuario: 'sistema',
            observacion: `[backfill] cilindros creados ${mes}`,
            createdAt: ultimoDia,
          },
        })
        creados++
      }
      if (s && s > 0) {
        await db.movimientoStock.create({
          data: {
            gasId: g.id,
            tipo: 'SALIDA',
            cantidad: Math.round(s * 100) / 100,
            usuario: 'sistema',
            observacion: `[backfill] ventas ${mes}`,
            createdAt: ultimoDia,
          },
        })
        creados++
      }
    }
  }
  console.log(`Movimientos creados: ${creados}`)

  // ---------- Inicializar StockGas desde estado actual ----------
  console.log('Inicializando StockGas...')
  const porEstado = await db.cylinder.groupBy({ by: ['gasId', 'estado'], _count: { _all: true } })
  const MAPA = {
    LLENO: 'llenos',
    VACIO: 'vacios',
    EN_REPARTO: 'enReparto',
    EN_CARGA: 'enCarga',
    MANTENIMIENTO: 'mantenimiento',
  }
  const acum = new Map()
  for (const r of porEstado) {
    if (!r.gasId) continue
    const key = MAPA[r.estado] || null
    if (!key) continue
    const cur = acum.get(r.gasId) || { llenos: 0, vacios: 0, enReparto: 0, enCarga: 0, mantenimiento: 0, baja: 0 }
    cur[key] += r._count._all
    acum.set(r.gasId, cur)
  }
  for (const [gasId, c] of acum) {
    await db.stockGas.upsert({
      where: { gasId },
      create: { gasId, ...c },
      update: { ...c },
    })
  }
  console.log(`StockGas actualizado para ${acum.size} gases`)

  console.log('Backfill completado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
