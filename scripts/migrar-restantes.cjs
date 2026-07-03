const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DBF_PATH = 'C:/Para_actualizar/B1_020726_210059/grwjuliocontisrl/grw232/DATA/GR2_200.dbf'
const MAP_TDO = { '1': 'DNI', '2': 'CUIT' }
const MAP_TIV = {
  '1': 'Consumidor Final', '2': 'IVA Responsable Inscripto', '3': 'IVA Exento',
  '4': 'Monotributista', '5': 'IVA Responsable No Inscripto',
}

function dividirDireccion(dir) {
  dir = (dir || '').trim()
  const match = dir.match(/^(.*?)\s+(\d+.*)$/)
  return match ? { calle: match[1].trim(), altura: match[2].trim() } : { calle: dir, altura: '' }
}

async function main() {
  // 1. Leer GR2
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

  const gr2Records = []
  let dataOffset = headerLen
  for (let r = 0; r < numRecords; r++) {
    const del = buf.readUInt8(dataOffset)
    if (del === 42) { dataOffset += recordLen; continue }
    const raw = {}
    let pos = dataOffset + 1
    fields.forEach(f => { raw[f.name] = buf.toString('latin1', pos, pos + f.length).trim(); pos += f.length })
    const doc = (raw.PR_DOC || '').replace(/[^0-9]/g, '')
    if (doc) gr2Records.push(raw)
    dataOffset += recordLen
  }

  // 2. Obtener nombres ya existentes en DB
  const existing = await prisma.cliente.findMany({ select: { nombre: true } })
  const existingSet = new Set(existing.map(e => e.nombre.toUpperCase().trim()))

  // 3. Filtrar solo los que faltan
  const pendientes = gr2Records.filter(r => !existingSet.has(r.PR_NOM.toUpperCase().trim()))
  console.log(`Total GR2: ${gr2Records.length}, Ya en DB: ${existing.length}, Pendientes: ${pendientes.length}`)

  if (pendientes.length === 0) { console.log('✓ Todos migrados.'); return }

  // 4. Migrar en batches de 50 con upsert
  const BATCH_SIZE = 50
  let migrated = 0
  let errors = 0

  for (let i = 0; i < pendientes.length; i += BATCH_SIZE) {
    const batch = pendientes.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(pendientes.length / BATCH_SIZE)
    process.stdout.write(`Lote ${batchNum}/${totalBatches}... `)

    for (const r of batch) {
      const dir = dividirDireccion(r.PR_DIR)
      const doc = r.PR_DOC.replace(/[^0-9]/g, '')
      const telefono = [r.PR_TE1, r.PR_TE2, r.PR_TE3, r.PR_TE4, r.PR_TE5].filter(Boolean).join(' / ')
      const notas = [r.PR_OB1, r.PR_OB2, r.PR_OB3].filter(Boolean).join(' | ')

      const data = {
        nombre: r.PR_NOM, taxId: doc, tipoDocumento: MAP_TDO[r.PR_TDO] || null,
        numeroDocumento: doc, calle: dir.calle || null, altura: dir.altura || null,
        ciudad: r.PR_LOC || null, provincia: r.PR_PRO || null, codigoPostal: r.PR_CP || null,
        pais: r.PR_PAI || 'Argentina', telefono: telefono || null, email: r.PR_MAI || null,
        contacto: r.PR_CON || null, empresa: r.PR_FANT || null,
        condicionIva: MAP_TIV[r.PR_TIV] || null, iibb: r.PR_NIB || null,
        limiteCredito: parseFloat(r.PR_CRE) || null, notas: notas || null,
        activo: true, estadoCliente: 'ACTIVO',
      }

      if (r.PR_ALT) {
        const f = r.PR_ALT.match(/^(\d{4})(\d{2})(\d{2})$/)
        if (f) data.createdAt = new Date(`${f[1]}-${f[2]}-${f[3]}T00:00:00.000Z`)
      }
      if (r.PR_SDO && parseFloat(r.PR_SDO) > 0) data.estadoCuenta = 'PENDIENTE'

      try {
        await prisma.cliente.upsert({ where: { nombre: r.PR_NOM }, update: data, create: data })
        migrated++
        process.stdout.write('.')
      } catch (e) {
        errors++
        process.stdout.write('x')
      }
    }
    console.log(` ${migrated} ok, ${errors} err`)
  }

  console.log(`\n✓ Completado. Migrados: ${migrated}, Errores: ${errors}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
