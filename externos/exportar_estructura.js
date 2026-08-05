const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')
const { Pool } = require('pg')

const SCRIPT_DIR = __dirname
const DEFAULT_DB = path.join(SCRIPT_DIR, '..', 'prisma', 'db', 'custom.db')
const ENV_FILE = path.join(SCRIPT_DIR, '..', '.env')
const OUT_PG = path.join(SCRIPT_DIR, 'basededatos.html')
const OUT_SQLITE = path.join(SCRIPT_DIR, 'basededatos_local.html')

const args = process.argv.slice(2)
let dbPath = null
for (const a of args) {
  if (a.startsWith('--db=')) dbPath = a.slice(5)
  else if (!a.startsWith('--')) dbPath = a
}

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

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

function leerSQLite(ruta) {
  const db = new DatabaseSync(ruta, { readOnly: true })
  const tablesRaw = db.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all()

  const tablas = tablesRaw.map((t) => {
    const columns = db.prepare('SELECT * FROM pragma_table_info(?)').all(t.name)
    const fks = db.prepare('SELECT * FROM pragma_foreign_key_list(?)').all(t.name)
    const indexes = db.prepare('SELECT * FROM pragma_index_list(?)').all(t.name)
      .filter((i) => !i.name.startsWith('sqlite_autoindex'))
      .map((i) => {
        const cols = db.prepare('SELECT * FROM pragma_index_info(?)').all(i.name)
        return { name: i.name, unique: !!i.unique, columns: cols.map((c) => c.name) }
      })
    const rowCount = Number(db.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get().c)
    return {
      name: t.name,
      columns: columns.map((c) => ({ name: c.name, type: c.type || '', notnull: !!c.notnull, pk: c.pk, dflt: c.dflt_value })),
      fks: fks.map((f) => ({ from: f.from, table: f.table, to: f.to, on_delete: f.on_delete })),
      indexes,
      rowCount,
    }
  })

  db.close()
  return tablas
}

function tipoPg(c) {
  const len = c.character_maximum_length
  const p = c.numeric_precision
  const s = c.numeric_scale
  const dp = c.datetime_precision
  const base = {
    int2: 'smallint', int4: 'integer', int8: 'bigint',
    float4: 'real', float8: 'double precision',
    bool: 'boolean', text: 'text', bytea: 'bytea',
    json: 'json', jsonb: 'jsonb', uuid: 'uuid', date: 'date',
    time: 'time', timetz: 'time with time zone', interval: 'interval',
    citext: 'citext',
  }
  const map = (t) => {
    switch (t) {
      case 'numeric': return p != null && !(p === 65 && s === 30) ? `numeric(${p},${s ?? 0})` : 'numeric'
      case 'varchar': return `varchar${len ? `(${len})` : ''}`
      case 'bpchar': return `char${len ? `(${len})` : ''}`
      case 'timestamp': return `timestamp${dp ? `(${dp})` : ''}`
      case 'timestamptz': return `timestamp${dp ? `(${dp})` : ''} with time zone`
      default: return base[t] || t
    }
  }
  const udt = c.udt_name
  if (udt.startsWith('_')) return map(udt.slice(1)) + '[]'
  return map(udt)
}

function parseIndexDef(def) {
  const unique = /CREATE UNIQUE INDEX/i.test(def)
  const m = def.match(/\(([^)]*)\)\s*$/)
  const columns = m ? m[1].split(',').map((x) => x.trim()) : []
  return { unique, columns }
}

async function leerPostgres(connStr) {
  const pool = new Pool({ connectionString: connStr, connectionTimeoutMillis: 20000, max: 2, ssl: { rejectUnauthorized: false } })
  try {
    const [tabs, cols, pks, fks, idxs] = await Promise.all([
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
        `SELECT tc.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         WHERE tc.table_schema = current_schema() AND tc.constraint_type = 'PRIMARY KEY'`,
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
         WHERE tc.table_schema = current_schema() AND tc.constraint_type = 'FOREIGN KEY'`,
      ),
      pool.query(
        'SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() ORDER BY tablename, indexname',
      ),
    ])

    const pkSet = new Set(pks.rows.map((r) => `${r.table_name}.${r.column_name}`))
    const colsByTable = new Map()
    for (const c of cols.rows) {
      if (!colsByTable.has(c.table_name)) colsByTable.set(c.table_name, [])
      colsByTable.get(c.table_name).push(c)
    }
    const fksByTable = new Map()
    for (const f of fks.rows) {
      if (!fksByTable.has(f.table_name)) fksByTable.set(f.table_name, [])
      fksByTable.get(f.table_name).push(f)
    }
    const idxByTable = new Map()
    for (const i of idxs.rows) {
      if (!idxByTable.has(i.tablename)) idxByTable.set(i.tablename, [])
      const parsed = parseIndexDef(i.indexdef)
      idxByTable.get(i.tablename).push({ name: i.indexname, unique: parsed.unique, columns: parsed.columns })
    }

    const tablas = []
    for (const t of tabs.rows) {
      const rowCount = Number((await pool.query(`SELECT COUNT(*) AS c FROM "${t.table_name}"`)).rows[0].c)
      tablas.push({
        name: t.table_name,
        columns: (colsByTable.get(t.table_name) || []).map((c) => ({
          name: c.column_name,
          type: tipoPg(c),
          notnull: c.is_nullable === 'NO',
          pk: pkSet.has(`${t.table_name}.${c.column_name}`) ? 1 : 0,
          dflt: c.column_default,
        })),
        fks: (fksByTable.get(t.table_name) || []).map((f) => ({
          from: f.column_name, table: f.ref_table, to: f.ref_column, on_delete: f.delete_rule,
        })),
        indexes: idxByTable.get(t.table_name) || [],
        rowCount,
      })
    }
    return tablas
  } finally {
    await pool.end()
  }
}

function badge(text, cls) {
  return `<span class="badge ${cls}">${esc(text)}</span>`
}

function fkText(fk) {
  const to = `${esc(fk.table)}.${esc(fk.to ?? '')}`
  const action = fk.on_delete && !['NO ACTION', 'NO_ACTION'].includes(fk.on_delete) ? ` · ${esc(fk.on_delete)}` : ''
  return `→ ${to}${action}`
}

function generarHTML(tablas, origen, outFile) {
  const totalCols = tablas.reduce((n, t) => n + t.columns.length, 0)
  const totalFks = tablas.reduce((n, t) => n + t.fks.length, 0)
  const totalIdx = tablas.reduce((n, t) => n + t.indexes.length, 0)

  const cards = tablas.map((t) => {
    const colRows = t.columns.map((c, i) => {
      const fk = t.fks.find((f) => f.from === c.name)
      return `<tr data-search="${esc(t.name)} ${esc(c.name)}">
      <td class="num">${i + 1}</td>
      <td class="mono">${esc(c.name)}</td>
      <td class="mono type">${esc(c.type)}</td>
      <td class="ctr">${c.pk > 0 ? badge('PK', 'pk') : ''}</td>
      <td class="ctr">${c.notnull ? badge('SÍ', 'nn') : ''}</td>
      <td class="mono">${esc(c.dflt)}</td>
      <td class="mono">${fk ? fkText(fk) : ''}</td>
    </tr>`
    }).join('')

    const idxRows = t.indexes.map((i) => `<tr data-search="${esc(t.name)} ${esc(i.name)}">
    <td class="mono">${esc(i.name)}</td>
    <td class="ctr">${i.unique ? badge('ÚNICO', 'uniq') : ''}</td>
    <td class="mono">${esc(i.columns.join(', '))}</td>
  </tr>`).join('')

    return `<section class="card" id="tabla-${esc(t.name)}" data-search="${esc(t.name)}">
    <h2>${esc(t.name)} <span class="rows">${t.rowCount.toLocaleString('es-AR')} fila${t.rowCount === 1 ? '' : 's'}</span></h2>
    <div class="tblwrap">
      <table>
        <thead><tr><th>#</th><th>Campo</th><th>Tipo</th><th>PK</th><th>NOT NULL</th><th>Default</th><th>FK</th></tr></thead>
        <tbody>${colRows || '<tr><td colspan="7" class="empty">Sin columnas</td></tr>'}</tbody>
      </table>
    </div>
    ${t.indexes.length ? `<div class="tblwrap"><table><thead><tr><th>Índice</th><th>Único</th><th>Columnas</th></tr></thead><tbody>${idxRows}</tbody></table></div>` : ''}
  </section>`
  }).join('')

  const toc = tablas.map((t, i) =>
    `<a href="#tabla-${esc(t.name)}" data-search="${esc(t.name)}"><span class="toc-num">${i + 1}</span>${esc(t.name)}</a>`,
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Estructura de la base de datos</title>
<style>
  :root { --bg:#0f172a; --panel:#1e293b; --line:#334155; --text:#e2e8f0; --muted:#94a3b8; --accent:#f59e0b; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial,sans-serif; }
  header { padding:28px 20px 16px; max-width:1100px; margin:0 auto; }
  h1 { margin:0 0 4px; font-size:24px; }
  .sub { color:var(--muted); font-size:13px; }
  .summary { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
  .chip { background:var(--panel); border:1px solid var(--line); border-radius:999px; padding:4px 12px; font-size:12px; color:var(--muted); }
  .chip b { color:var(--accent); }
  #buscar { margin-top:14px; width:100%; max-width:420px; padding:10px 14px; border-radius:10px; border:1px solid var(--line); background:var(--panel); color:var(--text); font-size:14px; outline:none; }
  #buscar:focus { border-color:var(--accent); }
  .toc { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:6px; padding:0 20px; max-width:1100px; margin:0 auto 18px; }
  .toc a { display:flex; align-items:center; gap:8px; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:6px 10px; color:var(--text); text-decoration:none; font-size:12px; font-family:ui-monospace,Consolas,monospace; transition:border-color .15s; }
  .toc a:hover { border-color:var(--accent); }
  .toc-num { color:var(--muted); font-size:11px; }
  main { max-width:1100px; margin:0 auto; padding:0 20px 60px; display:flex; flex-direction:column; gap:18px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; }
  .card h2 { margin:0 0 10px; font-size:17px; font-family:ui-monospace,Consolas,monospace; }
  .rows { font-size:12px; color:var(--muted); font-weight:400; }
  .badge { display:inline-block; border-radius:6px; padding:1px 7px; font-size:10px; font-weight:700; }
  .pk { background:#b45309; color:#fff; }
  .nn { background:#334155; color:#cbd5e1; }
  .uniq { background:#065f46; color:#6ee7b7; }
  .tblwrap { overflow-x:auto; margin-top:8px; }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th { text-align:left; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--line); padding:6px 10px; }
  td { padding:6px 10px; border-bottom:1px solid #243246; vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  td.num { color:var(--muted); font-size:11px; }
  td.ctr { text-align:center; }
  td.empty { color:var(--muted); text-align:center; padding:14px; }
  .mono { font-family:ui-monospace,Consolas,monospace; font-size:12.5px; }
  .type { color:#7dd3fc; }
  .oculto { display:none !important; }
</style>
</head>
<body>
<header>
  <h1>Estructura de la base de datos</h1>
  <p class="sub">Fuente: <span class="mono">${esc(origen)}</span> · Generado: ${new Date().toLocaleString('es-AR')}</p>
  <div class="summary">
    <span class="chip"><b>${tablas.length}</b> tablas</span>
    <span class="chip"><b>${totalCols}</b> campos</span>
    <span class="chip"><b>${totalIdx}</b> índices</span>
    <span class="chip"><b>${totalFks}</b> claves foráneas</span>
  </div>
  <input id="buscar" type="search" placeholder="Buscar tabla o campo... (ej: usuario, id)">
</header>
<nav class="toc" id="toc">${toc}</nav>
<main>${cards}</main>
<script>
  const input = document.getElementById('buscar');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('.card').forEach(c => {
      c.classList.toggle('oculto', !q || (c.dataset.search || '').toLowerCase().includes(q));
    });
    document.querySelectorAll('.toc a').forEach(a => {
      a.classList.toggle('oculto', !q || (a.dataset.search || '').toLowerCase().includes(q));
    });
  });
</script>
</body>
</html>
`

  fs.writeFileSync(outFile, html, 'utf8')
  return { tablas: tablas.length, cols: totalCols, idx: totalIdx, fks: totalFks }
}

async function main() {
  if (dbPath) {
    if (!fs.existsSync(dbPath)) {
      console.error(`No se encuentra el archivo de datos: ${dbPath}`)
      process.exit(1)
    }
    const tablas = leerSQLite(dbPath)
    const r = generarHTML(tablas, dbPath, OUT_SQLITE)
    console.log(`Modo SQLite (local)`)
    console.log(`Origen           : ${dbPath}`)
    console.log(`HTML generado    : ${OUT_SQLITE}`)
    console.log(`Tablas: ${r.tablas} · Campos: ${r.cols} · Índices: ${r.idx} · FKs: ${r.fks}`)
    return
  }

  const env = leerEnv(ENV_FILE)
  if (!env.DATABASE_URL) {
    console.error('No se encontró DATABASE_URL en ../.env')
    process.exit(1)
  }
  const tablas = await leerPostgres(env.DATABASE_URL)
  const r = generarHTML(tablas, 'PostgreSQL (Render)', OUT_PG)
  console.log(`Modo PostgreSQL (Render)`)
  console.log(`HTML generado    : ${OUT_PG}`)
  console.log(`Tablas: ${r.tablas} · Campos: ${r.cols} · Índices: ${r.idx} · FKs: ${r.fks}`)
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
