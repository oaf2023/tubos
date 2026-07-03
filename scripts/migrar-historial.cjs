const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DIR = 'C:/Para_actualizar/B1_020726_210059/grwjuliocontisrl/grw232/DATA'
const PATH_850 = `${DIR}/GR2_850.dbf`
const PATH_851 = `${DIR}/GR2_851.dbf`
const PATH_510 = `${DIR}/GR2_510.dbf`

const BATCH_SIZE = 1000
const DRY_RUN = !process.argv.includes('--live')

const TIPO_MAP = {
  1: 'Remito', 2: 'Pedido', 4: 'Factura', 5: 'Nota Débito',
  6: 'Nota Crédito', 7: 'Recibo', 8: 'Presupuesto',
  11: 'Pedido', 12: 'Factura', 13: 'Nota Débito',
  14: 'Factura', 15: 'Nota Débito', 16: 'Nota Crédito', 17: 'Remito',
}

function leerDBF(path) {
  const buf = fs.readFileSync(path)
  const numRecords = buf.readUInt32LE(4)
  const headerLen = buf.readUInt16LE(8)
  const recordLen = buf.readUInt16LE(10)

  const fields = []
  let offset = 32
  while (offset < headerLen - 1 && buf.readUInt8(offset) !== 0x0D) {
    const name = buf.toString('ascii', offset, offset + 11).replace(/[\x00]/g, '').trim()
    fields.push({ name, length: buf.readUInt8(offset + 16) })
    offset += 32
  }

  const records = []
  let dataOffset = headerLen
  for (let r = 0; r < numRecords; r++) {
    const del = buf.readUInt8(dataOffset)
    if (del === 42) { dataOffset += recordLen; continue }
    const raw = {}
    let pos = dataOffset + 1
    fields.forEach(f => {
      raw[f.name] = buf.toString('latin1', pos, pos + f.length).trim()
      pos += f.length
    })
    records.push(raw)
    dataOffset += recordLen
  }
  return records
}

function parseDate(str) {
  if (!str || str.length < 8) return null
  const m = str.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (!m) return null
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
}

function parseDec(str) {
  const v = parseFloat((str || '').replace(/[^0-9.,\-]/g, '').replace(',', '.'))
  return isNaN(v) ? 0 : v
}

function derivarTipo(tcom, abex) {
  const base = TIPO_MAP[tcom] || `Tipo${tcom}`
  const letra = (abex || '').trim()
  return letra ? `${base} ${letra}` : base
}

async function cargarMapas() {
  const clientes = await prisma.cliente.findMany({
    where: { taxId: { not: null } },
    select: { id: true, taxId: true, nombre: true },
  })
  const clientePorCuit = new Map()
  clientes.forEach(c => {
    const clean = (c.taxId || '').replace(/[^0-9]/g, '')
    if (clean) clientePorCuit.set(clean, c.id)
  })
  console.log(`  Clientes en DB: ${clientes.length}`)

  const vendedores = await prisma.usuario.findMany({
    where: { activo: true, rol: { nombre: 'vendedor' } },
    select: { id: true, usuario: true, nombre: true },
  })
  const vendPorCodigo = new Map()
  vendedores.forEach(v => {
    const match = v.usuario.match(/^v(\d+)$/i)
    if (match) vendPorCodigo.set(parseInt(match[1], 10), v.nombre)
  })
  console.log(`  Vendedores en DB: ${vendedores.length}`)

  return { clientePorCuit, vendPorCodigo }
}

async function migrarComprobantes(records, mapas) {
  const { clientePorCuit, vendPorCodigo } = mapas
  console.log(`\n=== Comprobantes (GR2_850): ${records.length} registros ===`)

  const batchInsert = []
  let skipped = 0

  for (const r of records) {
    const cuit = (r.COC_PRDO || '').replace(/[^0-9]/g, '')
    const clienteId = clientePorCuit.get(cuit) || null

    const tipo = derivarTipo(parseInt(r.COC_TCOM, 10), r.COC_ABEX)
    const tcom = parseInt(r.COC_TCOM, 10)

    batchInsert.push({
      fecha: parseDate(r.COC_FECH) || new Date(),
      fechaVto: parseDate(r.COC_FVTO),
      tipo,
      letra: r.COC_ABEX || null,
      puntoVenta: r.COC_CBTE ? r.COC_CBTE.split('-')[0] || null : null,
      numero: r.COC_CBTE || null,
      cbteCompleto: r.COC_COMP || '',
      clienteId,
      clienteNombre: r.COC_PRNO || '',
      clienteDoc: r.COC_PRDO || null,
      clienteDocTipo: parseInt(r.COC_PRTD, 10) || null,
      netoGravado: parseDec(r.COC_NGRA),
      netoExento: parseDec(r.COC_NEXE),
      iva21: parseDec(r.COC_MO21),
      iva105: parseDec(r.COC_MO10),
      iva27: parseDec(r.COC_MO27),
      percepcionIibb: parseDec(r.COC_PEIB),
      total: parseDec(r.COC_TOTA),
      vendedorNombre: vendPorCodigo.get(parseInt(r.COC_VEND, 10)) || null,
    })

    // Sin observaciones porque COC_OBSE es Memo (no tenemos .FPT)
  }

  if (DRY_RUN) {
    console.log(`  [DRY] Se insertarían ${batchInsert.length} comprobantes`)
    console.log('  Ejemplo:')
    batchInsert.slice(0, 3).forEach(c => {
      console.log(`    ${c.cbteCompleto} | ${c.clienteNombre} | $${c.total.toFixed(2)}`)
    })
    return { inserted: 0, skipped: 0 }
  }

  let inserted = 0
  for (let i = 0; i < batchInsert.length; i += BATCH_SIZE) {
    const batch = batchInsert.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(batchInsert.length / BATCH_SIZE)

    try {
      const result = await prisma.comprobanteHistorico.createMany({
        data: batch,
        skipDuplicates: true,
      })
      inserted += result.count
      process.stdout.write(`\r  Lote ${batchNum}/${totalBatches}: ${result.count} insertados`)
    } catch (e) {
      console.log(`\n  ✗ Error lote ${batchNum}: ${e.message.slice(0, 120)}`)
    }
  }
  console.log(`\n  Total comprobantes insertados: ${inserted}`)
  return { inserted, skipped }
}

async function migrarItems(items, batchSize = 2000) {
  console.log(`\n=== Items (GR2_851): ${items.length} registros ===`)

  // Cargar mapa de comprobantes (cbteCompleto → id)
  const comprobantes = await prisma.comprobanteHistorico.findMany({
    select: { id: true, cbteCompleto: true },
  })
  const compMap = new Map()
  comprobantes.forEach(c => compMap.set(c.cbteCompleto, c.id))
  console.log(`  Mapa de comprobantes: ${compMap.size} entradas`)

  const batchInsert = []
  let sinComprobante = 0

  for (const it of items) {
    const compId = compMap.get(it.CMP_COMP || '')
    if (!compId) { sinComprobante++; continue }

    const descripcion = [
      it.CMP_DET1, it.CMP_DET2, it.CMP_DET3, it.CMP_DET4,
    ].filter(Boolean).join(' - ').trim() || '(sin descripción)'

    batchInsert.push({
      comprobanteId: compId,
      codigoProducto: it.CMP_COD1 || null,
      descripcion,
      cantidad: parseDec(it.CMP_CANT),
      precioUnitario: parseDec(it.CMP_COST),
      descuento: parseDec(it.CMP_DTC),
      subtotal: parseDec(it.CMP_SUBT),
      alicuotaIva: parseDec(it.CMP_IVA),
      importeIva: parseDec(it.CMP_IMP),
    })
  }

  if (DRY_RUN) {
    console.log(`  [DRY] Se insertarían ${batchInsert.length} items`)
    console.log(`  Sin comprobante padre: ${sinComprobante}`)
    console.log('  Ejemplo:')
    batchInsert.slice(0, 3).forEach(it => {
      console.log(`    ${it.codigoProducto} | ${it.descripcion.slice(0, 50)} | ${it.cantidad} x $${it.precioUnitario.toFixed(2)}`)
    })
    return { inserted: 0, sinComprobante }
  }

  let inserted = 0
  for (let i = 0; i < batchInsert.length; i += batchSize) {
    const batch = batchInsert.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(batchInsert.length / batchSize)

    try {
      const result = await prisma.comprobanteItemHistorico.createMany({
        data: batch,
        skipDuplicates: true,
      })
      inserted += result.count
      process.stdout.write(`\r  Lote ${batchNum}/${totalBatches}: ${result.count} insertados`)
    } catch (e) {
      console.log(`\n  ✗ Error lote ${batchNum}: ${e.message.slice(0, 120)}`)
    }
  }
  console.log(`\n  Total items insertados: ${inserted}`)
  return { inserted, sinComprobante }
}

async function migrarCtaCte(records) {
  console.log(`\n=== Cuenta Corriente (GR2_510): ${records.length} registros ===`)

  const clientes = await prisma.cliente.findMany({
    where: { taxId: { not: null } },
    select: { id: true, taxId: true, nombre: true },
  })
  const nombrePorCuit = new Map()
  clientes.forEach(c => {
    const clean = (c.taxId || '').replace(/[^0-9]/g, '')
    if (clean) nombrePorCuit.set(clean, c.nombre)
  })

  const batchInsert = []
  let sinCliente = 0

  for (const r of records) {
    const ctaClie = r.CTA_CLIE ? parseInt(r.CTA_CLIE, 10) : 0
    // CTA_CLIE es el número de cliente en GR2, no tenemos CUIT aquí
    // así que guardamos el nombre genérico o lo que esté disponible
    const clienteNombre = r.OPE_OPER?.split('-')[1]?.trim() || ''

    batchInsert.push({
      clienteId: null, // No tenemos CUIT en GR2_510 para linkear
      clienteNombre: clienteNombre || null,
      comprobante: r.VTA_COMP || '',
      fecha: parseDate(r.CTA_FECH) || new Date(),
      fechaVto: parseDate(r.CTA_FVTO),
      cuota: r.CTA_CUOT || null,
      debe: parseDec(r.CTA_DEBE),
      haber: parseDec(r.CTA_HABE),
      saldo: parseDec(r.CTA_SALD),
      pagado: parseDec(r.CTA_PAGA),
      operador: r.OPE_OPER || null,
    })
  }

  if (DRY_RUN) {
    console.log(`  [DRY] Se insertarían ${batchInsert.length} movimientos`)
    console.log('  Ejemplo:')
    batchInsert.slice(0, 3).forEach(m => {
      console.log(`    ${m.comprobante} | Debe: $${m.debe.toFixed(2)} | Haber: $${m.haber.toFixed(2)} | Saldo: $${m.saldo.toFixed(2)}`)
    })
    return { inserted: 0, sinCliente }
  }

  let inserted = 0
  for (let i = 0; i < batchInsert.length; i += BATCH_SIZE) {
    const batch = batchInsert.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(batchInsert.length / BATCH_SIZE)

    try {
      const result = await prisma.cuentaCorrienteMovimiento.createMany({
        data: batch,
        skipDuplicates: true,
      })
      inserted += result.count
      process.stdout.write(`\r  Lote ${batchNum}/${totalBatches}: ${result.count} insertados`)
    } catch (e) {
      console.log(`\n  ✗ Error lote ${batchNum}: ${e.message.slice(0, 120)}`)
    }
  }
  console.log(`\n  Total movimientos insertados: ${inserted}`)
  return { inserted, sinCliente }
}

async function main() {
  console.log('='.repeat(60))
  console.log('  FASE 5 — Migración de Historial')
  console.log('  GR2_850 (comprobantes) + GR2_851 (items) + GR2_510 (cta cte)')
  console.log('='.repeat(60))
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (solo simulación)' : 'LIVE (escribe en DB)'}\n`)

  // Cargar mapas de referencia
  console.log('Cargando mapas de clientes y vendedores...')
  const mapas = await cargarMapas()

  // Fase 1: Comprobantes (GR2_850)
  console.log('\n--------------------------------------------------')
  console.log('FASE 1 — Comprobantes')
  console.log('--------------------------------------------------')
  const comprobantes = leerDBF(PATH_850)
  console.log(`Leídos: ${comprobantes.length} comprobantes`)
  const res1 = await migrarComprobantes(comprobantes, mapas)

  if (!DRY_RUN) {
    // Fase 2: Items (GR2_851) — necesita que los comprobantes ya estén insertados
    console.log('\n--------------------------------------------------')
    console.log('FASE 2 — Items de comprobantes')
    console.log('--------------------------------------------------')
    const items = leerDBF(PATH_851)
    console.log(`Leídos: ${items.length} items`)
    const res2 = await migrarItems(items)

    // Fase 3: Cuenta Corriente (GR2_510)
    console.log('\n--------------------------------------------------')
    console.log('FASE 3 — Cuenta Corriente')
    console.log('--------------------------------------------------')
    const ctaCte = leerDBF(PATH_510)
    console.log(`Leídos: ${ctaCte.length} movimientos`)
    const res3 = await migrarCtaCte(ctaCte)

    console.log('\n' + '='.repeat(60))
    console.log('  RESUMEN FINAL')
    console.log('='.repeat(60))
    console.log(`  Comprobantes insertados: ${res1.inserted}`)
    console.log(`  Items insertados:        ${res2.inserted}`)
    console.log(`  Items sin comprobante:    ${res2.sinComprobante}`)
    console.log(`  Movs. cta cte insertados: ${res3.inserted}`)
    console.log(`  Total registros:          ${res1.inserted + res2.inserted + res3.inserted}`)
    console.log('='.repeat(60))
  }

  if (DRY_RUN) {
    console.log('\n⚠  Dry-run completado. Ejecutá con --live para migrar.')
  }
}

main()
  .catch(e => { console.error('\nFATAL:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
