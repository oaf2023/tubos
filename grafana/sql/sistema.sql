-- ============================================================
-- GasTrack AR - Queries de Sistema para Grafana
-- Requiere tabla MetricSnapshot (schema.prisma)
-- ============================================================

-- ============================================================
-- 1. CPU Usage (time series)
-- ============================================================
SELECT
  "timestamp" AS time,
  "cpuPercent" AS cpu_percent
FROM "MetricSnapshot"
WHERE "timestamp" >= $__timeFrom() AND "timestamp" <= $__timeTo()
ORDER BY "timestamp" ASC;

-- ============================================================
-- 2. RAM Usage (time series)
-- ============================================================
SELECT
  "timestamp" AS time,
  "ramPercent" AS ram_percent
FROM "MetricSnapshot"
WHERE "timestamp" >= $__timeFrom() AND "timestamp" <= $__timeTo()
ORDER BY "timestamp" ASC;

-- ============================================================
-- 3. Disco Usage (time series)
-- ============================================================
SELECT
  "timestamp" AS time,
  "diskPercent" AS disk_percent
FROM "MetricSnapshot"
WHERE "timestamp" >= $__timeFrom() AND "timestamp" <= $__timeTo()
ORDER BY "timestamp" ASC;

-- ============================================================
-- 4. Health Score (time series + gauge)
-- ============================================================
SELECT
  "timestamp" AS time,
  "healthScore" AS health_score,
  "healthClassification" AS clasificacion
FROM "MetricSnapshot"
WHERE "timestamp" >= $__timeFrom() AND "timestamp" <= $__timeTo()
ORDER BY "timestamp" ASC;

-- ============================================================
-- 5. CPU + RAM + Disco combinado (time series overlay)
-- ============================================================
SELECT
  "timestamp" AS time,
  "cpuPercent" AS cpu,
  "ramPercent" AS ram,
  "diskPercent" AS disco
FROM "MetricSnapshot"
WHERE "timestamp" >= $__timeFrom() AND "timestamp" <= $__timeTo()
ORDER BY "timestamp" ASC;

-- ============================================================
-- 6. Último snapshot (stat panel)
-- ============================================================
SELECT
  "cpuPercent" AS cpu,
  "ramPercent" AS ram,
  "diskPercent" AS disco,
  "healthScore" AS health,
  "healthClassification" AS clasificacion,
  "uptimeSeconds" AS uptime_segundos,
  "nodeVersion" AS node_version,
  "timestamp"
FROM "MetricSnapshot"
ORDER BY "timestamp" DESC
LIMIT 1;

-- ============================================================
-- 7. Métricas de negocio del sistema (time series)
-- ============================================================
SELECT
  "timestamp" AS time,
  "pedidosDelDia" AS pedidos_dia,
  "facturasPendientes" AS facturas_pendientes,
  "tubosActivos" AS tubos_activos,
  "alertasActivas" AS alertas_activas
FROM "MetricSnapshot"
WHERE "timestamp" >= $__timeFrom() AND "timestamp" <= $__timeTo()
ORDER BY "timestamp" ASC;

-- ============================================================
-- 8. Tendencia de health score (con umbrales)
-- ============================================================
SELECT
  "timestamp" AS time,
  "healthScore" AS value,
  CASE
    WHEN "healthScore" >= 90 THEN 'EXCELENTE'
    WHEN "healthScore" >= 75 THEN 'NORMAL'
    WHEN "healthScore" >= 60 THEN 'ATENCIÓN'
    WHEN "healthScore" >= 40 THEN 'DEGRADADO'
    ELSE 'CRÍTICO'
  END AS estado
FROM "MetricSnapshot"
WHERE "timestamp" >= $__timeFrom() AND "timestamp" <= $__timeTo()
ORDER BY "timestamp" ASC;
