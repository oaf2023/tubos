import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const db = new PrismaClient()

async function main() {
  console.log('Limpiando tabla Clientes...')
  await db.clienteAcceso.deleteMany()
  await db.rutaParada.deleteMany()
  await db.cylinder.updateMany({ data: { clienteId: null } })
  await db.cliente.deleteMany()
  console.log('Clientes eliminados.')

  const csvPath = path.join(__dirname, '..', 'csv', 'data_05012015_GR2_100.csv')
  const content = fs.readFileSync(csvPath, 'latin1')

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    delimiter: ',',
    quote: '"',
    escape: '"',
    relaxQuotes: true,
  })

  console.log(`Procesando ${records.length} registros...`)

  const batch: any[] = []
  for (const r of records) {
    const nombre = (r.CL_NOM || '').trim()
    if (!nombre) continue
    batch.push({
      nombre,
      codigoLegacy: r.CL_NUM ? parseInt(r.CL_NUM, 10) : null,
      calle: (r.CL_DIR || '').trim() || null,
      ciudad: (r.CL_LOC || '').trim() || null,
      provincia: (r.CL_PRO || '').trim() || null,
      codigoPostal: (r.CL_CP || '').trim() || null,
      pais: (r.CL_PAI || '').trim() || 'Argentina',
      telefono: (r.CL_TE1 || '').trim() || null,
      telefonoSecundario: (r.CL_TE2 || '').trim() || null,
      email: (r.CL_MAI || '').trim() || null,
      tipoDocumento: r.CL_TDO ? String(r.CL_TDO) : null,
      condicionIva: r.CL_TIV ? String(r.CL_TIV) : null,
      numeroDocumento: (r.CL_DOC || '').trim() || null,
      contacto: (r.CL_CON || '').trim() || null,
      rubro: (r.CL_TIPN || '').trim() || null,
      notas: [r.CL_OB1, r.CL_OB2, r.CL_OB3].filter(Boolean).join(' | ').trim() || null,
      activo: true,
    })
  }

  // Insertar en batches de 500
  for (let i = 0; i < batch.length; i += 500) {
    const chunk = batch.slice(i, i + 500)
    await db.cliente.createMany({ data: chunk, skipDuplicates: true })
    console.log(`Insertados ${Math.min(i + 500, batch.length)} / ${batch.length} clientes`)
  }

  console.log(`Carga completada: ${batch.length} clientes`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
