# AppDistricon

Migración de Next.js + Prisma + PostgreSQL → Flask + SQLAlchemy + SQLite

## Estructura

```
AppDistricon/
├── backend/
│   ├── app.py              # Flask application factory
│   ├── wsgi.py              # WSGI entry point
│   ├── config.py            # Configuration
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variables template
│   ├── data/                # SQLite database (auto-created)
│   ├── models/
│   │   ├── base.py          # SQLAlchemy declarative base
│   │   └── __init__.py      # 71 SQLAlchemy models
│   ├── auth/
│   │   ├── jwt.py           # JWT creation/verification
│   │   └── decorators.py    # @login_required, @require_role
│   ├── blueprints/          # 18 Flask blueprints (~130 endpoints)
│   │   ├── auth.py
│   │   ├── clientes.py
│   │   ├── pedidos.py
│   │   ├── gases.py
│   │   ├── cylinders.py
│   │   ├── vehiculos.py
│   │   ├── cabina.py
│   │   ├── deposito.py
│   │   ├── rfid.py
│   │   ├── mobile.py
│   │   ├── facturas.py
│   │   ├── remitos.py
│   │   ├── chofer.py
│   │   ├── rutas.py
│   │   ├── admin.py
│   │   ├── stats.py
│   │   ├── gerencia.py
│   │   └── upload.py
│   ├── services/            # Business logic services
│   │   ├── mercadolibre.py  # ML API connector (mock mode)
│   │   ├── mercadopago.py   # MP API connector (mock mode)
│   │   ├── routing.py       # OSRM routing client
│   │   ├── geocoding.py     # Nominatim geocoding
│   │   ├── rfid.py          # RFID session management
│   │   ├── cabina.py        # Cabina validation engine
│   │   └── export.py        # CSV/Excel export
│   └── scripts/
│       ├── seed.py          # Seed initial data
│       └── migrate_data.py  # PostgreSQL → SQLite migration
├── frontend/
│   └── README.md            # Instructions to export Next.js
├── deploy/
│   └── README.md            # PythonAnywhere deploy guide
└── README.md                # This file
```

## Quickstart

```bash
cd backend
cp ../.env.example .env  # Editar con valores reales
pip install -r requirements.txt
python scripts/seed.py
python app.py
```

## API endpoints

La app expone ~130 endpoints REST bajo `/api/*`, exactamente los mismos paths que el original Next.js. Autenticación mediante JWT en cookie `session` (httpOnly).

## Database

SQLite en `backend/data/tubos.db`. Migración desde PostgreSQL con `scripts/migrate_data.py`.

## Dominio

Aplicación desplegada en **www.appdistricon.com** via PythonAnywhere (Flask WSGI).
