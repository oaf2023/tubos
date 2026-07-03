const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DBF_PATH = 'C:/Para_actualizar/B1_020726_210059/grwjuliocontisrl/grw232/DATA/GR2_200.dbf'
const BATCH_SIZE = 50
const DRY_RUN = !process.argv.includes('--live')

const MAP_TDO = { '1': 'DNI', '2': 'CUIT' }
const MAP_TIV = {
  '1': 'Consumidor Final',
  '2': 'IVA Responsable Inscripto',
  '3': 'IVA Exento',
  '4': 'Monotributista',
  '5': 'IVA Responsable No Inscripto',
}

function dividirDireccion(dir) {
  dir = (dir || '').trim()
  const match = dir.match(/^(.*?)\s+(\d+.*)$/)
  if (match) return { calle: match[1].trim(), altura: match[2].trim() }
  return { calle: dir, altura: '' }
}

function leerGR2() {
  const buf = fs.readFileSync(DBF_PATH)
  const numRecords = buf.readUInt32LE(4)
  const headerLen = buf.readUInt16LE(8)
  const recordLen = buf.readUInt16LE(10)

  const fields = []
  let offset = 32
  while (offset < headerLen - 1 && buf.readUInt8(offset) !== 0x0D) {
    const name = buf.toString('ascii', offset, offset + 11).replace(/[\x00]/g, '').trim()
    fields.push({ name, offset, length: buf.readUInt8(offset + 16) })
    offset += 32
  }

  const records = []
  let dataOffset = headerLen
  let deletedCount = 0
  let emptyDocCount = 0

  for (let r = 0; r < numRecords; r++) {
    const del = buf.readUInt8(dataOffset)
    if (del === 42) { deletedCount++; dataOffset += recordLen; continue }

    const raw = {}
    let pos = dataOffset + 1
    fields.forEach(f => {
      raw[f.name] = buf.toString('latin1', pos, pos + f.length).trim()
      pos += f.length
    })

    const doc = (raw.PR_DOC || '').replace(/[^0-9]/g, '')
    if (!doc) { emptyDocCount++; dataOffset += recordLen; continue }

    // Skip records where PR_TDO=1 (personas, no empresas) — opcional
    // if (raw.PR_TDO === '1') { dataOffset += recordLen; continue }

    records.push(raw)
    dataOffset += recordLen
  }

  return { records, total: numRecords, deletedCount, emptyDocCount }
}

async function main() {
  console.log('=== Migración GR2_200 → GasTrack AR Cliente ===')
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (solo simulación)' : 'LIVE (escribe en DB)'}`)
  console.log('')

  const { records, total, deletedCount, emptyDocCount } = leerGR2()
  console.log(`Leídos: ${total} registros en GR2_200`)
  console.log(`Eliminados (lógicos): ${deletedCount}`)
  console.log(`Sin CUIT/DNI: ${emptyDocCount}`)
  console.log(`A procesar: ${records.length}`)
  console.log('')

  // Verificar duplicados por taxId
  const dups = new Map()
  records.forEach(r => {
    const doc = r.PR_DOC.replace(/[^0-9]/g, '')
    if (!dups.has(doc)) dups.set(doc, [])
    dups.get(doc).push(r)
  })
  const duplicates = [...dups.entries()].filter(([, v]) => v.length > 1)
  if (duplicates.length > 0) {
    console.log(`⚠ Duplicados por CUIT/DNI: ${duplicates.length}`)
    duplicates.slice(0, 5).forEach(([doc, recs]) => {
      console.log(`  CUIT ${doc}: ${recs.map(r => `${r.PR_NUM} ${r.PR_NOM}`).join(', ')}`)
    })
    if (duplicates.length > 5) console.log(`  ... y ${duplicates.length - 5} más`)
  }

  // Verificar duplicados por nombre exacto
  const nameDups = new Map()
  records.forEach(r => {
    const key = r.PR_NOM.toUpperCase().trim()
    if (!nameDups.has(key)) nameDups.set(key, [])
    nameDups.get(key).push(r)
  })
  const nameDupList = [...nameDups.entries()].filter(([, v]) => v.length > 1)
  console.log(`\nDuplicados por nombre: ${nameDupList.length}`)
  nameDupList.slice(0, 3).forEach(([name, recs]) => {
    console.log(`  "${name}": ${recs.map(r => `#${r.PR_NUM}`).join(', ')}`)
  })

  if (DRY_RUN) {
    console.log('\nPrimeros 5 registros a migrar:')
    records.slice(0, 5).forEach(r => {
      const dir = dividirDireccion(r.PR_DIR)
      console.log(`  ${r.PR_NOM} | CUIT: ${r.PR_DOC} | Dir: ${dir.calle} ${dir.altura} | ${r.PR_LOC}, ${r.PR_PRO} | Tel: ${r.PR_TE1}`)
    })
  }

  // Migrar
  let migrated = 0
  let errors = 0
  let skipped = 0

  if (DRY_RUN) {
    console.log('\n(dry-run completo — no se escribió nada en la DB)\n')
    console.log('=== Resumen ===')
    console.log(`A migrar: ${records.length}`)
    console.log(`Duplicados x CUIT: ${duplicates.length} grupos`)
    console.log(`Sin CUIT: ${emptyDocCount}`)
    return
  }

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(records.length / BATCH_SIZE)

    console.log(`\nLote ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, records.length)} de ${records.length})`)

    for (const r of batch) {
      const dir = dividirDireccion(r.PR_DIR)
      const doc = r.PR_DOC.replace(/[^0-9]/g, '')

      const existing = await prisma.cliente.findFirst({ where: { taxId: { contains: doc.slice(-8) } } })
      if (existing) {
        console.log(`  ⏭ ${r.PR_NOM} — ya existe (CUIT: ${doc})`)
        skipped++
        continue
      }

      const telefono = [r.PR_TE1, r.PR_TE2, r.PR_TE3, r.PR_TE4, r.PR_TE5].filter(Boolean).join(' / ')
      const notas = [r.PR_OB1, r.PR_OB2, r.PR_OB3].filter(Boolean).join(' | ')

      const data = {
        nombre: r.PR_NOM,
        taxId: doc,
        tipoDocumento: MAP_TDO[r.PR_TDO] || null,
        numeroDocumento: doc,
        calle: dir.calle || null,
        altura: dir.altura || null,
        ciudad: r.PR_LOC || null,
        provincia: r.PR_PRO || null,
        codigoPostal: r.PR_CP || null,
        pais: r.PR_PAI || 'Argentina',
        telefono: telefono || null,
        email: r.PR_MAI || null,
        contacto: r.PR_CON || null,
        empresa: r.PR_FANT || null,
        condicionIva: MAP_TIV[r.PR_TIV] || null,
        iibb: r.PR_NIB || null,
        limiteCredito: parseFloat(r.PR_CRE) || null,
        notas: notas || null,
        activo: true,
        estadoCliente: 'ACTIVO',
      }

      if (r.PR_ALT) {
        const fecha = r.PR_ALT.match(/^(\d{4})(\d{2})(\d{2})$/)
        if (fecha) data.createdAt = new Date(`${fecha[1]}-${fecha[2]}-${fecha[3]}T00:00:00.000Z`)
      }

      if (r.PR_SDO && parseFloat(r.PR_SDO) > 0) {
        data.estadoCuenta = 'PENDIENTE'
      }

      try {
        await prisma.cliente.upsert({
          where: { nombre: r.PR_NOM },
          update: data,
          create: data,
        })
        migrated++
        process.stdout.write('.')
      } catch (e) {
        errors++
        console.log(`\n  ✗ Error #${r.PR_NUM} ${r.PR_NOM}: ${e.message.slice(0, 100)}`)
      }
    }
    console.log('')
  }

  console.log('\n=== Resumen ===')
  console.log(`Migrados: ${migrated}`)
  console.log(`Saltados (ya existían): ${skipped}`)
  console.log(`Errores: ${errors}`)
  if (DRY_RUN) console.log('\n⚠ Ejecutá con --live para escribir en la base de datos.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
