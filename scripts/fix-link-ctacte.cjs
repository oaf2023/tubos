const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DIR = 'C:/Para_actualizar/B1_020726_210059/grwjuliocontisrl/grw232/DATA'
const PATH_200 = `${DIR}/GR2_200.dbf`
const PATH_510 = `${DIR}/GR2_510.dbf`
const BATCH_SIZE = 1000

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

async function main() {
  console.log('=== FIX: Re-importar Cuenta Corriente con linkage ===\n')

  // Step 1: Build legacy code map from GR2_200
  console.log('Paso 1: Mapa CUIT -> codigoLegacy desde GR2_200...')
  const gr200 = leerDBF(PATH_200)
  const cuitToLegacy = new Map()
  for (const r of gr200) {
    const cuit = (r.PR_DOC || '').replace(/[^0-9]/g, '')
    const prNum = parseInt(r.PR_NUM, 10)
    if (cuit && prNum && !cuitToLegacy.has(cuit)) cuitToLegacy.set(cuit, prNum)
  }
  console.log(`  ${cuitToLegacy.size} códigos legacy mapeados`)

  // Step 2: Update Cliente.codigoLegacy
  console.log('\nPaso 2: Poblando Cliente.codigoLegacy...')
  const clientes = await prisma.cliente.findMany({
    select: { id: true, taxId: true, nombre: true },
  })
  let upd = 0
  for (const c of clientes) {
    const clean = (c.taxId || '').replace(/[^0-9]/g, '')
    const legacy = cuitToLegacy.get(clean)
    if (legacy) {
      await prisma.cliente.update({
        where: { id: c.id },
        data: { codigoLegacy: legacy },
      })
      upd++
    }
  }
  console.log(`  ${upd} clientes actualizados`)

  // Build: codigoLegacy -> Cliente.id
  const legacyMap = new Map()
  const clientesConLegacy = await prisma.cliente.findMany({
    where: { codigoLegacy: { not: null } },
    select: { id: true, codigoLegacy: true, nombre: true },
  })
  for (const c of clientesConLegacy) {
    legacyMap.set(c.codigoLegacy, { id: c.id, nombre: c.nombre })
  }
  console.log(`  ${legacyMap.size} clientes con legacy code`)

  // Step 3: Delete ALL existing cta cte records and re-import
  console.log('\nPaso 3: Eliminando registros existentes...')
  const beforeDel = await prisma.cuentaCorrienteMovimiento.count()
  await prisma.cuentaCorrienteMovimiento.deleteMany({})
  console.log(`  Eliminados: ${beforeDel}`)

  console.log('\nPaso 4: Re-importando desde GR2_510...')
  const ctaCte = leerDBF(PATH_510)
  console.log(`  Leyendo ${ctaCte.length} registros...`)

  const batchInsert = []
  let linked = 0
  let unlinked = 0

  for (const r of ctaCte) {
    const ctaClie = parseInt(r.CTA_CLIE, 10)
    const cliente = ctaClie ? legacyMap.get(ctaClie) : null

    batchInsert.push({
      codigoClienteLegacy: ctaClie || null,
      clienteId: cliente?.id || null,
      clienteNombre: cliente?.nombre || null,
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
    if (cliente) linked++
    else unlinked++
  }

  console.log(`  Vinculables: ${linked}`)
  console.log(`  Sin vínculo: ${unlinked}`)

  let inserted = 0
  for (let i = 0; i < batchInsert.length; i += BATCH_SIZE) {
    const batch = batchInsert.slice(i, i + BATCH_SIZE)
    const result = await prisma.cuentaCorrienteMovimiento.createMany({
      data: batch,
      skipDuplicates: true,
    })
    inserted += result.count
    if ((i / BATCH_SIZE) % 10 === 0) process.stdout.write('.')
  }

  console.log(`\n\n=== RESULTADO ===`)
  console.log(`Insertados: ${inserted}`)
  console.log(`Vinculados a cliente: ${linked} (${((linked / inserted) * 100).toFixed(1)}%)`)
  console.log(`Sin vínculo: ${unlinked}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
