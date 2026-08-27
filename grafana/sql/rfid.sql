-- ============================================================
-- GasTrack AR - Queries RFID/IoT para Grafana
-- ============================================================

-- ============================================================
-- 1. KPIs RFID (stat panel)
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM "EventoRFID") AS total_eventos,
  (SELECT COUNT(*) FROM "EventoRFID" WHERE "timestamp" >= NOW() - INTERVAL '1 hour') AS eventos_ultima_hora,
  (SELECT COUNT(*) FROM "EventoRFID" WHERE "timestamp" >= NOW() - INTERVAL '24 hours') AS eventos_ultimas_24h,
  (SELECT COUNT(*) FROM "TagRFID") AS tags_totales,
  (SELECT COUNT(*) FROM "TagRFID" WHERE "cylinderId" IS NOT NULL) AS tags_asociados,
  (SELECT COUNT(*) FROM "TagRFID" WHERE "cylinderId" IS NULL) AS tags_no_asociados,
  (SELECT COUNT(*) FROM "LectorIoT" WHERE activo = true) AS lectores_activos,
  (SELECT COUNT(*) FROM "LectorIoT" WHERE activo = false) AS lectores_inactivos;

-- ============================================================
-- 2. Eventos RFID por zona (pie chart / bar chart)
-- ============================================================
SELECT
  z.nombre AS zona,
  z.tipo AS tipo_zona,
  COUNT(e.id) AS cantidad
FROM "EventoRFID" e
JOIN "ZonaLectura" z ON e."zonaId" = z.id
WHERE e."timestamp" >= $__timeFrom() AND e."timestamp" <= $__timeTo()
GROUP BY z.nombre, z.tipo
ORDER BY cantidad DESC;

-- ============================================================
-- 3. Eventos RFID por origen (pie chart)
-- ============================================================
SELECT
  e.origen,
  COUNT(e.id) AS cantidad
FROM "EventoRFID" e
WHERE e."timestamp" >= $__timeFrom() AND e."timestamp" <= $__timeTo()
GROUP BY e.origen
ORDER BY cantidad DESC;

-- ============================================================
-- 4. Eventos RFID por hora (time series)
-- ============================================================
SELECT
  DATE_TRUNC('hour', e."timestamp") AS time,
  COUNT(e.id) AS eventos
FROM "EventoRFID" e
WHERE e."timestamp" >= $__timeFrom() AND e."timestamp" <= $__timeTo()
GROUP BY DATE_TRUNC('hour', e."timestamp")
ORDER BY time ASC;

-- ============================================================
-- 5. Stock por gas (bar chart)
-- ============================================================
SELECT
  g.codigo AS gas,
  g.nombre,
  g."colorHex" AS color,
  s.llenos,
  s.vacios,
  s."enReparto" AS en_transito,
  s."enCarga" AS en_carga,
  s.mantenimiento,
  s.baja
FROM "StockGas" s
JOIN "Gas" g ON s."gasId" = g.id
ORDER BY (s.llenos + s.vacios + s."enReparto" + s."enCarga" + s.mantenimiento + s.baja) DESC;

-- ============================================================
-- 6. Tags por estado de asociación (table)
-- ============================================================
SELECT
  t.codigo AS tag_codigo,
  t.estado AS tag_estado,
  c."numeroSerie" AS tubo_asociado,
  z.nombre AS zona_ultima_lectura
FROM "TagRFID" t
LEFT JOIN "Cylinder" c ON t."cylinderId" = c.id
LEFT JOIN "LectorIoT" l ON t."lectorId" = l.id
LEFT JOIN "ZonaLectura" z ON l."zonaId" = z.id
ORDER BY t.estado, t.codigo;

-- ============================================================
-- 7. Actividad de lectores (table)
-- ============================================================
SELECT
  l.nombre AS lector,
  l.activo,
  l."ultimaLectura" AS ultima_lectura,
  (SELECT COUNT(*) FROM "EventoRFID" e WHERE e."lectorId" = l.id) AS total_eventos,
  (SELECT COUNT(*) FROM "EventoRFID" e WHERE e."lectorId" = l.id AND e."timestamp" >= NOW() - INTERVAL '24 hours') AS eventos_24h
FROM "LectorIoT" l
ORDER BY l.activo DESC, total_eventos DESC;
