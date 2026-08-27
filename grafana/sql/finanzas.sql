-- ============================================================
-- GasTrack AR - Queries Financieras para Grafana
-- ============================================================

-- ============================================================
-- 1. Ingresos mensuales (time series)
-- ============================================================
SELECT
  DATE_TRUNC('month', "fecha") AS time,
  SUM("totalGeneral") AS ingresos,
  SUM(subtotal) AS subtotal,
  SUM(descuento) AS descuentos,
  SUM(impuestos) AS impuestos,
  COUNT(*) AS facturas
FROM "Factura"
WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()
  AND estado != 'ANULADA'
GROUP BY DATE_TRUNC('month', "fecha")
ORDER BY time ASC;

-- ============================================================
-- 2. Facturas por estado (pie chart)
-- ============================================================
SELECT
  estado,
  COUNT(*) AS cantidad,
  SUM("totalGeneral") AS total
FROM "Factura"
WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()
GROUP BY estado
ORDER BY total DESC;

-- ============================================================
-- 3. Aging de deuda (bar chart)
-- ============================================================
SELECT
  CASE
    WHEN NOW() - "fecha" <= INTERVAL '30 days' THEN '0-30 días'
    WHEN NOW() - "fecha" <= INTERVAL '60 days' THEN '31-60 días'
    WHEN NOW() - "fecha" <= INTERVAL '90 days' THEN '61-90 días'
    ELSE '90+ días'
  END AS rango,
  COUNT(*) AS cantidad,
  SUM("totalGeneral") AS total
FROM "Factura"
WHERE estado IN ('PENDIENTE', 'VENCIDA')
  AND "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()
GROUP BY rango
ORDER BY
  CASE rango
    WHEN '0-30 días' THEN 1
    WHEN '31-60 días' THEN 2
    WHEN '61-90 días' THEN 3
    ELSE 4
  END;

-- ============================================================
-- 4. KPIs financieros (stat panel)
-- ============================================================
SELECT
  (SELECT SUM("totalGeneral") FROM "Factura" WHERE "fecha" >= DATE_TRUNC('month', NOW()) AND estado != 'ANULADA') AS ingresos_mes,
  (SELECT SUM("totalGeneral") FROM "Factura" WHERE "fecha" >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND "fecha" < DATE_TRUNC('month', NOW()) AND estado != 'ANULADA') AS ingresos_mes_anterior,
  (SELECT SUM("totalGeneral") FROM "Factura" WHERE estado = 'PENDIENTE') AS total_pendiente,
  (SELECT SUM("totalGeneral") FROM "Factura" WHERE estado = 'VENCIDA') AS total_vencido,
  (SELECT COUNT(*) FROM "Factura" WHERE estado = 'PENDIENTE') AS facturas_pendientes,
  (SELECT COUNT(*) FROM "Factura" WHERE estado = 'VENCIDA') AS facturas_vencidas;

-- ============================================================
-- 5. Ingresos por tipo de item (bar chart)
-- ============================================================
SELECT
  fi.tipo,
  SUM(fi.subtotal) AS total
FROM "FacturaItem" fi
JOIN "Factura" f ON fi."facturaId" = f.id
WHERE f."fecha" >= $__timeFrom() AND f."fecha" <= $__timeTo()
  AND f.estado != 'ANULADA'
GROUP BY fi.tipo
ORDER BY total DESC;

-- ============================================================
-- 6. Top clientes por facturación (table)
-- ============================================================
SELECT
  f.cliente AS nombre_cliente,
  SUM(f."totalGeneral") AS total_facturado,
  COUNT(*) AS cantidad_facturas
FROM "Factura" f
WHERE f."fecha" >= $__timeFrom() AND f."fecha" <= $__timeTo()
  AND f.estado != 'ANULADA'
GROUP BY f.cliente
ORDER BY total_facturado DESC
LIMIT 10;

-- ============================================================
-- 7. Margen mensual (ingresos vs descuentos vs impuestos)
-- ============================================================
SELECT
  DATE_TRUNC('month', "fecha") AS time,
  SUM(subtotal) AS subtotal,
  SUM(descuento) AS descuentos,
  SUM(impuestos) AS impuestos,
  SUM("totalGeneral") AS total_neto
FROM "Factura"
WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()
  AND estado != 'ANULADA'
GROUP BY DATE_TRUNC('month', "fecha")
ORDER BY time ASC;
