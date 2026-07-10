import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const db = new PrismaClient()

async function main() {
  console.log('Limpiando tabla Proveedores...')
  await db.proveedor.deleteMany()
  console.log('Proveedores eliminados.')

  const csvPath = path.join(__dirname, '..', 'csv', 'data_05012015_GR2_200.csv')
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
    const nombre = (r.PR_NOM || '').trim()
    if (!nombre) continue
    batch.push({
      nombre,
      codigoLegacy: r.PR_NUM ? parseInt(r.PR_NUM, 10) : null,
      nombreFantasia: (r.PR_FANT || '').trim() || null,
      direccion: (r.PR_DIR || '').trim() || null,
      localidad: (r.PR_LOC || '').trim() || null,
      provincia: (r.PR_PRO || '').trim() || null,
      codigoPostal: (r.PR_CP || '').trim() || null,
      pais: (r.PR_PAI || '').trim() || 'Argentina',
      telefono1: (r.PR_TE1 || '').trim() || null,
      telefono2: (r.PR_TE2 || '').trim() || null,
      telefono3: (r.PR_TE3 || '').trim() || null,
      telefono4: (r.PR_TE4 || '').trim() || null,
      telefono5: (r.PR_TE5 || '').trim() || null,
      email: (r.PR_MAI || '').trim() || null,
      tipoDocumento: r.PR_TDO ? parseInt(r.PR_TDO, 10) : null,
      tipoIva: r.PR_TIV ? parseInt(r.PR_TIV, 10) : null,
      numeroDocumento: (r.PR_DOC || '').trim() || null,
      habilitadoCheques: r.PR_HCR ? parseInt(r.PR_HCR, 10) : null,
      limiteCheques: r.PR_LCR ? parseInt(r.PR_LCR, 10) : null,
      credito: r.PR_CRE ? parseFloat(r.PR_CRE) : null,
      vendedor: (r.PR_VEN || '').trim() || null,
      diaVisita: r.PR_DIA ? parseInt(r.PR_DIA, 10) : null,
      descuentoVto: r.PR_DVE ? parseFloat(r.PR_DVE) : null,
      observacion1: (r.PR_OB1 || '').trim() || null,
      observacion2: (r.PR_OB2 || '').trim() || null,
      observacion3: (r.PR_OB3 || '').trim() || null,
      fechaAlta: (r.PR_ALT || '').trim() || null,
      contacto: (r.PR_CON || '').trim() || null,
      ultimaVisita: (r.PR_UVE || '').trim() || null,
      saldo: r.PR_SDO ? parseFloat(r.PR_SDO) : null,
      descuentoRemito: r.PR_DCR ? parseInt(r.PR_DCR, 10) : null,
      web: (r.PR_WEB || '').trim() || null,
      listaPrecios: r.PR_LISTA ? parseInt(r.PR_LISTA, 10) : null,
      condCompra: (r.COM_COMP || '').trim() || null,
      tipo: r.PR_TIPO ? parseInt(r.PR_TIPO, 10) : null,
      tipoNombre: (r.PR_TIPN || '').trim() || null,
      numeroIB: (r.PR_NIB || '').trim() || null,
      activo: true,
    })
  }

  for (let i = 0; i < batch.length; i += 500) {
    const chunk = batch.slice(i, i + 500)
    await db.proveedor.createMany({ data: chunk, skipDuplicates: true })
    console.log(`Insertados ${Math.min(i + 500, batch.length)} / ${batch.length} proveedores`)
  }

  console.log(`Carga completada: ${batch.length} proveedores`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
