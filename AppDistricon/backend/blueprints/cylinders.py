from flask import Blueprint, request, jsonify
from models import Cylinder, CylinderMovimiento, Mantenimiento, EventoTubo, Cliente, Gas
from models.base import db
from auth.decorators import login_required, require_role, optional_auth
from datetime import datetime

cylinders_bp = Blueprint('cylinders_bp', __name__)


@cylinders_bp.route('/api/cylinders', methods=['GET'])
@login_required
def list_cylinders():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    estado = request.args.get('estado', '').strip()
    gas_id = request.args.get('gasId', type=int)
    cliente_id = request.args.get('clienteId', type=int)
    search = request.args.get('search', '').strip()

    query = Cylinder.query

    if estado:
        query = query.filter(Cylinder.estado == estado)
    if gas_id:
        query = query.filter(Cylinder.gasId == gas_id)
    if cliente_id:
        query = query.filter(Cylinder.clienteId == cliente_id)
    if search:
        query = query.filter(Cylinder.numeroSerie.ilike(f'%{search}%'))

    query = query.order_by(Cylinder.id.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@cylinders_bp.route('/api/cylinders', methods=['POST'])
@login_required
def create_cylinder():
    data = request.get_json() or {}
    numero_serie = data.get('numeroSerie', '').strip()

    if not numero_serie:
        return jsonify({'error': 'numeroSerie es requerido'}), 400

    if Cylinder.query.filter_by(numeroSerie=numero_serie).first():
        return jsonify({'error': 'Ya existe un cilindro con ese número de serie'}), 409

    if data.get('clienteId') and not Cliente.query.get(data['clienteId']):
        return jsonify({'error': 'Cliente no encontrado'}), 404
    if data.get('gasId') and not Gas.query.get(data['gasId']):
        return jsonify({'error': 'Gas no encontrado'}), 404

    cylinder = Cylinder(
        numeroSerie=numero_serie,
        propietario=data.get('propietario', '').strip() or None,
        fabricante=data.get('fabricante', '').strip() or None,
        presionTrabajoBar=data.get('presionTrabajoBar', type=float),
        capacidadLitros=data.get('capacidadLitros', type=float),
        pesoTaraKg=data.get('pesoTaraKg', type=float),
        pesoMaxLlenadoKg=data.get('pesoMaxLlenadoKg', type=float),
        presionEnsayoBar=data.get('presionEnsayoBar', type=float),
        fechaFabricacion=_parse_dt(data.get('fechaFabricacion')),
        fechaProximoRetest=_parse_dt(data.get('fechaProximoRetest')),
        gasId=data.get('gasId'),
        clienteId=data.get('clienteId'),
        estado=data.get('estado', 'disponible'),
        ubicacionLat=data.get('ubicacionLat', type=float),
        ubicacionLng=data.get('ubicacionLng', type=float),
        compatibleH2=data.get('compatibleH2', 0),
    )
    db.session.add(cylinder)
    db.session.commit()
    return jsonify({'data': cylinder.to_dict()}), 201


@cylinders_bp.route('/api/cylinders/<int:id>', methods=['GET'])
@login_required
def get_cylinder(id):
    cylinder = Cylinder.query.get_or_404(id)
    result = cylinder.to_dict()
    result['movimientos'] = [m.to_dict() for m in cylinder.movimientos.order_by(CylinderMovimiento.fecha.desc()).limit(20).all()]
    result['mantenimientos'] = [m.to_dict() for m in cylinder.mantenimientos.order_by(Mantenimiento.fecha.desc()).limit(20).all()]
    result['tags'] = [t.to_dict() for t in cylinder.tags_rfid.all()]
    return jsonify({'data': result})


@cylinders_bp.route('/api/cylinders/<int:id>', methods=['PUT'])
@login_required
def update_cylinder(id):
    cylinder = Cylinder.query.get_or_404(id)
    data = request.get_json() or {}

    if 'numeroSerie' in data:
        val = data['numeroSerie'].strip()
        if not val:
            return jsonify({'error': 'El número de serie no puede estar vacío'}), 400
        existing = Cylinder.query.filter(Cylinder.numeroSerie == val, Cylinder.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro cilindro con ese número de serie'}), 409
        cylinder.numeroSerie = val

    if 'clienteId' in data and data['clienteId'] is not None:
        if not Cliente.query.get(data['clienteId']):
            return jsonify({'error': 'Cliente no encontrado'}), 404
        cylinder.clienteId = data['clienteId']
    elif 'clienteId' in data:
        cylinder.clienteId = None

    if 'gasId' in data and data['gasId'] is not None:
        if not Gas.query.get(data['gasId']):
            return jsonify({'error': 'Gas no encontrado'}), 404
        cylinder.gasId = data['gasId']
    elif 'gasId' in data:
        cylinder.gasId = None

    for field in ('propietario', 'fabricante', 'estado'):
        if field in data:
            setattr(cylinder, field, (data[field] or '').strip() or None)

    for field in ('presionTrabajoBar', 'capacidadLitros', 'pesoTaraKg',
                  'pesoMaxLlenadoKg', 'presionEnsayoBar', 'ubicacionLat', 'ubicacionLng'):
        if field in data:
            setattr(cylinder, field, data[field])

    if 'compatibleH2' in data:
        cylinder.compatibleH2 = data['compatibleH2']

    if 'fechaFabricacion' in data:
        cylinder.fechaFabricacion = _parse_dt(data['fechaFabricacion'])
    if 'fechaProximoRetest' in data:
        cylinder.fechaProximoRetest = _parse_dt(data['fechaProximoRetest'])

    db.session.commit()
    return jsonify({'data': cylinder.to_dict()})


@cylinders_bp.route('/api/cylinders/<int:id>', methods=['DELETE'])
@login_required
def delete_cylinder(id):
    cylinder = Cylinder.query.get_or_404(id)
    db.session.delete(cylinder)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── Movimientos ─────────────────────────────────────────────────────


@cylinders_bp.route('/api/cylinders/<int:id>/movimientos', methods=['GET'])
@login_required
def list_movimientos(id):
    cylinder = Cylinder.query.get_or_404(id)
    movimientos = cylinder.movimientos.order_by(CylinderMovimiento.fecha.desc()).all()
    return jsonify({'data': [m.to_dict() for m in movimientos]})


@cylinders_bp.route('/api/cylinders/<int:id>/movimientos', methods=['POST'])
@login_required
def create_movimiento(id):
    cylinder = Cylinder.query.get_or_404(id)
    data = request.get_json() or {}

    movimiento = CylinderMovimiento(
        cylinderId=id,
        tipo=data.get('tipo', ''),
        descripcion=data.get('descripcion', ''),
        usuario=data.get('usuario', ''),
        latOrigen=data.get('latOrigen', type=float),
        lngOrigen=data.get('lngOrigen', type=float),
        latDestino=data.get('latDestino', type=float),
        lngDestino=data.get('lngDestino', type=float),
        fecha=_parse_dt(data.get('fecha')) or datetime.utcnow(),
    )
    db.session.add(movimiento)
    cylinder.ultimoMovimientoId = movimiento.id
    db.session.commit()
    return jsonify({'data': movimiento.to_dict()}), 201


# ─── Mantenimientos ──────────────────────────────────────────────────


@cylinders_bp.route('/api/cylinders/<int:id>/mantenimiento', methods=['GET'])
@login_required
def list_mantenimientos(id):
    cylinder = Cylinder.query.get_or_404(id)
    mantenimientos = cylinder.mantenimientos.order_by(Mantenimiento.fecha.desc()).all()
    return jsonify({'data': [m.to_dict() for m in mantenimientos]})


@cylinders_bp.route('/api/cylinders/<int:id>/mantenimiento', methods=['POST'])
@login_required
def create_mantenimiento(id):
    cylinder = Cylinder.query.get_or_404(id)
    data = request.get_json() or {}

    mantenimiento = Mantenimiento(
        cylinderId=id,
        tipo=data.get('tipo', ''),
        descripcion=data.get('descripcion', ''),
        tecnico=data.get('tecnico', ''),
        costo=data.get('costo', 0, type=float),
    )
    db.session.add(mantenimiento)
    db.session.commit()
    return jsonify({'data': mantenimiento.to_dict()}), 201


# ─── Historial ───────────────────────────────────────────────────────


@cylinders_bp.route('/api/cylinders/<int:id>/historial', methods=['GET'])
@login_required
def list_historial(id):
    cylinder = Cylinder.query.get_or_404(id)

    movimientos = cylinder.movimientos.order_by(CylinderMovimiento.fecha.desc()).all()
    mantenimientos = cylinder.mantenimientos.order_by(Mantenimiento.fecha.desc()).all()
    eventos = cylinder.eventos_tubo.order_by(EventoTubo.fechaHora.desc()).all()

    events = []
    for m in movimientos:
        d = m.to_dict()
        d['tipoEvento'] = 'movimiento'
        events.append(d)
    for m in mantenimientos:
        d = m.to_dict()
        d['tipoEvento'] = 'mantenimiento'
        events.append(d)
    for e in eventos:
        d = e.to_dict()
        d['tipoEvento'] = 'evento_tubo'
        events.append(d)

    events.sort(key=lambda x: x.get('fecha') or x.get('fechaHora') or '', reverse=True)

    return jsonify({'data': events})


# ─── Graph (mock) ────────────────────────────────────────────────────


@cylinders_bp.route('/api/cylinders/<int:id>/graph', methods=['GET'])
@login_required
def cylinder_graph(id):
    cylinder = Cylinder.query.get_or_404(id)

    movimientos = cylinder.movimientos.order_by(CylinderMovimiento.fecha.asc()).all()

    nodes = [{'id': f'cyl-{cylinder.id}', 'label': cylinder.numeroSerie, 'type': 'cylinder'}]
    edges = []

    for m in movimientos:
        node_id = f'mov-{m.id}'
        nodes.append({
            'id': node_id,
            'label': f'{m.tipo}: {m.descripcion or ""}',
            'type': 'movimiento',
            'fecha': m.fecha.isoformat() if m.fecha else None,
        })
        edges.append({
            'source': f'cyl-{cylinder.id}',
            'target': node_id,
            'label': m.tipo,
        })

    return jsonify({'data': {'nodes': nodes, 'edges': edges}})


# ─── Helpers ──────────────────────────────────────────────────────────


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
