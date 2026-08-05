const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

const SCRIPT_DIR = __dirname
const DEFAULT_DB = path.join(SCRIPT_DIR, '..', 'prisma', 'db', 'custom.db')
const OUT_FILE = path.join(SCRIPT_DIR, 'basededatos.html')

const dbPath = process.argv[2] || DEFAULT_DB

if (!fs.existsSync(dbPath)) {
  console.error(`No se encuentra el archivo de datos: ${dbPath}`)
  console.error('Uso: node externos/exportar_estructura.js [ruta/al/custom.db]')
  process.exit(1)
}

const db = new DatabaseSync(dbPath, { readOnly: true })

const tablesRaw = db.prepare(
  "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
).all()

const tables = tablesRaw.map((t) => {
  const columns = db.prepare('SELECT * FROM pragma_table_info(?)').all(t.name)
  const fks = db.prepare('SELECT * FROM pragma_foreign_key_list(?)').all(t.name)
  const indexes = db.prepare('SELECT * FROM pragma_index_list(?)').all(t.name)
    .filter((i) => !i.name.startsWith('sqlite_autoindex'))
    .map((i) => {
      const cols = db.prepare('SELECT * FROM pragma_index_info(?)').all(i.name)
      return {
        name: i.name,
        unique: !!i.unique,
        origin: i.origin,
        columns: cols.map((c) => c.name),
      }
    })
  const rowCount = Number(db.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get().c)
  return { name: t.name, columns, fks, indexes, rowCount }
})

db.close()

const totalCols = tables.reduce((n, t) => n + t.columns.length, 0)
const totalFks = tables.reduce((n, t) => n + t.fks.length, 0)
const totalIdx = tables.reduce((n, t) => n + t.indexes.length, 0)

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function badge(text, cls) {
  return `<span class="badge ${cls}">${esc(text)}</span>`
}

function fkText(fk) {
  const from = esc(fk.from)
  const to = `${esc(fk.table)}.${esc(fk.to ?? '')}`
  const action = fk.on_delete && fk.on_delete !== 'NO ACTION' ? ` · ${esc(fk.on_delete)}` : ''
  return `→ ${to}${action}`
}

const cards = tables.map((t) => {
  const colRows = t.columns.map((c, i) => {
    const fk = t.fks.find((f) => f.from === c.name)
    return `<tr data-search="${esc(t.name)} ${esc(c.name)}">
      <td class="num">${i + 1}</td>
      <td class="mono">${esc(c.name)}</td>
      <td class="mono type">${esc(c.type)}</td>
      <td class="ctr">${c.pk > 0 ? badge('PK', 'pk') : ''}</td>
      <td class="ctr">${c.notnull ? badge('SÍ', 'nn') : ''}</td>
      <td class="mono">${esc(c.dflt_value)}</td>
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

const toc = tables.map((t, i) =>
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
  <p class="sub">Archivo: <span class="mono">${esc(dbPath)}</span> · Generado: ${new Date().toLocaleString('es-AR')}</p>
  <div class="summary">
    <span class="chip"><b>${tables.length}</b> tablas</span>
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
      const visible = !q || (c.dataset.search || '').toLowerCase().includes(q);
      c.classList.toggle('oculto', !visible);
    });
    document.querySelectorAll('.toc a').forEach(a => {
      const visible = !q || (a.dataset.search || '').toLowerCase().includes(q);
      a.classList.toggle('oculto', !visible);
    });
    document.querySelectorAll('#toc .oculto').forEach(() => {});
  });
</script>
</body>
</html>
`

fs.writeFileSync(OUT_FILE, html, 'utf8')

console.log(`Archivo de datos : ${dbPath}`)
console.log(`HTML generado    : ${OUT_FILE}`)
console.log(`Tablas: ${tables.length} · Campos: ${totalCols} · Índices: ${totalIdx} · FKs: ${totalFks}`)
