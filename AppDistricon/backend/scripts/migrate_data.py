"""
Migration script: PostgreSQL (via psycopg2) → SQLite (via SQLAlchemy).

Usage:
  1. Set DATABASE_URL (PostgreSQL) in environment or edit PG_URL below
  2. Run: python scripts/migrate_data.py

Reads all data from PostgreSQL, transforms types, inserts into SQLite.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
from datetime import datetime
import psycopg2
from app import create_app
from models.base import db
from models import *  # all models

# ─── CONFIG ─────────────────────────────────────────────────────
PG_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@host:5432/tubos')

# Map table_name -> model class (only models with data to migrate)
MODEL_MAP = {m.__tablename__: m for m in [
    Gas, Cylinder, CylinderMovimiento, Mantenimiento, Location, Cliente,
    ClienteAcceso, Remito, RemitoItem, Factura, FacturaItem, AlertConfig,
    Ruta, RutaParada, RouteCache, Pedido, PedidoItem, PedidoCilindro,
    TipoOperacionPedido, Rol, Usuario, Observacion, ObservacionArchivo,
    Vehiculo, CargaVehiculo, CargaVehiculoItem, MantenimientoVehiculo,
    CargaCombustible, DocumentoVehiculo, ZonaLectura, LectorIoT, TagRFID,
    EventoRFID, SesionLecturaRFID, StockGas, MovimientoStock, Reparto,
    Cabina, SensorCabina, LecturaPeso, EvidenciaFoto, ValidacionCabina,
    ReglaPeso, EventoTrazabilidad, Alerta, AuditLog, Geocerca, UbicacionGPS,
    SesionConductor, TrafficHistory, IdentificadorTubo, EventoTubo,
    PedidoLectura, PedidoLecturaItem, RouteCalcLog, IdempotencyKey,
    ComprobanteHistorico, ComprobanteItemHistorico, CuentaCorrienteMovimiento,
    SellerAccount, MlOrder, MlOrderItem, MlShipment, MlClaimReturn, MlQuestion,
    MlItem, MpPayment, MpAccountMovement, MpReleaseReport, ConciliacionOperacion,
    AuditoriaSincronizacion,
]}

def transform_value(v, col_info):
    """Transform PostgreSQL values to SQLite-compatible Python values."""
    if v is None:
        return None
    col_type = col_info.get('type', '').lower()
    if isinstance(v, datetime):
        return v
    if isinstance(v, (int, float)):
        # BigInt -> int
        if col_type in ('bigint', 'int8'):
            return int(v)
        if col_type in ('boolean', 'bool'):
            return 1 if v else 0
        return v
    if isinstance(v, bool):
        return 1 if v else 0
    if isinstance(v, str):
        if col_type in ('json', 'jsonb'):
            return v  # keep as string, models expect Text
        return v
    if isinstance(v, bytes):
        return v.decode()
    if isinstance(v, dict):
        return json.dumps(v, default=str)
    if isinstance(v, list):
        return json.dumps(v, default=str)
    return str(v)

def migrate():
    print('📡 Conectando a PostgreSQL...')
    pg_conn = psycopg2.connect(PG_URL)
    pg_cursor = pg_conn.cursor()

    app = create_app()
    with app.app_context():
        db.create_all()
        print(f'🔹 SQLite lista: {app.config["SQLALCHEMY_DATABASE_URI"]}')

        for table_name, model in MODEL_MAP.items():
            print(f'  → Migrando {table_name}...', end=' ')

            # Get column info
            pg_cursor.execute(f"""
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """)
            columns = pg_cursor.fetchall()
            col_names = [c[0] for c in columns]
            col_types = {c[0]: c[1] for c in columns}

            # Read all rows from PostgreSQL
            pg_cursor.execute(f'SELECT * FROM "{table_name}" ORDER BY id')
            rows = pg_cursor.fetchall()
            if not rows:
                print('sin datos')
                continue

            # Transform and insert
            count = 0
            for row in rows:
                try:
                    data = {}
                    for i, col in enumerate(col_names):
                        data[col] = transform_value(row[i], {'type': col_types.get(col, 'text')})
                    db.session.add(model(**data))
                    count += 1
                except Exception as e:
                    print(f'\n    ⚠ Error en {table_name} id={row[0] if row else "?"}: {e}')
                    db.session.rollback()
                    continue

            db.session.commit()
            print(f'{count} registros')

        print('\n✅ Migración completada')

    pg_cursor.close()
    pg_conn.close()

if __name__ == '__main__':
    migrate()
