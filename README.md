# GasTrack AR — Control de Tubos de Gases para Soldadura

Sistema integral de control y geolocalización de tubos de gases para soldadura.
Desarrollado para **Districon**, con base operativa en **San Nicolás de los Arroyos, Buenos Aires, Argentina**.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | Next.js 16.1 (App Router, React 19) |
| **Lenguaje** | TypeScript 5 |
| **Estilos** | Tailwind CSS v4 + shadcn/ui |
| **Base de datos principal** | PostgreSQL 16 vía Prisma ORM |
| **Base de datos de grafos** | Neo4j 5 (Community) — opcional con degradación graceful |
| **Mapas** | Leaflet + React-Leaflet (OpenStreetMap) |
| **Gráficos** | Recharts |
| **Escritorio** | Electron (empaquetado Windows/Linux/Mac) |
| **Proxy reverso** | Caddy |

## Funcionalidades

- **Dashboard** — KPIs, estadísticas por estado/gas/ubicación, alertas de vencimiento
- **Mapa interactivo** — Geolocalización de cilindros en toda Argentina
- **Inventario** — CRUD completo de cilindros con campos normativos
  - ISO 18119 (inspección y recalificación)
  - NTC 5719 (requisitos de cilindros para gases)
  - Resolución 2876/2013 (reglamento técnico argentino)
- **Rutas** — Planificación de entregas con paradas y estados
- **Catálogo de gases** — Tabla completa con códigos, presiones, colores (norma EN 1089-3)
- **Grafo de relaciones** — Visualización force-directed de conexiones entre cilindros, gases, clientes, ubicaciones, inspectores y fabricantes

## Requisitos previos

- **Node.js** ≥ 18
- **npm** (incluido con Node.js)
- **Docker Desktop** (para Neo4j — opcional, ver más abajo)

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url> tubos
cd tubos

# 2. Instalar dependencias
npm install

# 3. Generar Prisma Client
npx prisma generate
```

## Configuración del entorno

Editar `.env` en la raíz del proyecto:

```env
# Base de datos PostgreSQL (Render)
DATABASE_URL=postgresql://usuario:password@host:5432/gastrack

# JWT secret para autenticación de sesiones
JWT_SECRET=your-secret-key

# Neo4j (opcional — sin esto funciona con mock en memoria)
NEO4J_ENABLED=true
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=gastrack123
```

## Base de datos PostgreSQL

La base de datos principal es **PostgreSQL 16** alojada en Render.
Para conectar localmente, configurar `DATABASE_URL` en `.env` apuntando al túnel SSL.

Para regenerar los datos de semilla:

```bash
npx tsx scripts/seed.ts
```

## Iniciar la aplicación

```bash
# Desarrollo
npm run dev

# Producción
npm run build && npm run start
```

La app estará disponible en `http://localhost:3000`.

## Neo4j — Base de datos de grafos

Neo4j es **opcional**. Si no está disponible, la app construye el grafo en memoria desde SQLite (degradación graceful).

### Instalación de Docker Desktop

1. Abrir **PowerShell como Administrador**
2. Habilitar WSL:
   ```powershell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
3. **Reiniciar el equipo**
4. Establecer WSL2 por defecto:
   ```powershell
   wsl --set-default-version 2
   ```
5. Instalar Docker Desktop:
   ```powershell
   winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
   ```
6. Abrir Docker Desktop desde el menú Inicio y completar la configuración inicial

### Levantar Neo4j

```bash
# Desde la raíz del proyecto
docker compose up -d
```

Esto expone:
- **Puerto 7687** — Bolt (conexión desde la app)
- **Puerto 7474** — Browser UI (http://localhost:7474, usuario: `neo4j`, contraseña: `gastrack123`)

### Sincronización de datos

La app sincroniza automáticamente los cilindros a Neo4j al crearlos o actualizarlos. Para sincronizar datos existentes, la inicialización se dispara al iniciar el servidor con `NEO4J_ENABLED=true`.

**Nodos en el grafo:** Cylinder, Gas, Cliente, Location, Inspector, Fabricante, Ruta

**Relaciones:** CONTIENE, ASIGNADO_A, UBICADO_EN, INSPECCIONADO_POR, FABRICADO_POR, EN_RUTA

## API

| Ruta | Métodos | Descripción |
|---|---|---|
| `/api` | GET | Health check |
| `/api/config` | GET | Configuración de la empresa |
| `/api/cylinders` | GET, POST | CRUD cilindros |
| `/api/cylinders/[id]` | GET, PUT, DELETE | CRUD cilindro individual |
| `/api/cylinders/[id]/movimientos` | GET | Movimientos de un cilindro |
| `/api/gases` | GET | Catálogo de gases |
| `/api/graph` | GET | Datos del grafo (Neo4j o mock) |
| `/api/locations` | GET | Ubicaciones |
| `/api/routes` | GET, POST | Rutas de entrega |
| `/api/routes/[id]` | PUT, DELETE | Ruta individual |
| `/api/stats` | GET | Estadísticas del dashboard |

## Estructura del proyecto

```
tubos/
├── .env                     # Variables de entorno
├── config.json              # Configuración de la aplicación
├── docker-compose.yml       # Neo4j en Docker
├── prisma/schema.prisma     # Schema de base de datos
├── scripts/
│   ├── seed.ts              # Script de datos de semilla
│   ├── init-neo4j.cmd       # Inicialización de Neo4j
│   └── build-electron.js    # Build para Electron
├── electron/
│   ├── main.js              # Proceso principal de Electron
│   └── preload.js           # Context bridge
├── src/
│   ├── app/                 # App Router (páginas y API)
│   │   ├── page.tsx         # SPA principal (Dashboard/Mapa/Inventario/Rutas/Catálogo)
│   │   └── api/             # Rutas de API
│   ├── components/
│   │   ├── graph-view.tsx   # Visualización de grafo force-directed
│   │   ├── map-view.tsx     # Mapa Leaflet
│   │   └── ui/              # Componentes shadcn/ui (~40)
│   ├── hooks/               # Custom hooks (config, mobile, toast)
│   └── lib/
│       ├── db.ts            # Singleton de Prisma Client
│       ├── neo4j.ts         # Servicio Neo4j con degradación graceful
│       ├── config.ts        # Config desde variables de entorno
│       ├── catalogo.ts      # Catálogo de gases, ciudades, clientes
│       └── utils.ts         # Utilidades (cn, clsx)
├── db/custom.db             # Base de datos SQLite pre-poblada
└── package.json
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Inicia servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:push` | Push schema a SQLite |
| `npm run db:generate` | Regenerar Prisma Client |
| `npm run db:migrate` | Migración de desarrollo |
| `npm run db:reset` | Resetear base de datos |

## Licencia

Privado — Districon
