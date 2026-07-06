from flask import Blueprint, request, jsonify
from models import Gas
from models.base import db
from auth.decorators import login_required, require_role, optional_auth

gases_bp = Blueprint('gases_bp', __name__)


@gases_bp.route('/api/gases', methods=['GET'])
@login_required
def list_gases():
    gases = Gas.query.order_by(Gas.nombre.asc()).all()
    return jsonify({'data': [g.to_dict() for g in gases]})


@gases_bp.route('/api/gases', methods=['POST'])
@login_required
def create_gas():
    data = request.get_json() or {}
    codigo = data.get('codigo', '').strip()
    nombre = data.get('nombre', '').strip()

    if not codigo or not nombre:
        return jsonify({'error': 'codigo y nombre son requeridos'}), 400

    if Gas.query.filter_by(codigo=codigo).first():
        return jsonify({'error': 'Ya existe un gas con ese código'}), 409

    gas = Gas(
        codigo=codigo,
        nombre=nombre,
        presionBar=data.get('presionBar', type=float),
        colorHex=data.get('colorHex', '').strip() or None,
        categoria=data.get('categoria', '').strip() or None,
        peligro=data.get('peligro', '').strip() or None,
        precioAlquilerDiario=data.get('precioAlquilerDiario', 0, type=float),
        precioAlquilerMensual=data.get('precioAlquilerMensual', 0, type=float),
        precioVenta=data.get('precioVenta', 0, type=float),
    )
    db.session.add(gas)
    db.session.commit()
    return jsonify({'data': gas.to_dict()}), 201


@gases_bp.route('/api/gases/<int:id>', methods=['GET'])
@login_required
def get_gas(id):
    gas = Gas.query.get_or_404(id)
    return jsonify({'data': gas.to_dict()})


@gases_bp.route('/api/gases/<int:id>', methods=['PUT'])
@login_required
def update_gas(id):
    gas = Gas.query.get_or_404(id)
    data = request.get_json() or {}

    if 'codigo' in data:
        val = data['codigo'].strip()
        if not val:
            return jsonify({'error': 'El código no puede estar vacío'}), 400
        existing = Gas.query.filter(Gas.codigo == val, Gas.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro gas con ese código'}), 409
        gas.codigo = val

    if 'nombre' in data:
        val = data['nombre'].strip()
        if not val:
            return jsonify({'error': 'El nombre no puede estar vacío'}), 400
        gas.nombre = val

    for field in ('presionBar', 'precioAlquilerDiario', 'precioAlquilerMensual', 'precioVenta'):
        if field in data:
            setattr(gas, field, data[field] or 0)

    for field in ('colorHex', 'categoria', 'peligro'):
        if field in data:
            setattr(gas, field, (data[field] or '').strip() or None)

    db.session.commit()
    return jsonify({'data': gas.to_dict()})


@gases_bp.route('/api/gases/<int:id>', methods=['DELETE'])
@login_required
def delete_gas(id):
    gas = Gas.query.get_or_404(id)
    db.session.delete(gas)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})
