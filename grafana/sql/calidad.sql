-- ============================================================
-- GasTrack AR - Queries de Calidad para Grafana
-- ============================================================

-- ============================================================
-- 1. Validaciones de cabina por día (time series)
-- ============================================================
SELECT
  DATE_TRUNC('day', v."createdAt") AS time,
  COUNT(*) AS total_validaciones,
  COUNT(*) FILTER (WHERE v.resultado = 'APROBADO') AS aprobadas,
  COUNT(*) FILTER (WHERE v.resultado = 'RECHAZADO') AS rechazadas,
  COUNT(*) FILTER (WHERE v.resultado = 'CONDENADO') AS condenadas
FROM "ValidacionCabina" v
WHERE v."createdAt" >= $__timeFrom() AND v."createdAt" <= $__timeTo()
GROUP BY DATE_TRUNC('day', v."createdAt")
ORDER BY time ASC;

-- ============================================================
-- 2. Tasa de inconsistencia (gauge / stat)
-- ============================================================
SELECT
  COUNT(*) AS total_validaciones,
  COUNT(*) FILTER (WHERE v."inconsistente" = true) AS inconsistencias,
  CASE
    WHEN COUNT(*) > 0 THEN
      ROUND(COUNT(*) FILTER (WHERE v."inconsistente" = true)::numeric / COUNT(*) * 100, 2)
    ELSE 0
  END AS tasa_inconsistencia
FROM "ValidacionCabina" v
WHERE v."createdAt" >= $__timeFrom() AND v."createdAt" <= $__timeTo();

-- ============================================================
-- 3. Alertas por tipo y nivel (bar chart)
-- ============================================================
SELECT
  a.tipo,
  a.nivel AS severidad,
  COUNT(*) AS cantidad
FROM "Alerta" a
WHERE a."createdAt" >= $__timeFrom() AND a."createdAt" <= $__timeTo()
  AND a.resuelta = false
GROUP BY a.tipo, a.nivel
ORDER BY
  CASE a.nivel
    WHEN 'CRITICO' THEN 1
    WHEN 'ALTA' THEN 2
    WHEN 'MEDIA' THEN 3
    ELSE 4
  END,
  cantidad DESC;

-- ============================================================
-- 4. Alertas por nivel (pie chart)
-- ============================================================
SELECT
  a.nivel AS severidad,
  COUNT(*) AS cantidad
FROM "Alerta" a
WHERE a."createdAt" >= $__timeFrom() AND a."createdAt" <= $__timeTo()
GROUP BY a.nivel
ORDER BY cantidad DESC;

-- ============================================================
-- 5. Scatter peso esperado vs real (scatter plot)
-- ============================================================
SELECT
  lp."pesoEsperado" AS x,
  lp."pesoReal" AS y,
  lp."createdAt" AS time,
  c."numeroSerie" AS tubo,
  CASE
    WHEN ABS(lp."pesoReal" - lp."pesoEsperado") / NULLIF(lp."pesoEsperado", 0) <= 0.05 THEN 'Normal'
    WHEN ABS(lp."pesoReal" - lp."pesoEsperado") / NULLIF(lp."pesoEsperado", 0) <= 0.10 THEN 'Advertencia'
    ELSE 'Crítico'
  END AS estado
FROM "LecturaPeso" lp
JOIN "Cylinder" c ON lp."cylinderId" = c.id
WHERE lp."createdAt" >= $__timeFrom() AND lp."createdAt" <= $__timeTo()
ORDER BY lp."createdAt" DESC;

-- ============================================================
-- 6. KPIs de calidad (stat panel)
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM "ValidacionCabina" WHERE "createdAt" >= $__timeFrom() AND "createdAt" <= $__timeTo()) AS total_validaciones,
  (SELECT COUNT(*) FROM "ValidacionCabina" WHERE "createdAt" >= $__timeFrom() AND "createdAt" <= $__timeTo() AND resultado = 'APROBADO') AS aprobadas,
  (SELECT COUNT(*) FROM "ValidacionCabina" WHERE "createdAt" >= $__timeFrom() AND "createdAt" <= $__timeTo() AND "inconsistente" = true) AS inconsistencias,
  (SELECT COUNT(*) FROM "Alerta" WHERE "createdAt" >= $__timeFrom() AND "createdAt" <= $__timeTo() AND resuelta = false) AS alertas_activas,
  (SELECT COUNT(*) FROM "Alerta" WHERE "createdAt" >= $__timeFrom() AND "createdAt" <= $__timeTo() AND nivel = 'CRITICO' AND resuelta = false) AS criticas;

-- ============================================================
-- 7. Mantenimiento de cilindros por tipo (bar chart)
-- ============================================================
SELECT
  m.tipo AS tipo_mantenimiento,
  COUNT(*) AS cantidad,
  SUM(m.costo) AS costo_total
FROM "Mantenimiento" m
WHERE m.fecha >= $__timeFrom() AND m.fecha <= $__timeTo()
GROUP BY m.tipo
ORDER BY costo_total DESC;

-- ============================================================
-- 8. Calidad de validaciones por cabina (table)
-- ============================================================
SELECT
  cb.nombre AS cabina,
  COUNT(v.id) AS total_validaciones,
  COUNT(*) FILTER (WHERE v.resultado = 'APROBADO') AS aprobadas,
  COUNT(*) FILTER (WHERE v.resultado = 'RECHAZADO') AS rechazadas,
  COUNT(*) FILTER (WHERE v."inconsistente" = true) AS inconsistencias,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN
        COUNT(*) FILTER (WHERE v.resultado = 'APROBADO')::numeric / COUNT(*) * 100
      ELSE 0
    END, 1
  ) AS tasa_aprobacion
FROM "Cabina" cb
LEFT JOIN "ValidacionCabina" v ON v."cabinaId" = cb.id
  AND v."createdAt" >= $__timeFrom() AND v."createdAt" <= $__timeTo()
GROUP BY cb.nombre
ORDER BY total_validaciones DESC;
