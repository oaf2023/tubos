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

mobile_bp = Blueprint('mobile_bp', __name__)


# ─── Identificadores ────────────────────────────────────────────────────


@mobile_bp.route('/api/mobile/identificadores', methods=['GET'])
@login_required
def list_identificadores():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cylinder_id = request.args.get('cylinderId', type=int)
    tipo = request.args.get('tipo', '').strip()

    query = IdentificadorTubo.query

    if cylinder_id:
        query = query.filter(IdentificadorTubo.cylinderId == cylinder_id)
    if tipo:
        query = query.filter(IdentificadorTubo.tipo == tipo)

    query = query.order_by(IdentificadorTubo.id.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [i.to_dict() for i in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@mobile_bp.route('/api/mobile/identificadores', methods=['POST'])
@login_required
def create_identificador():
    data = request.get_json() or {}
    valor = data.get('valor', '').strip()
    tipo = data.get('tipo', '').strip()

    if not valor or not tipo:
        return jsonify({'error': 'valor y tipo son requeridos'}), 400

    if IdentificadorTubo.query.filter_by(valor=valor).first():
        return jsonify({'error': 'Ya existe un identificador con ese valor'}), 409

    if data.get('cylinderId') and not Cylinder.query.get(data['cylinderId']):
        return jsonify({'error': 'Cilindro no encontrado'}), 404

    identificador = IdentificadorTubo(
        cylinderId=data.get('cylinderId', type=int),
        tipo=tipo,
        valor=valor,
    )
    db.session.add(identificador)
    db.session.commit()
    return jsonify({'data': identificador.to_dict()}), 201


@mobile_bp.route('/api/mobile/identificadores/<int:id>', methods=['PUT'])
@login_required
def update_identificador(id):
    identificador = IdentificadorTubo.query.get_or_404(id)
    data = request.get_json() or {}

    if 'valor' in data:
        val = data['valor'].strip()
        if not val:
            return jsonify({'error': 'El valor no puede estar vacío'}), 400
        existing = IdentificadorTubo.query.filter(
            IdentificadorTubo.valor == val, IdentificadorTubo.id != id
        ).first()
        if existing:
            return jsonify({'error': 'Ya existe otro identificador con ese valor'}), 409
        identificador.valor = val

    if 'tipo' in data:
        identificador.tipo = data['tipo']

    if 'cylinderId' in data:
        if data['cylinderId'] and not Cylinder.query.get(data['cylinderId']):
            return jsonify({'error': 'Cilindro no encontrado'}), 404
        identificador.cylinderId = data['cylinderId']

    db.session.commit()
    return jsonify({'data': identificador.to_dict()})


@mobile_bp.route('/api/mobile/identificadores/<int:id>', methods=['DELETE'])
@login_required
def delete_identificador(id):
    identificador = IdentificadorTubo.query.get_or_404(id)
    db.session.delete(identificador)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── Resolve tag ────────────────────────────────────────────────────────


@mobile_bp.route('/api/mobile/resolve-tag', methods=['POST'])
@login_required
def resolve_tag():
    data = request.get_json() or {}
    tag = data.get('tag', '').strip()
    tid = data.get('tid', '').strip()

    identifier_value = tag or tid
    if not identifier_value:
        return jsonify({'error': 'tag o tid es requerido'}), 400

    identificador = IdentificadorTubo.query.filter_by(valor=identifier_value).first()
    if identificador:
        cylinder = Cylinder.query.get(identificador.cylinderId)
        if cylinder:
            result = cylinder.to_dict()
            result['identificador'] = identificador.to_dict()
            gas = cylinder.gas
            if gas:
                result['gas'] = gas.to_dict()
            cliente = cylinder.cliente
            if cliente:
                result['cliente'] = cliente.to_dict()
            return jsonify({'data': result})

    from models import TagRFID
    tag_rfid = TagRFID.query.filter_by(tid=identifier_value).first()
    if tag_rfid:
        cylinder = Cylinder.query.get(tag_rfid.cylinderId)
        if cylinder:
            result = cylinder.to_dict()
            result['tag_rfid'] = tag_rfid.to_dict()
            gas = cylinder.gas
            if gas:
                result['gas'] = gas.to_dict()
            cliente = cylinder.cliente
            if cliente:
                result['cliente'] = cliente.to_dict()
            return jsonify({'data': result})

    return jsonify({'error': 'Tag no encontrado'}), 404


# ─── Tube events ────────────────────────────────────────────────────────


@mobile_bp.route('/api/mobile/tubes/<tubeId>/event', methods=['POST'])
@login_required
def tube_event(tubeId):
    data = request.get_json() or {}

    cylinder = Cylinder.query.filter_by(numeroSerie=tubeId).first()
    if not cylinder:
        return jsonify({'error': 'Cilindro no encontrado'}), 404

    evento = EventoTubo(
        cylinderId=cylinder.id,
        origen=data.get('origen', 'mobile'),
        accion=data.get('accion', ''),
        usuarioId=data.get('usuarioId', type=int),
        clienteId=data.get('clienteId', type=int),
        latitud=data.get('lat', type=float),
        longitud=data.get('lng', type=float),
        fotoUrl=data.get('fotoUrl', ''),
    )
    db.session.add(evento)
    db.session.commit()
    return jsonify({'data': evento.to_dict()}), 201


@mobile_bp.route('/api/mobile/tubes/<tubeId>/quick-view', methods=['POST'])
@login_required
def tube_quick_view(tubeId):
    cylinder = Cylinder.query.filter_by(numeroSerie=tubeId).first()
    if not cylinder:
        return jsonify({'error': 'Cilindro no encontrado'}), 404

    result = cylinder.to_dict()
    if cylinder.gas:
        result['gas'] = cylinder.gas.to_dict()
    if cylinder.cliente:
        result['cliente'] = cylinder.cliente.to_dict()

    identificadores = IdentificadorTubo.query.filter_by(cylinderId=cylinder.id).all()
    result['identificadores'] = [i.to_dict() for i in identificadores]

    ultimo_evento = EventoTubo.query.filter_by(cylinderId=cylinder.id).order_by(EventoTubo.fechaHora.desc()).first()
    result['ultimoEvento'] = ultimo_evento.to_dict() if ultimo_evento else None

    return jsonify({'data': result})


# ─── Pedidos pendientes entrega ─────────────────────────────────────────
# Re-exported here for mobile convenience; endpoint also exists in pedidos.py.


@mobile_bp.route('/api/pedidos/pendientes-entrega', methods=['GET'])
@login_required
def pedidos_pendientes_entrega():
    pedidos = Pedido.query.filter_by(estado='pendiente').order_by(Pedido.fecha.asc()).all()
    return jsonify({'data': [p.to_dict() for p in pedidos]})
