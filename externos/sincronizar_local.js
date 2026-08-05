const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')
const { Pool } = require('pg')

const SCRIPT_DIR = __dirname
const ENV_FILE = path.join(SCRIPT_DIR, '..', '.env')
const DB_FILE = path.join(SCRIPT_DIR, '..', 'prisma', 'db', 'custom.db')

function leerEnv(ruta) {
  const out = {}
  try {
    const txt = fs.readFileSync(ruta, 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!m || m[1].startsWith('#')) continue
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      out[m[1]] = v
    }
  } catch { /* sin .env */ }
  return out
}

function q(v) {
  return `"${String(v).replaceAll('"', '""')}"`
}

function qstr(v) {
  return `'${String(v).replaceAll("'", "''")}'`
}

async function leerEsquema(pool) {
  const [tabs, cols, pks, fks, idxs, enums] = await Promise.all([
    pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name",
    ),
    pool.query(
      `SELECT table_name, column_name, is_nullable, column_default, udt_name, data_type,
              character_maximum_length, numeric_precision, numeric_scale, datetime_precision
       FROM information_schema.columns
       WHERE table_schema = current_schema()
       ORDER BY table_name, ordinal_position`,
    ),
    pool.query(
      `SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = current_schema() AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY tc.table_name, kcu.ordinal_position`,
    ),
    pool.query(
      `SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column, rc.delete_rule
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
       JOIN information_schema.referential_constraints rc
         ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
       WHERE tc.table_schema = current_schema() AND tc.constraint_type = 'FOREIGN KEY'
       ORDER BY tc.table_name, kcu.ordinal_position`,
    ),
    pool.query(
      'SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() ORDER BY tablename, indexname',
    ),
    pool.query(
      `SELECT t.typname AS enum_name, e.enumlabel AS label
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
       ORDER BY t.typname, e.enumsortorder`,
    ),
  ])

  const enumMap = new Map()
  for (const e of enums.rows) {
    if (!enumMap.has(e.enum_name)) enumMap.set(e.enum_name, [])
    enumMap.get(e.enum_name).push(e.label)
  }

  const colsByTable = new Map()
  for (const c of cols.rows) {
    if (!colsByTable.has(c.table_name)) colsByTable.set(c.table_name, [])
    colsByTable.get(c.table_name).push(c)
  }

  const pkByTable = new Map()
  for (const p of pks.rows) {
    if (!pkByTable.has(p.table_name)) pkByTable.set(p.table_name, [])
    pkByTable.get(p.table_name).push({ col: p.column_name, pos: p.ordinal_position })
  }
  for (const [k, v] of pkByTable) v.sort((a, b) => a.pos - b.pos)

  const fkByTable = new Map()
  for (const f of fks.rows) {
    if (!fkByTable.has(f.table_name)) fkByTable.set(f.table_name, [])
    fkByTable.get(f.table_name).push(f)
  }

  const idxByTable = new Map()
  for (const i of idxs.rows) {
    if (i.indexname.endsWith('_pkey')) continue
    if (!idxByTable.has(i.tablename)) idxByTable.set(i.tablename, [])
    const unique = /CREATE UNIQUE INDEX/i.test(i.indexdef)
    const m = i.indexdef.match(/\(([^)]*)\)\s*$/)
    const columns = m ? m[1].split(',').map((x) => x.trim().replace(/^"|"$/g, '')) : []
    idxByTable.get(i.tablename).push({ name: i.indexname, unique, columns })
  }

  return {
    tables: tabs.rows.map((t) => t.table_name),
    colsByTable,
    pkByTable,
    fkByTable,
    idxByTable,
    enumMap,
  }
}

function tipoSQLite(c, enumMap) {
  if (enumMap.has(c.udt_name)) return 'TEXT'
  switch (c.udt_name) {
    case 'int2':
    case 'int4':
    case 'int8': return 'INTEGER'
    case 'bool': return 'BOOLEAN'
    case 'float4': return 'REAL'
    case 'float8': return 'DOUBLE PRECISION'
    case 'numeric':
      if (c.numeric_precision != null && !(c.numeric_precision === 65 && c.numeric_scale === 30)) {
        return `NUMERIC(${c.numeric_precision},${c.numeric_scale ?? 0})`
      }
      return 'NUMERIC'
    default: return 'TEXT'
  }
}

function convValor(c, v) {
  if (v === null || v === undefined) return null
  switch (c.data_type) {
    case 'boolean': return v ? 1 : 0
    case 'date': {
      const d = v instanceof Date ? v : new Date(v)
      return Number.isNaN(d.getTime()) ? String(v) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    case 'timestamp with time zone':
    case 'timestamp without time zone':
      return v instanceof Date ? v.toISOString() : String(v)
    case 'json':
    case 'jsonb':
      return typeof v === 'string' ? v : JSON.stringify(v)
    default:
      return v instanceof Date ? v.toISOString() : v
  }
}

async function main() {
  const env = leerEnv(ENV_FILE)
  if (!env.DATABASE_URL) {
    console.error('No se encontró DATABASE_URL en ../.env')
    process.exit(1)
  }

  const t0 = Date.now()

  if (fs.existsSync(DB_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const bak = `${DB_FILE}.bak-${stamp}`
    fs.copyFileSync(DB_FILE, bak)
    console.log(`Backup creado: ${bak}`)
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 30000, max: 2, ssl: { rejectUnauthorized: false } })
  let esquema
  try {
    esquema = await leerEsquema(pool)
  } catch (e) {
    console.error('Error al leer esquema de Render:', e.message)
    await pool.end()
    process.exit(1)
  }
  console.log(`Esquema leído: ${esquema.tables.length} tablas de Render`)

  const renderCounts = new Map()
  for (const t of esquema.tables) {
    const c = Number((await pool.query(`SELECT COUNT(*) c FROM ${q(t)}`)).rows[0].c)
    renderCounts.set(t, c)
  }
  console.log('Conteos de Render listos')

  fs.rmSync(DB_FILE, { force: true })
  const db = new DatabaseSync(DB_FILE)
  db.exec('PRAGMA foreign_keys=OFF')
  db.exec('PRAGMA journal_mode=OFF')
  db.exec('PRAGMA synchronous=OFF')
  db.exec('PRAGMA temp_store=MEMORY')

  const tablas = []
  for (const t of esquema.tables) {
    const cols = esquema.colsByTable.get(t) || []
    const pks = esquema.pkByTable.get(t) || []
    const fks = esquema.fkByTable.get(t) || []
    const pkCols = pks.map((p) => p.col)
    const colsSql = cols.map((c) => {
      let sql = `${q(c.column_name)} ${tipoSQLite(c, esquema.enumMap)}`
      if (c.is_nullable === 'NO' && !pkCols.includes(c.column_name)) sql += ' NOT NULL'
      if (esquema.enumMap.has(c.udt_name)) {
        const vals = esquema.enumMap.get(c.udt_name).map((v) => qstr(v)).join(', ')
        sql += ` CHECK (${q(c.column_name)} IN (${vals}))`
      }
      return sql
    })
    const seenFk = new Set()
    const fkSql = fks.filter((f) => !seenFk.has(f.column_name) && seenFk.add(f.column_name)).map((f) => {
      let sql = ` FOREIGN KEY (${q(f.column_name)}) REFERENCES ${q(f.ref_table)} (${q(f.ref_column)})`
      if (f.delete_rule && f.delete_rule !== 'NO ACTION') sql += ` ON DELETE ${f.delete_rule}`
      return sql
    })
    if (pkCols.length) colsSql.push(`PRIMARY KEY (${pkCols.map((c) => q(c)).join(', ')})`)
    const ddl = `CREATE TABLE ${q(t)} (${[...colsSql, ...fkSql].join(', ')})`
    try {
      db.exec(ddl)
    } catch (e) {
      console.error(`Error creando tabla ${t}: ${e.message}`)
      console.error(ddl)
      throw e
    }
    tablas.push({ name: t, cols, fks, fkCols: new Set(fks.map((f) => f.column_name)) })
  }
  console.log(`Tablas creadas: ${tablas.length}`)

  let totalInsert = 0
  for (const t of tablas) {
    const n = renderCounts.get(t.name)
    if (n === 0) {
      console.log(`${t.name.padEnd(34)} 0 filas (omitido)`)
      continue
    }
    const colNames = t.cols.map((c) => c.column_name)
    const sel = colNames.map((c) => q(c)).join(', ')
    const res = await pool.query(`SELECT ${sel} FROM ${q(t.name)}`)
    const rows = res.rows
    const placeholders = colNames.map(() => '?').join(', ')
    const insert = `INSERT INTO ${q(t.name)} (${sel}) VALUES (${placeholders})`
    const stmt = db.prepare(insert)
    const conv = t.cols.map((c) => (v) => convValor(c, v))
    const inicio = Date.now()
    const lote = 500
    db.exec('BEGIN')
    try {
      for (let i = 0; i < rows.length; i += lote) {
        const fin = Math.min(i + lote, rows.length)
        for (let j = i; j < fin; j++) {
          const r = rows[j]
          stmt.run(...colNames.map((cn, k) => conv[k](r[cn])))
        }
        db.exec('COMMIT')
        db.exec('BEGIN')
      }
    } finally {
      db.exec('COMMIT')
    }
    totalInsert += rows.length
    console.log(`${t.name.padEnd(34)} ${String(rows.length).padStart(8)} filas en ${((Date.now() - inicio) / 1000).toFixed(1)}s`)
  }

  let nIdx = 0
  for (const t of tablas) {
    for (const i of esquema.idxByTable.get(t.name) || []) {
      const cols = i.columns.map((c) => q(c)).join(', ')
      db.exec(`CREATE ${i.unique ? 'UNIQUE ' : ''}INDEX ${q(i.name)} ON ${q(t.name)} (${cols})`)
      nIdx += 1
    }
  }
  console.log(`Índices creados: ${nIdx}`)

  const localCounts = new Map()
  for (const t of tablas) {
    localCounts.set(t.name, Number(db.prepare(`SELECT COUNT(*) c FROM ${q(t.name)}`).get().c))
  }

  const diffs = []
  for (const t of tablas) {
    if (localCounts.get(t.name) !== renderCounts.get(t.name)) {
      diffs.push(`${t.name}: render=${renderCounts.get(t.name)} local=${localCounts.get(t.name)}`)
    }
  }
  if (diffs.length) console.log(`DIFERENCIAS DE CONTEO:\n  ${diffs.join('\n  ')}`)
  else console.log('Conteos: coinciden en las ' + tablas.length + ' tablas')

  const fkViolations = db.prepare('PRAGMA foreign_key_check').all()
  if (fkViolations.length) {
    console.log(`VIOLACIONES DE FK (${fkViolations.length}):`)
    const seen = new Set()
    for (const v of fkViolations.slice(0, 20)) {
      const k = `${v.table}.${v.parent}`
      if (!seen.has(k)) { seen.add(k); console.log(`  ${v.table} -> ${v.parent}`) }
    }
  } else {
    console.log('foreign_key_check: sin violaciones')
  }

  const integrity = db.prepare('PRAGMA integrity_check').all()
  console.log(`integrity_check: ${integrity.length === 1 && integrity[0].integrity_check === 'ok' ? 'ok' : JSON.stringify(integrity)}`)

  db.exec('VACUUM')
  db.close()
  await pool.end()

  const size = fs.statSync(DB_FILE).size
  console.log('')
  console.log(`Archivo local  : ${DB_FILE}`)
  console.log(`Filas insertadas: ${totalInsert.toLocaleString('es-AR')}`)
  console.log(`Tamaño final   : ${(size / 1048576).toFixed(1)} MB`)
  console.log(`Tiempo total   : ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
