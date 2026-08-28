#!/usr/bin/env node
/**
 * Genera documentación HTML de la base de datos desde el schema Prisma.
 * Uso: node scripts/generate-db-docs.js
 * Salida: externos/basededatos_local.html y externos/basededatos.html
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const OUTPUT_LOCAL = path.join(__dirname, '..', 'externos', 'basededatos_local.html');
const OUTPUT_SERVER = path.join(__dirname, '..', 'externos', 'basededatos.html');

// ============ PARSER DEL SCHEMA PRISMA ============

function parseSchema(content) {
  const models = [];
  const enums = {};

  // Extraer enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let m;
  while ((m = enumRegex.exec(content)) !== null) {
    enums[m[1]] = m[2].trim().split(/\s+/);
  }

  // Extraer modelos (bloques model ... { ... })
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  while ((m = modelRegex.exec(content)) !== null) {
    const name = m[1];
    const body = m[2];

    // Skip if it has @@map pointing to a different name? No, we use the model name.
    const fields = [];
    const indexes = [];
    const relations = [];
    let mapName = null;

    // Extract @@map if exists
    const mapMatch = body.match(/@@map\("(\w+)"\)/);
    if (mapMatch) mapName = mapMatch[1];

    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

      // Parse field: name type [attributes]
      const fieldMatch = trimmed.match(/^(\w+)\s+(\S+)(.*)$/);
      if (!fieldMatch) continue;

      const fieldName = fieldMatch[1];
      let fieldType = fieldMatch[2];
      const attrs = fieldMatch[3] || '';

      // Skip relation fields (they reference other models without @)
      // Check if it's a model type (starts with uppercase and isn't a Prisma scalar)
      const prismaScalars = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal', 'Bytes'];
      const cleanTypeForCheck = fieldType.replace('?', '').replace('[]', '');
      const isEnum = Object.keys(enums).includes(cleanTypeForCheck);
      const isScalar = prismaScalars.includes(cleanTypeForCheck);
      const isModel = !isScalar && !isEnum && /^[A-Z]/.test(cleanTypeForCheck);

      if (isModel) {
        // This is a relation field - extract the relation info
        const relationMatch = attrs.match(/@relation\(([^)]*)\)/);
        const relFields = relationMatch ? relationMatch[1].match(/fields:\s*\[(\w+)\]/) : null;
        const relRefs = relationMatch ? relationMatch[1].match(/references:\s*\[(\w+)\]/) : null;
        const onDeleteMatch = attrs.match(/onDelete:\s*(\w+)/);

        if (relFields && relRefs) {
          relations.push({
            fieldName: fieldName,
            relatedModel: cleanTypeForCheck,
            localField: relFields[1],
            foreignField: relRefs[1],
            onDelete: onDeleteMatch ? onDeleteMatch[1] : null
          });
        }
        continue; // Don't add relation fields to the field list
      }

      // Determine column type
      const dbMatch = attrs.match(/@db\.(\w+(?:\([^)]+\))?)/);
      let dbType = dbMatch ? dbMatch[1] : null;

      // Parse type modifiers
      const isOptional = fieldType.endsWith('?');
      const cleanType = fieldType.replace('?', '');

      // Check for @default
      const defaultMatch = attrs.match(/@default\(([^)]+)\)/);
      const defaultVal = defaultMatch ? defaultMatch[1] : null;

      // Check for @unique
      const isUnique = attrs.includes('@unique');

      // Check for @id
      const isId = attrs.includes('@id');

      // Check for list (ends with [])
      const isList = fieldType.endsWith('[]');

      if (isList) continue; // Skip list fields (they're reverse relations)

      fields.push({
        name: fieldName,
        type: cleanType,
        dbType: dbType,
        isOptional: isOptional,
        isId: isId || fieldName === 'id',
        isUnique: isUnique,
        defaultVal: defaultVal,
        isEnum: isEnum
      });
    }

    // Parse indexes
    const indexRegex = /@@index\(\[([^\]]+)\](?:,\s*name:\s*"([^"]+)")?\)/g;
    let idxMatch;
    while ((idxMatch = indexRegex.exec(body)) !== null) {
      const cols = idxMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
      const name = idxMatch[2] || null;
      indexes.push({ columns: cols, unique: false, name: name });
    }

    // Parse unique constraints
    const uniqueRegex = /@@unique\(\[([^\]]+)\](?:,\s*name:\s*"([^"]+)")?\)/g;
    while ((idxMatch = uniqueRegex.exec(body)) !== null) {
      const cols = idxMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
      const name = idxMatch[2] || null;
      indexes.push({ columns: cols, unique: true, name: name });
    }

    models.push({
      name: name,
      mapName: mapName,
      fields: fields,
      indexes: indexes,
      relations: relations
    });
  }

  return { models, enums };
}

// ============ MAPEO DE TIPOS ============

function prismaToSQLite(field) {
  if (field.dbType) {
    // Handle @db.Text -> TEXT, @db.Date -> TEXT, etc.
    if (field.dbType.startsWith('Text')) return 'TEXT';
    if (field.dbType === 'Date') return 'TEXT';
    return field.dbType.toUpperCase();
  }
  const map = {
    'String': 'TEXT',
    'Int': 'INTEGER',
    'Float': 'DOUBLE PRECISION',
    'Boolean': 'BOOLEAN',
    'DateTime': 'TEXT',
    'Json': 'TEXT',
    'BigInt': 'INTEGER',
    'Decimal': 'DOUBLE PRECISION',
    'Bytes': 'BLOB'
  };
  return map[field.type] || 'TEXT';
}

function prismaToPostgres(field) {
  if (field.dbType) {
    return field.dbType.toLowerCase();
  }
  const map = {
    'String': 'text',
    'Int': 'integer',
    'Float': 'double precision',
    'Boolean': 'boolean',
    'DateTime': 'timestamp(3)',
    'Json': 'jsonb',
    'BigInt': 'bigint',
    'Decimal': 'decimal(65,30)',
    'Bytes': 'bytea'
  };
  return map[field.type] || 'text';
}

function formatDefaultPG(val) {
  if (!val) return '';
  if (val === 'now()') return 'CURRENT_TIMESTAMP';
  if (val === 'autoincrement()') return '';
  if (val === 'cuid()') return '';
  if (val === 'uuid()') return '';
  if (val === '{}') return "'{}'::jsonb";
  if (val === 'true') return 'true';
  if (val === 'false') return 'false';
  if (val === '""') return "''::text";
  // String literals
  if (val.startsWith('"') || val.startsWith("'")) {
    return val.replace(/"/g, "'") + "::text";
  }
  if (/^\d+$/.test(val)) return val;
  if (/^\d+\.\d+$/.test(val)) return val;
  // Default string value
  return "'" + val.replace(/'/g, "''") + "'::text";
}

function formatDefaultSQLite(val) {
  if (!val) return '';
  if (val === 'now()') return '';
  if (val === 'autoincrement()') return '';
  if (val === 'cuid()') return '';
  if (val === 'uuid()') return '';
  if (val === '{}') return '';
  if (val === 'true') return '1';
  if (val === 'false') return '0';
  if (val === '""') return '';
  if (val.startsWith('"') || val.startsWith("'")) {
    return val.replace(/"/g, "'");
  }
  return val;
}

// ============ GENERACIÓN HTML ============

function generateTableSection(model, toTypeFn, formatDefaultFn, includePkeyIndex) {
  const displayName = model.mapName || model.name;
  const fieldCount = model.fields.length;

  let html = `<section class="card" id="tabla-${displayName}" data-search="${displayName}">
    <h2>${displayName} <span class="rows">${fieldCount} campos</span></h2>
    <div class="tblwrap">
      <table>
        <thead><tr><th>#</th><th>Campo</th><th>Tipo</th><th>PK</th><th>NOT NULL</th><th>Default</th><th>FK</th></tr></thead>
        <tbody>`;

  let fieldNum = 0;
  for (const field of model.fields) {
    fieldNum++;
    const colType = toTypeFn(field);
    const isPK = field.isId ? '<span class="badge pk">PK</span>' : '';
    const nn = (!field.isOptional && !field.isId) ? '<span class="badge nn">SÍ</span>' : (field.isId ? '<span class="badge nn">SÍ</span>' : '');
    const def = formatDefaultFn(field.defaultVal);

    // Find FK reference
    let fk = '';
    const rel = model.relations.find(r => r.localField === field.name);
    if (rel) {
      const relModelName = rel.relatedModel;
      const onDelete = rel.onDelete ? ` · ${rel.onDelete}` : '';
      fk = `→ ${relModelName}.${rel.foreignField}${onDelete}`;
    }

    html += `
      <tr data-search="${displayName} ${field.name}">
      <td class="num">${fieldNum}</td>
      <td class="mono">${field.name}</td>
      <td class="mono type">${colType}</td>
      <td class="ctr">${isPK}</td>
      <td class="ctr">${nn}</td>
      <td class="mono">${def}</td>
      <td class="mono">${fk}</td>
    </tr>`;
  }

  html += `</tbody>
      </table>
    </div>`;

  // Indexes
  const indexesToShow = [...model.indexes];
  if (includePkeyIndex) {
    const idField = model.fields.find(f => f.isId);
    if (idField) {
      indexesToShow.unshift({
        columns: [idField.name],
        unique: true,
        name: `${displayName}_pkey`
      });
    }
  }

  if (indexesToShow.length > 0) {
    html += `\n    <div class="tblwrap"><table><thead><tr><th>Índice</th><th>Único</th><th>Columnas</th></tr></thead><tbody>`;
    for (const idx of indexesToShow) {
      const idxName = idx.name || `${displayName}_${idx.columns.join('_')}_idx${idx.unique ? '' : ''}`;
      const uniqBadge = idx.unique ? '<span class="badge uniq">ÚNICO</span>' : '';
      const cols = idx.columns.map(c => `"${c}"`).join(', ');
      html += `
    <tr data-search="${displayName} ${idxName}">
    <td class="mono">${idxName}</td>
    <td class="ctr">${uniqBadge}</td>
    <td class="mono">${cols}</td>
  </tr>`;
    }
    html += `</tbody></table></div>`;
  }

  html += `\n  </section>`;
  return html;
}

function generateHTML(models, toTypeFn, formatDefaultFn, includePkeyIndex, sourceLabel, timestamp) {
  // Sort models alphabetically
  const sorted = [...models].sort((a, b) => {
    const na = (a.mapName || a.name).toLowerCase();
    const nb = (b.mapName || b.name).toLowerCase();
    return na.localeCompare(nb);
  });

  const totalTables = sorted.length;
  const totalFields = sorted.reduce((sum, m) => sum + m.fields.length, 0);
  const totalIndexes = sorted.reduce((sum, m) => sum + m.indexes.length + (includePkeyIndex ? 1 : 0), 0);
  const totalFKs = sorted.reduce((sum, m) => sum + m.relations.length, 0);

  // Generate TOC
  let toc = '';
  sorted.forEach((model, i) => {
    const displayName = model.mapName || model.name;
    toc += `<a href="#tabla-${displayName}" data-search="${displayName}"><span class="toc-num">${i + 1}</span>${displayName}</a>`;
  });

  // Generate table sections
  let sections = '';
  for (const model of sorted) {
    sections += generateTableSection(model, toTypeFn, formatDefaultFn, includePkeyIndex);
  }

  return `<!DOCTYPE html>
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
  <p class="sub">Fuente: <span class="mono">${sourceLabel}</span> · Generado: ${timestamp}</p>
  <div class="summary">
    <span class="chip"><b>${totalTables}</b> tablas</span>
    <span class="chip"><b>${totalFields}</b> campos</span>
    <span class="chip"><b>${totalIndexes}</b> índices</span>
    <span class="chip"><b>${totalFKs}</b> claves foráneas</span>
  </div>
  <input id="buscar" type="search" placeholder="Buscar tabla o campo... (ej: usuario, id)">
</header>
<nav class="toc" id="toc">${toc}</nav>
<main>${sections}</main>
<script>
const q = document.getElementById('buscar');
q.addEventListener('input', () => {
  const s = q.value.toLowerCase();
  document.querySelectorAll('section.card').forEach(c => {
    const match = !s || c.dataset.search.toLowerCase().includes(s) || c.innerHTML.toLowerCase().includes(s);
    c.classList.toggle('oculto', !match);
  });
  document.querySelectorAll('.toc a').forEach(a => {
    const match = !s || a.dataset.search.toLowerCase().includes(s);
    a.classList.toggle('oculto', !match);
  });
});
</script>
</body>
</html>`;
}

// ============ MAIN ============

function main() {
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const { models } = parseSchema(schemaContent);

  console.log(`Modelos encontrados: ${models.length}`);
  console.log(`Modelos: ${models.map(m => m.mapName || m.name).join(', ')}`);

  const now = new Date();
  const timestamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Local (SQLite)
  const localHTML = generateHTML(models, prismaToSQLite, formatDefaultSQLite, false, '../prisma/db/custom.db', timestamp);
  fs.writeFileSync(OUTPUT_LOCAL, localHTML, 'utf-8');
  console.log(`Generado: ${OUTPUT_LOCAL}`);

  // Server (PostgreSQL)
  const serverHTML = generateHTML(models, prismaToPostgres, formatDefaultPG, true, 'PostgreSQL (Render)', timestamp);
  fs.writeFileSync(OUTPUT_SERVER, serverHTML, 'utf-8');
  console.log(`Generado: ${OUTPUT_SERVER}`);

  console.log('Listo!');
}

main();
