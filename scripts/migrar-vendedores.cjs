const fs = require('fs')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DBF_PATH = 'C:/Para_actualizar/B1_020726_210059/grwjuliocontisrl/grw232/DATA/GR2_600.DBF'
const DRY_RUN = !process.argv.includes('--live')
const DEFAULT_PASSWORD = 'Districon2024'

function leerDBF(path) {
  const buf = fs.readFileSync(path)
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
  for (let r = 0; r < numRecords; r++) {
    const del = buf.readUInt8(dataOffset)
    if (del === 42) { dataOffset += recordLen; continue }
    const raw = {}
    let pos = dataOffset + 1
    fields.forEach(f => {
      const val = buf.toString('latin1', pos, pos + f.length).trim()
      raw[f.name] = val
      pos += f.length
    })
    raw.VEN_CODI = parseInt(raw.VEN_CODI, 10)
    raw.VEN_COMI = parseFloat(raw.VEN_COMI) || 0
    raw.VEN_ACTI = raw.VEN_ACTI === 'T' || raw.VEN_ACTI === 't' || raw.VEN_ACTI === '1'
    raw.VEN_LAT = parseFloat(raw.VEN_LAT) || 0
    raw.VEN_LON = parseFloat(raw.VEN_LON) || 0
    records.push(raw)
    dataOffset += recordLen
  }

  return records
}

async function getRolVendedor() {
  let rol = await prisma.rol.findUnique({ where: { nombre: 'vendedor' } })
  if (!rol) {
    console.log('[DB] Creando rol "vendedor"...')
    rol = await prisma.rol.create({
      data: { nombre: 'vendedor', descripcion: 'Vendedor de mostrador/calle' }
    })
  }
  return rol
}

async function main() {
  console.log('=== MIGRACIÓN GR2_600 → USUARIO (VENDEDORES) ===')
  console.log(`DRY RUN: ${DRY_RUN ? 'SÍ' : 'NO'}`)
  console.log(`Contraseña temporal: "${DEFAULT_PASSWORD}"`)
  console.log()

  const vendedores = leerDBF(DBF_PATH)
  console.log(`Registros leídos: ${vendedores.length}`)

  const rol = await getRolVendedor()
  console.log(`Rol vendedor ID: ${rol.id}`)
  console.log()

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  let creados = 0
  let existentes = 0
  let errores = 0

  for (const v of vendedores) {
    const username = `v${v.VEN_CODI}`
    const nombre = v.VEN_NOMB.replace(/\s+/g, ' ').trim()

    if (DRY_RUN) {
      console.log(`  [DRY] ${username} → ${nombre} (com: ${v.VEN_COMI}%, activo: ${v.VEN_ACTI ? 'SÍ' : 'NO'})`)
      continue
    }

    try {
      const existing = await prisma.usuario.findUnique({ where: { usuario: username } })
      if (existing) {
        console.log(`  [SKIP] ${username} — ${nombre} ya existe (ID: ${existing.id})`)
        existentes++
        continue
      }

      const user = await prisma.usuario.create({
        data: {
          nombre,
          usuario: username,
          password: hashedPassword,
          activo: v.VEN_ACTI,
          lat: v.VEN_LAT > 0 ? v.VEN_LAT : null,
          lng: v.VEN_LON > 0 ? v.VEN_LON : null,
          nivelAcceso: 2,
          rolId: rol.id,
        }
      })
      console.log(`  [OK] ${username} → ${nombre} creado (ID: ${user.id})`)
      creados++
    } catch (err) {
      console.error(`  [ERR] ${username} — ${nombre}: ${err.message}`)
      errores++
    }
  }

  console.log()
  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETADO ===')
    console.log(`Se crearían ${vendedores.length} usuarios vendedores`)
    console.log('Ejecutá con --live para migrar realmente')
  } else {
    console.log('=== MIGRACIÓN COMPLETADA ===')
    console.log(`Creados: ${creados}`)
    console.log(`Ya existían: ${existentes}`)
    console.log(`Errores: ${errores}`)
  }
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
