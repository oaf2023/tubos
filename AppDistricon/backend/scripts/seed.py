"""Seed database with initial data."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from models.base import db
from models import Rol, Usuario, Gas, TipoOperacionPedido, StockGas
import bcrypt

def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        # Roles
        roles = [
            {'nombre': 'gerencia', 'descripcion': 'Acceso a módulo Gerencia'},
            {'nombre': 'admin', 'descripcion': 'Administrador del sistema'},
            {'nombre': 'operador', 'descripcion': 'Operador de depósito y logística'},
            {'nombre': 'conductor', 'descripcion': 'Conductor / chofer'},
        ]
        for r in roles:
            if not Rol.query.filter_by(nombre=r['nombre']).first():
                db.session.add(Rol(**r))

        # Admin user
        if not Usuario.query.filter_by(usuario='admin_gerencia').first():
            rol = Rol.query.filter_by(nombre='gerencia').first()
            db.session.add(Usuario(
                nombre='Administrador Gerencia',
                email='admin@appdistricon.com',
                usuario='admin_gerencia',
                password=bcrypt.hashpw('Gerencia2024'.encode(), bcrypt.gensalt()).decode(),
                activo=1, nivelAcceso=0, rolId=rol.id if rol else None,
            ))

        # Demo user
        if not Usuario.query.filter_by(usuario='admin').first():
            db.session.add(Usuario(
                nombre='Admin Demo',
                email='admin@demo.com',
                usuario='admin',
                password=bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode(),
                activo=1, nivelAcceso=5,
            ))

        # Gases
        gases = [
            {'codigo': 'ARG', 'nombre': 'Argón 5.0', 'presionBar': 150, 'colorHex': '#00FF00', 'categoria': 'INERTE', 'peligro': 'BAJO'},
            {'codigo': 'OXI', 'nombre': 'Oxígeno 10L', 'presionBar': 200, 'colorHex': '#0000FF', 'categoria': 'COMBURENTE', 'peligro': 'MEDIO'},
            {'codigo': 'ACE', 'nombre': 'Acetileno 3kg', 'presionBar': 250, 'colorHex': '#FF0000', 'categoria': 'INFLAMABLE', 'peligro': 'ALTO'},
            {'codigo': 'CO2', 'nombre': 'CO2 20L', 'presionBar': 60, 'colorHex': '#808080', 'categoria': 'INERTE', 'peligro': 'BAJO'},
            {'codigo': 'NIT', 'nombre': 'Nitrógeno 10L', 'presionBar': 200, 'colorHex': '#00FFFF', 'categoria': 'INERTE', 'peligro': 'BAJO'},
            {'codigo': 'HE', 'nombre': 'Helio 10L', 'presionBar': 200, 'colorHex': '#FF69B4', 'categoria': 'INERTE', 'peligro': 'BAJO'},
            {'codigo': 'HID', 'nombre': 'Hidrógeno 50L', 'presionBar': 300, 'colorHex': '#FFFFFF', 'categoria': 'INFLAMABLE', 'peligro': 'ALTO'},
            {'codigo': 'PRO', 'nombre': 'Propano 10kg', 'presionBar': 15, 'colorHex': '#FFA500', 'categoria': 'INFLAMABLE', 'peligro': 'ALTO'},
        ]
        for g in gases:
            if not Gas.query.filter_by(codigo=g['codigo']).first():
                gas = Gas(**g)
                db.session.add(gas)
                db.session.flush()
                db.session.add(StockGas(gasId=gas.id, llenos=50, vacios=10))

        # Tipos de operación de pedido
        tipos = [
            {'nombre': 'Compra', 'activo': 1, 'orden': 1},
            {'nombre': 'Alquiler', 'activo': 1, 'orden': 2},
            {'nombre': 'Recarga', 'activo': 1, 'orden': 3},
            {'nombre': 'Devolución', 'activo': 1, 'orden': 4},
            {'nombre': 'Mantenimiento', 'activo': 1, 'orden': 5},
            {'nombre': 'Venta', 'activo': 1, 'orden': 6},
            {'nombre': 'Cambio de gas', 'activo': 1, 'orden': 7},
        ]
        for t in tipos:
            if not TipoOperacionPedido.query.filter_by(nombre=t['nombre']).first():
                db.session.add(TipoOperacionPedido(**t))

        db.session.commit()
        print('✅ Seed completado exitosamente')

if __name__ == '__main__':
    seed()
