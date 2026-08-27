-- ============================================================
-- GasTrack AR - Queries de Inventario para Grafana
-- ============================================================

-- ============================================================
-- 1. Stock actual por tipo de gas (para pie chart / bar chart)
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
  s.baja,
  (s.llenos + s.vacios + s."enReparto" + s."enCarga" + s.mantenimiento + s.baja) AS total
FROM "StockGas" s
JOIN "Gas" g ON s."gasId" = g.id
ORDER BY total DESC;

-- ============================================================
-- 2. Distribución de tubos por estado (pie chart)
-- ============================================================
SELECT
  estado,
  COUNT(*) AS cantidad
FROM "Cylinder"
WHERE estado != 'BAJA'
GROUP BY estado
ORDER BY cantidad DESC;

-- ============================================================
-- 3. Movimientos de tubos por mes (time series)
-- ============================================================
SELECT
  DATE_TRUNC('month', "fecha") AS time,
  COUNT(*) AS total_movimientos,
  COUNT(*) FILTER (WHERE tipo = 'CARGA') AS cargas,
  COUNT(*) FILTER (WHERE tipo = 'DESCARGA') AS descargas,
  COUNT(*) FILTER (WHERE tipo = 'TRANSFERENCIA') AS transferencias
FROM "CylinderMovimiento"
WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()
GROUP BY DATE_TRUNC('month', "fecha")
ORDER BY time ASC;

-- ============================================================
-- 4. Tubos con PH vencido o por vencer (stat / table)
-- ============================================================
SELECT
  COUNT(*) FILTER (WHERE "fechaProximoRetest" < NOW()) AS ph_vencido,
  COUNT(*) FILTER (WHERE "fechaProximoRetest" >= NOW() AND "fechaProximoRetest" < NOW() + INTERVAL '30 days') AS vence_30_dias,
  COUNT(*) FILTER (WHERE "fechaProximoRetest" >= NOW() + INTERVAL '30 days' AND "fechaProximoRetest" < NOW() + INTERVAL '60 days') AS vence_60_dias,
  COUNT(*) FILTER (WHERE "fechaProximoRetest" >= NOW() + INTERVAL '60 days' AND "fechaProximoRetest" < NOW() + INTERVAL '90 days') AS vence_90_dias,
  COUNT(*) FILTER (WHERE "fechaProximoRetest" >= NOW()) AS ph_al_dia
FROM "Cylinder"
WHERE estado != 'BAJA';

-- ============================================================
-- 5. Tasa de rotación de tubos por gas (gauge)
-- ============================================================
WITH movimientos_recientes AS (
  SELECT
    c."gasId",
    COUNT(m.id) AS movimientos
  FROM "CylinderMovimiento" m
  JOIN "Cylinder" c ON m."cylinderId" = c.id
  WHERE m.fecha >= NOW() - INTERVAL '30 days'
  GROUP BY c."gasId"
),
stock_total AS (
  SELECT
    "gasId",
    SUM(llenos + vacios + "enReparto" + "enCarga" + mantenimiento) AS total
  FROM "StockGas"
  GROUP BY "gasId"
)
SELECT
  g.codigo AS gas,
  g.nombre,
  COALESCE(mr.movimientos, 0) AS movimientos_30d,
  st.total AS stock_total,
  CASE
    WHEN st.total > 0 THEN ROUND(COALESCE(mr.movimientos, 0)::numeric / st.total, 2)
    ELSE 0
  END AS tasa_rotacion
FROM stock_total st
JOIN "Gas" g ON st."gasId" = g.id
LEFT JOIN movimientos_recientes mr ON st."gasId" = mr."gasId"
ORDER BY tasa_rotacion DESC;

-- ============================================================
-- 6. KPIs de inventario (stat panel)
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado != 'BAJA') AS total_tubos,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado = 'LLENO') AS tubos_llenos,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado = 'VACIO') AS tubos_vacios,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado = 'EN_CLIENTE') AS en_cliente,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado = 'EN_REPARTO') AS en_reparto,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado = 'MANTENIMIENTO') AS en_mantenimiento,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado = 'PH_VENCIDO') AS ph_vencidos,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado != 'BAJA' AND "fechaProximoRetest" >= NOW()) AS ph_al_dia,
  (SELECT COUNT(*) FROM "Cylinder" WHERE estado != 'BAJA') - (SELECT COUNT(*) FROM "Cylinder" WHERE estado != 'BAJA' AND "fechaProximoRetest" >= NOW()) AS ph_vencidos_total;
