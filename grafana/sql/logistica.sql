-- ============================================================
-- GasTrack AR - Queries de Logística para Grafana
-- ============================================================

-- ============================================================
-- 1. Rutas por mes (time series)
-- ============================================================
SELECT
  DATE_TRUNC('month', "fecha") AS time,
  COUNT(*) AS total_rutas,
  SUM("distanciaKm") AS distancia_total_km,
  SUM("duracionHoras") AS duracion_total_hrs,
  AVG("distanciaKm") AS distancia_promedio_km,
  AVG("duracionHoras") AS duracion_promedio_hrs
FROM "Ruta"
WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()
GROUP BY DATE_TRUNC('month', "fecha")
ORDER BY time ASC;

-- ============================================================
-- 2. Rutas por estado (pie chart)
-- ============================================================
SELECT
  estado,
  COUNT(*) AS cantidad
FROM "Ruta"
WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()
GROUP BY estado
ORDER BY cantidad DESC;

-- ============================================================
-- 3. Paradas promedio por ruta (stat)
-- ============================================================
SELECT
  ROUND(AVG(
    (SELECT COUNT(*) FROM "RutaParada" rp WHERE rp."rutaId" = r.id)
  ), 1) AS paradas_promedio,
  SUM(
    (SELECT COUNT(*) FROM "RutaParada" rp WHERE rp."rutaId" = r.id)
  ) AS total_paradas
FROM "Ruta" r
WHERE r."fecha" >= $__timeFrom() AND r."fecha" <= $__timeTo();

-- ============================================================
-- 4. Flota de vehículos (table)
-- ============================================================
SELECT
  v.codigo,
  v.patente,
  v.estado,
  v."maxTubos" AS capacidad_tubos,
  v."kmActual" AS km_actuales,
  v.tipo,
  v.combustible,
  (SELECT COUNT(*) FROM "Ruta" r WHERE r."vehiculoId" = v.id AND r."fecha" >= $__timeFrom()) AS rutas_periodo
FROM "Vehiculo" v
WHERE v.estado != 'BAJA'
ORDER BY rutas_periodo DESC;

-- ============================================================
-- 5. Rendimiento de combustible (time series)
-- ============================================================
SELECT
  DATE_TRUNC('month', cc.fecha) AS time,
  AVG(cc.rendimiento) AS rendimiento_promedio,
  SUM(cc.litros) AS litros_totales,
  SUM(cc.costo) AS costo_total,
  v.patente AS vehiculo
FROM "CargaCombustible" cc
JOIN "Vehiculo" v ON cc."vehiculoId" = v.id
WHERE cc.fecha >= $__timeFrom() AND cc.fecha <= $__timeTo()
  AND cc.rendimiento IS NOT NULL
GROUP BY DATE_TRUNC('month', cc.fecha), v.patente
ORDER BY time ASC;

-- ============================================================
-- 6. KPIs de logística (stat panel)
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM "Ruta" WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()) AS rutas_periodo,
  (SELECT ROUND(SUM("distanciaKm")::numeric, 1) FROM "Ruta" WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()) AS km_totales,
  (SELECT ROUND(AVG("distanciaKm")::numeric, 1) FROM "Ruta" WHERE "fecha" >= $__timeFrom() AND "fecha" <= $__timeTo()) AS km_promedio,
  (SELECT COUNT(*) FROM "Vehiculo" WHERE estado = 'ACTIVO') AS vehiculos_activos,
  (SELECT ROUND(AVG(cc.rendimiento)::numeric, 1) FROM "CargaCombustible" cc WHERE cc.fecha >= $__timeFrom() AND cc.rendimiento IS NOT NULL) AS rendimiento_promedio;

-- ============================================================
-- 7. Carga de tubos por vehículo (bar chart)
-- ============================================================
SELECT
  v.patente,
  COUNT(ci.id) AS tubos_cargados
FROM "CargaVehiculo" cv
JOIN "Vehiculo" v ON cv."vehiculoId" = v.id
JOIN "CargaVehiculoItem" ci ON ci."cargaVehiculoId" = cv.id
WHERE cv.estado = 'COMPLETADA'
  AND cv.fecha >= $__timeFrom() AND cv.fecha <= $__timeTo()
GROUP BY v.patente
ORDER BY tubos_cargados DESC;

-- ============================================================
-- 8. Costos de mantenimiento vehículos (time series)
-- ============================================================
SELECT
  DATE_TRUNC('month', mv.fecha) AS time,
  SUM(mv.costo) AS costo_total,
  COUNT(*) AS mantenimientos,
  v.patente AS vehiculo
FROM "MantenimientoVehiculo" mv
JOIN "Vehiculo" v ON mv."vehiculoId" = v.id
WHERE mv.fecha >= $__timeFrom() AND mv.fecha <= $__timeTo()
GROUP BY DATE_TRUNC('month', mv.fecha), v.patente
ORDER BY time ASC;
