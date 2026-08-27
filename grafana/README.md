# GasTrack AR - Dashboards de Grafana

## Configuración del Datasource PostgreSQL

### 1. Importar el datasource

En Grafana, ir a **Configuration > Data Sources > Add data source** y seleccionar **PostgreSQL**.

O importar directamente el archivo `datasource.yml` desde la UI de Grafana.

### 2. Configurar la conexión

Reemplazar los valores en `datasource.yml` o completar en la UI:

| Campo | Valor |
|---|---|
| Host | Tu host de Render (ej: `dpg-xxx.oregon-postgres.render.com`) |
| Database | Nombre de la base de datos |
| User | Usuario de PostgreSQL |
| Password | Contraseña |
| SSL Mode | `require` (producción) o `disable` (desarrollo) |

### 3. Importar los dashboards

En Grafana, ir a **Dashboards > Import > Upload JSON file** y seleccionar cada archivo de `grafana/dashboards/`.

### Dashboards disponibles

| Dashboard | Archivo | Descripción |
|---|---|---|
| Panel General | `panel-general.json` | KPIs principales del sistema |
| Inventario | `inventario.json` | Stock de tubos, rotación, PH |
| Finanzas | `finanzas.json` | Facturación, aging, ingresos |
| Logística | `logistica.json` | Rutas, flota, combustible |
| RFID/IoT | `rfid-iot.json` | Eventos RFID, tags, lectores |
| Calidad | `calidad.json` | Validaciones, alertas, consistencia |
| Sistema | `sistema.json` | CPU, RAM, disco, health score |

### 4. Variables de tiempo

Todos los dashboards usan las variables de tiempo estándar de Grafana (`$__timeFrom()`, `$__timeTo()`, `$__interval`).

### 5. Persistencia de métricas de sistema

Para que el dashboard de **Sistema** funcione con datos históricos, es necesario:

1. Aplicar la migración de Prisma que agrega la tabla `MetricSnapshot`:
   ```bash
   npx prisma migrate dev --name add_metric_snapshot
   ```

2. La tabla almacena snapshots cada 5 minutos con:
   - CPU, RAM, disco (%)
   - Health score y clasificación
   - Uptime, versión de Node
   - KPIs de negocio (pedidos del día, facturas pendientes, etc.)

### 6. Queries SQL

Los archivos en `grafana/sql/` contienen las queries parametrizadas que usa cada panel.
Estas queries están optimizadas para PostgreSQL y usan la sintaxis de Grafana.

Pueden ejecutarse directamente en pgAdmin o en la consola de PostgreSQL para verificación.

### 7. Notas para Render (producción)

- Render provee PostgreSQL con SSL habilitado
- Configurar `sslmode: require` en el datasource
- Si usas el plan free, el número de conexiones es limitado
- Las queries SQL usan índices existentes en las tablas principales

### Estructura

```
grafana/
├── README.md              # Este archivo
├── datasource.yml         # Config PostgreSQL datasource
├── dashboards/            # Dashboards JSON para importar
│   ├── panel-general.json
│   ├── inventario.json
│   ├── finanzas.json
│   ├── logistica.json
│   ├── rfid-iot.json
│   ├── calidad.json
│   └── sistema.json
└── sql/                   # Queries SQL de referencia
    ├── inventario.sql
    ├── finanzas.sql
    ├── logistica.sql
    ├── rfid.sql
    ├── calidad.sql
    └── sistema.sql
```
