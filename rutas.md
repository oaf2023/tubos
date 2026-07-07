Actuá como arquitecto senior de logística, GIS, ruteo vehicular, optimización matemática, programación full-stack y análisis de datos.

Estoy trabajando sobre el repositorio:
https://github.com/oaf2023/tubos.git

El sistema se llama GasTrack AR y administra tubos/cilindros de gases, clientes, pedidos, remitos, facturación, vehículos, depósito RFID, cabina inteligente, rutas y geolocalización.

Necesito diseñar e implementar un motor de rutas tipo Waze, gratuito, basado en tecnologías open-source y datos abiertos.

Objetivo general:
Crear un sistema de ruteo avanzado para reparto de tubos que permita:
- calcular rutas entre clientes;
- optimizar múltiples paradas;
- trabajar con varios vehículos;
- respetar capacidad máxima de tubos;
- respetar peso máximo;
- respetar ventanas horarias;
- calcular distancia y duración;
- mostrar geometría en mapa;
- recibir GPS del vehículo;
- recalcular rutas dinámicamente;
- guardar histórico de velocidades;
- generar ETA;
- detectar desvíos;
- mejorar la planificación con datos propios.

Stack recomendado:
- Next.js / TypeScript para APIs internas.
- Prisma para persistencia.
- PostgreSQL/PostGIS recomendado para producción.
- SQLite solo para demo.
- OSRM como primer motor de rutas.
- Valhalla como alternativa avanzada.
- OR-Tools para optimización VRP.
- VROOM como alternativa de optimización.
- Leaflet o MapLibre para frontend.
- OpenStreetMap como fuente cartográfica.
- Geofabrik para descargar extractos OSM.
- GPS propio de choferes para tráfico interno.

Reglas estratégicas:
1. No depender de APIs pagas.
2. No depender de Waze ni Google Maps para tráfico.
3. No usar tiles públicos de OSM en producción intensiva sin cumplir política de uso.
4. Cachear geocodificación.
5. Cachear matrices de distancia.
6. Guardar histórico de velocidad por tramo.
7. Usar recalculo dinámico solo cuando haya desvío o demora relevante.
8. Separar ruteo simple de optimización logística.
9. Mantener el diseño preparado para OSRM y Valhalla.
10. No bloquear la operación si el motor externo falla: usar fallback Haversine.
11. No optimizar solo por distancia; optimizar por costo operativo.
12. Considerar capacidad de tubos, peso, horario, prioridad, cliente, estado de pedido y vehículo.

Necesito que propongas:
1. Arquitectura técnica.
2. Modelo de datos Prisma.
3. Endpoints API.
4. Algoritmo de optimización.
5. Estrategia de matriz de tiempos.
6. Estrategia de tráfico propio.
7. Estrategia de recalculo dinámico.
8. Código TypeScript inicial.
9. Código Python OR-Tools si conviene como microservicio.
10. Integración con el frontend de mapa.
11. Plan de implementación por sprints.
12. Checklist de pruebas.
13. Riesgos técnicos y mitigaciones.

Endpoints mínimos esperados:
- POST /api/routing/geocode
- POST /api/routing/matrix
- POST /api/routing/optimize
- POST /api/routing/route-geometry
- POST /api/gps/ping
- POST /api/routing/recalculate
- GET /api/routing/routes/[id]
- GET /api/routing/vehicle-position/[vehiculoId]

Modelo operativo esperado:
- Pedido genera demanda.
- Remito confirma entrega/devolución.
- Vehículo tiene capacidad máxima.
- Ruta agrupa paradas.
- Cada parada tiene cliente, coordenadas, tubos, peso, ventana horaria y tiempo de servicio.
- GPS actualiza avance.
- El sistema calcula ETA.
- Si hay desvío o demora, recalcula solo paradas pendientes.

Primera tarea:
Diseñá el módulo de rutas tipo Waze para GasTrack AR, usando OSRM + OR-Tools como implementación inicial y dejando abstraído el motor para poder cambiar a Valhalla en una segunda etapa.