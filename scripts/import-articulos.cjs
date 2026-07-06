// Run: node scripts/import-articulos.cjs
// Imports CSV into PostgreSQL via Prisma

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const CSV_PATH = path.join(__dirname, '..', 'AppDistricon', 'csv', 'data_05012015_GR2_300.csv')

const MAIN = new Set([
  'ART_CODI', 'ART_DET1', 'ART_COD1', 'ART_COD2', 'ART_COD3',
  'ART_PRE1', 'ART_PRE2', 'ART_PRE3', 'ART_PRE4', 'ART_COST', 'ART_TIVA',
  'ART_STIN', 'ART_SMIN', 'ART_SMAX', 'ART_UNID', 'ART_MARC', 'ART_RUBR',
  'ART_SUBR', 'ART_DPTO', 'ART_DTO1', 'ART_DTO2', 'ART_DTO3', 'ART_DTOG',
  'ART_LIST', 'ART_OFER', 'ART_POFE', 'ART_FLET', 'ART_OBS', 'ART_DET2',
  'ART_DET3', 'ART_DET4',
])

const FLOAT_FIELDS = new Set([
  'ART_PRE1', 'ART_PRE2', 'ART_PRE3', 'ART_PRE4', 'ART_COST',
  'ART_STIN', 'ART_SMIN', 'ART_SMAX', 'ART_DTO1', 'ART_DTO2', 'ART_DTO3', 'ART_DTOG',
  'ART_POFE', 'ART_FLET',
])
const INT_FIELDS = new Set([
  'ART_TIVA', 'ART_MARC', 'ART_RUBR', 'ART_SUBR', 'ART_DPTO',
  'ART_LIST', 'ART_OFER', 'ART_CODI',
])

function parseRow(headers, values) {
  const mainFields = {}
  const extraFields = {}
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    const v = values[i] === '' ? null : values[i]
    if (MAIN.has(h)) {
      if (v === null) {
        mainFields[h] = null
      } else if (FLOAT_FIELDS.has(h)) {
        mainFields[h] = parseFloat(v)
      } else if (INT_FIELDS.has(h)) {
        mainFields[h] = parseInt(v, 10)
      } else {
        mainFields[h] = v
      }
    } else {
      if (v !== null) extraFields[h] = v
    }
  }
  return { ...mainFields, datos: extraFields }
}

async function main() {
  console.log(`Reading: ${CSV_PATH}`)
  const raw = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim().length > 0)
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim())

  console.log(`Headers (${headers.length}): ${headers.join(', ')}`)

  const prisma = new PrismaClient({ log: ['warn', 'error'] })
  await prisma.$connect()

  // Clear existing
  const existing = await prisma.articulo.count()
  if (existing > 0) {
    console.log(`Deleting ${existing} existing records...`)
    await prisma.articulo.deleteMany()
  }

  const batchSize = 200
  let batch = []
  let total = 0

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const data = parseRow(headers, values)
    if (!data.ART_CODI) continue // skip invalid rows
    batch.push(data)
    total++

    if (batch.length >= batchSize) {
      await prisma.articulo.createMany({ data: batch })
      batch = []
      process.stdout.write(`\r  ${total} imported...`)
    }
  }
  if (batch.length) {
    await prisma.articulo.createMany({ data: batch })
  }

  console.log(`\nDone! ${total} articles imported.`)

  const verify = await prisma.articulo.count()
  console.log(`Verification: ${verify} records in database.`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
