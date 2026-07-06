from models import (Factura, FacturaItem, Remito, RemitoItem, Ruta, RutaParada,
    RouteCache, SesionConductor, UbicacionGPS, TrafficHistory, RouteCalcLog,
    Geocerca, Cliente, Vehiculo, Usuario, Cylinder,
    ComprobanteHistorico, ComprobanteItemHistorico, CuentaCorrienteMovimiento,
    Pedido, PedidoLectura, PedidoLecturaItem, EventoTubo, IdentificadorTubo)
from models.base import db
from auth.decorators import login_required, require_role, optional_auth
from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import or_
import json

remitos_bp = Blueprint('remitos_bp', __name__)


@remitos_bp.route('/api/remitos', methods=['GET'])
@login_required
def list_remitos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cliente_id = request.args.get('clienteId', type=int)
    estado = request.args.get('estado', '').strip()

    query = Remito.query

    if cliente_id:
        query = query.filter(Remito.clienteId == cliente_id)
    if estado:
        query = query.filter(Remito.estado == estado)

    query = query.order_by(Remito.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@remitos_bp.route('/api/remitos', methods=['POST'])
@login_required
def create_remito():
    data = request.get_json() or {}
    cliente_id = data.get('clienteId')
    numero = data.get('numero', '').strip()

    if not cliente_id or not numero:
        return jsonify({'error': 'clienteId y numero son requeridos'}), 400

    if not Cliente.query.get(cliente_id):
        return jsonify({'error': 'Cliente no encontrado'}), 404

    if Remito.query.filter_by(numero=numero).first():
        return jsonify({'error': 'Ya existe un remito con ese número'}), 409

    remito = Remito(
        numero=numero,
        clienteId=cliente_id,
        fecha=_parse_dt(data.get('fecha')) or datetime.utcnow(),
        tipo=data.get('tipo', ''),
        estado=data.get('estado', 'pendiente'),
        observaciones=data.get('observaciones', ''),
    )
    db.session.add(remito)
    db.session.flush()

    for item_data in (data.get('items') or []):
        item = RemitoItem(
            remitoId=remito.id,
            cylinderId=item_data.get('cylinderId', type=int),
            numeroSerie=item_data.get('numeroSerie', ''),
            gasCodigo=item_data.get('gasCodigo', ''),
            tipoOperacion=item_data.get('tipoOperacion', ''),
            cantidad=item_data.get('cantidad', 1, type=int),
            precioUnitario=item_data.get('precioUnitario', 0, type=float),
        )
        db.session.add(item)

    db.session.commit()
    return jsonify({'data': remito.to_dict()}), 201


@remitos_bp.route('/api/remitos/<int:id>', methods=['GET'])
@login_required
def get_remito(id):
    remito = Remito.query.get_or_404(id)
    result = remito.to_dict()
    result['items'] = [i.to_dict() for i in remito.items.all()]
    return jsonify({'data': result})


@remitos_bp.route('/api/remitos/<int:id>', methods=['PUT'])
@login_required
def update_remito(id):
    remito = Remito.query.get_or_404(id)
    data = request.get_json() or {}

    if 'numero' in data:
        val = data['numero'].strip()
        if not val:
            return jsonify({'error': 'El número no puede estar vacío'}), 400
        existing = Remito.query.filter(Remito.numero == val, Remito.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro remito con ese número'}), 409
        remito.numero = val

    if 'clienteId' in data:
        if not Cliente.query.get(data['clienteId']):
            return jsonify({'error': 'Cliente no encontrado'}), 404
        remito.clienteId = data['clienteId']

    for field in ('tipo', 'estado', 'observaciones'):
        if field in data:
            setattr(remito, field, data[field])

    if 'fecha' in data:
        remito.fecha = _parse_dt(data['fecha'])

    if 'items' in data:
        RemitoItem.query.filter_by(remitoId=id).delete()
        db.session.flush()
        for item_data in data['items']:
            item = RemitoItem(
                remitoId=id,
                cylinderId=item_data.get('cylinderId', type=int),
                numeroSerie=item_data.get('numeroSerie', ''),
                gasCodigo=item_data.get('gasCodigo', ''),
                tipoOperacion=item_data.get('tipoOperacion', ''),
                cantidad=item_data.get('cantidad', 1, type=int),
                precioUnitario=item_data.get('precioUnitario', 0, type=float),
            )
            db.session.add(item)

    db.session.commit()
    return jsonify({'data': remito.to_dict()})


@remitos_bp.route('/api/remitos/<int:id>', methods=['DELETE'])
@login_required
def delete_remito(id):
    remito = Remito.query.get_or_404(id)
    RemitoItem.query.filter_by(remitoId=id).delete()
    db.session.delete(remito)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
