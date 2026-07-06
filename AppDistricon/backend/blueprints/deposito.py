from models import (Vehiculo, CargaVehiculo, CargaVehiculoItem, MantenimientoVehiculo,
    DocumentoVehiculo, CargaCombustible, Cabina, SensorCabina, LecturaPeso, EvidenciaFoto,
    ValidacionCabina, ReglaPeso, EventoTrazabilidad, Alerta,
    ZonaLectura, LectorIoT, TagRFID, EventoRFID, SesionLecturaRFID, StockGas, MovimientoStock, Reparto,
    Factura, FacturaItem, Remito, RemitoItem, Ruta, RutaParada, RouteCache,
    SesionConductor, IdentificadorTubo, EventoTubo, PedidoLectura, PedidoLecturaItem,
    ComprobanteHistorico, ComprobanteItemHistorico, CuentaCorrienteMovimiento, UbicacionGPS,
    Cliente, Cylinder, AuditoriaSincronizacion, ConciliacionOperacion,
    MlOrder, MlOrderItem, MlShipment, MlClaimReturn, MlQuestion, MlItem,
    MpPayment, MpAccountMovement, MpReleaseReport, SellerAccount)
from models.base import db
from auth.decorators import login_required, require_role, optional_auth
from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import or_

deposito_bp = Blueprint('deposito_bp', __name__)


@deposito_bp.route('/api/deposito', methods=['GET'])
@deposito_bp.route('/api/deposito/zonas', methods=['GET'])
@login_required
def list_zonas():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = ZonaLectura.query.order_by(ZonaLectura.codigo.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [z.to_dict() for z in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@deposito_bp.route('/api/deposito', methods=['POST'])
@deposito_bp.route('/api/deposito/zonas', methods=['POST'])
@login_required
def create_zona():
    data = request.get_json() or {}
    codigo = data.get('codigo', '').strip()

    if not codigo:
        return jsonify({'error': 'codigo es requerido'}), 400

    if ZonaLectura.query.filter_by(codigo=codigo).first():
        return jsonify({'error': 'Ya existe una zona con ese código'}), 409

    zona = ZonaLectura(
        codigo=codigo,
        nombre=data.get('nombre', '').strip() or None,
        tipo=data.get('tipo', '').strip() or None,
    )
    db.session.add(zona)
    db.session.commit()
    return jsonify({'data': zona.to_dict()}), 201


@deposito_bp.route('/api/deposito/zonas/<int:id>', methods=['GET'])
@login_required
def get_zona(id):
    zona = ZonaLectura.query.get_or_404(id)
    result = zona.to_dict()
    result['lectores'] = [l.to_dict() for l in zona.lectores.all()]
    return jsonify({'data': result})


@deposito_bp.route('/api/deposito/zonas/<int:id>', methods=['PUT'])
@login_required
def update_zona(id):
    zona = ZonaLectura.query.get_or_404(id)
    data = request.get_json() or {}

    if 'codigo' in data:
        val = data['codigo'].strip()
        if not val:
            return jsonify({'error': 'El código no puede estar vacío'}), 400
        existing = ZonaLectura.query.filter(ZonaLectura.codigo == val, ZonaLectura.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otra zona con ese código'}), 409
        zona.codigo = val

    for field in ('nombre', 'tipo'):
        if field in data:
            setattr(zona, field, (data[field] or '').strip() or None)

    db.session.commit()
    return jsonify({'data': zona.to_dict()})


@deposito_bp.route('/api/deposito/zonas/<int:id>', methods=['DELETE'])
@login_required
def delete_zona(id):
    zona = ZonaLectura.query.get_or_404(id)
    db.session.delete(zona)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


@deposito_bp.route('/api/deposito/lectores', methods=['GET'])
@login_required
def list_lectores():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    zona_id = request.args.get('zonaId', type=int)

    query = LectorIoT.query
    if zona_id:
        query = query.filter(LectorIoT.zonaLecturaId == zona_id)

    query = query.order_by(LectorIoT.codigo.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [l.to_dict() for l in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@deposito_bp.route('/api/deposito/lectores', methods=['POST'])
@login_required
def create_lector():
    data = request.get_json() or {}
    codigo = data.get('codigo', '').strip()

    if not codigo:
        return jsonify({'error': 'codigo es requerido'}), 400

    if LectorIoT.query.filter_by(codigo=codigo).first():
        return jsonify({'error': 'Ya existe un lector con ese código'}), 409

    if data.get('zonaLecturaId') and not ZonaLectura.query.get(data['zonaLecturaId']):
        return jsonify({'error': 'Zona no encontrada'}), 404

    lector = LectorIoT(
        codigo=codigo,
        nombre=data.get('nombre', '').strip() or None,
        tipo=data.get('tipo', '').strip() or None,
        ip=data.get('ip', '').strip() or None,
        zonaLecturaId=data.get('zonaLecturaId'),
    )
    db.session.add(lector)
    db.session.commit()
    return jsonify({'data': lector.to_dict()}), 201


@deposito_bp.route('/api/deposito/lectores/<int:id>', methods=['GET'])
@login_required
def get_lector(id):
    lector = LectorIoT.query.get_or_404(id)
    return jsonify({'data': lector.to_dict()})


@deposito_bp.route('/api/deposito/lectores/<int:id>', methods=['PUT'])
@login_required
def update_lector(id):
    lector = LectorIoT.query.get_or_404(id)
    data = request.get_json() or {}

    if 'codigo' in data:
        val = data['codigo'].strip()
        if not val:
            return jsonify({'error': 'El código no puede estar vacío'}), 400
        existing = LectorIoT.query.filter(LectorIoT.codigo == val, LectorIoT.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro lector con ese código'}), 409
        lector.codigo = val

    for field in ('nombre', 'tipo', 'ip'):
        if field in data:
            setattr(lector, field, (data[field] or '').strip() or None)

    if 'zonaLecturaId' in data:
        if data['zonaLecturaId'] and not ZonaLectura.query.get(data['zonaLecturaId']):
            return jsonify({'error': 'Zona no encontrada'}), 404
        lector.zonaLecturaId = data['zonaLecturaId']

    db.session.commit()
    return jsonify({'data': lector.to_dict()})


@deposito_bp.route('/api/deposito/lectores/<int:id>', methods=['DELETE'])
@login_required
def delete_lector(id):
    lector = LectorIoT.query.get_or_404(id)
    db.session.delete(lector)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


@deposito_bp.route('/api/deposito/tags', methods=['GET'])
@login_required
def list_tags():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cylinder_id = request.args.get('cylinderId', type=int)
    search = request.args.get('search', '').strip()

    query = TagRFID.query
    if cylinder_id:
        query = query.filter(TagRFID.cylinderId == cylinder_id)
    if search:
        query = query.filter(TagRFID.tid.ilike(f'%{search}%'))

    query = query.order_by(TagRFID.tid.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [t.to_dict() for t in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@deposito_bp.route('/api/deposito/tags', methods=['POST'])
@login_required
def create_tag():
    data = request.get_json() or {}
    tid = data.get('tid', '').strip()

    if not tid:
        return jsonify({'error': 'tid es requerido'}), 400

    if TagRFID.query.filter_by(tid=tid).first():
        return jsonify({'error': 'Ya existe un tag con ese TID'}), 409

    if data.get('cylinderId') and not Cylinder.query.get(data['cylinderId']):
        return jsonify({'error': 'Cilindro no encontrado'}), 404

    tag = TagRFID(
        tid=tid,
        cylinderId=data.get('cylinderId'),
    )
    db.session.add(tag)
    db.session.commit()
    return jsonify({'data': tag.to_dict()}), 201


@deposito_bp.route('/api/deposito/tags/<int:id>', methods=['GET'])
@login_required
def get_tag(id):
    tag = TagRFID.query.get_or_404(id)
    return jsonify({'data': tag.to_dict()})


@deposito_bp.route('/api/deposito/tags/<int:id>', methods=['PUT'])
@login_required
def update_tag(id):
    tag = TagRFID.query.get_or_404(id)
    data = request.get_json() or {}

    if 'tid' in data:
        val = data['tid'].strip()
        if not val:
            return jsonify({'error': 'El TID no puede estar vacío'}), 400
        existing = TagRFID.query.filter(TagRFID.tid == val, TagRFID.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro tag con ese TID'}), 409
        tag.tid = val

    if 'cylinderId' in data:
        if data['cylinderId'] and not Cylinder.query.get(data['cylinderId']):
            return jsonify({'error': 'Cilindro no encontrado'}), 404
        tag.cylinderId = data['cylinderId']

    db.session.commit()
    return jsonify({'data': tag.to_dict()})


@deposito_bp.route('/api/deposito/tags/<int:id>', methods=['DELETE'])
@login_required
def delete_tag(id):
    tag = TagRFID.query.get_or_404(id)
    db.session.delete(tag)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


@deposito_bp.route('/api/deposito/stock', methods=['GET'])
@login_required
def list_stock():
    stock = StockGas.query.all()
    return jsonify({'data': [s.to_dict() for s in stock]})


@deposito_bp.route('/api/deposito/movimientos', methods=['GET'])
@login_required
def list_movimientos_stock():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    gas_id = request.args.get('gasId', type=int)
    tipo = request.args.get('tipo', '').strip()

    query = MovimientoStock.query
    if gas_id:
        query = query.filter(MovimientoStock.gasId == gas_id)
    if tipo:
        query = query.filter(MovimientoStock.tipo == tipo)

    query = query.order_by(MovimientoStock.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [m.to_dict() for m in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@deposito_bp.route('/api/deposito/resumen', methods=['GET'])
@login_required
def resumen_deposito():
    zonas_count = ZonaLectura.query.count()
    lectores_count = LectorIoT.query.count()
    tags_count = TagRFID.query.count()
    stock = StockGas.query.all()

    llenos = sum(s.llenos or 0 for s in stock)
    vacios = sum(s.vacios or 0 for s in stock)

    return jsonify({
        'data': {
            'zonas': zonas_count,
            'lectores': lectores_count,
            'tags': tags_count,
            'stock_total': llenos + vacios,
            'llenos': llenos,
            'vacios': vacios,
            'stock_por_gas': [s.to_dict() for s in stock],
        }
    })


@deposito_bp.route('/api/deposito/repartos', methods=['GET'])
@login_required
def list_repartos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    estado = request.args.get('estado', '').strip()
    cliente_id = request.args.get('clienteId', type=int)

    query = Reparto.query
    if estado:
        query = query.filter(Reparto.estado == estado)
    if cliente_id:
        query = query.filter(Reparto.clienteId == cliente_id)

    query = query.order_by(Reparto.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@deposito_bp.route('/api/deposito/repartos', methods=['POST'])
@login_required
def create_reparto():
    data = request.get_json() or {}
    codigo = data.get('codigo', '').strip()

    if not codigo:
        return jsonify({'error': 'codigo es requerido'}), 400

    if Reparto.query.filter_by(codigo=codigo).first():
        return jsonify({'error': 'Ya existe un reparto con ese código'}), 409

    if data.get('clienteId') and not Cliente.query.get(data['clienteId']):
        return jsonify({'error': 'Cliente no encontrado'}), 404

    reparto = Reparto(
        codigo=codigo,
        clienteId=data.get('clienteId'),
        estado=data.get('estado', 'pendiente'),
    )
    db.session.add(reparto)
    db.session.commit()
    return jsonify({'data': reparto.to_dict()}), 201


@deposito_bp.route('/api/deposito/eventos', methods=['GET'])
@login_required
def list_eventos_rfid():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    zona_id = request.args.get('zonaId', type=int)
    lector_id = request.args.get('lectorId', type=int)
    tid = request.args.get('tid', '').strip()

    query = EventoRFID.query
    if zona_id:
        query = query.filter(EventoRFID.zonaId == zona_id)
    if lector_id:
        query = query.filter(EventoRFID.lectorId == lector_id)
    if tid:
        query = query.filter(EventoRFID.tid == tid)

    query = query.order_by(EventoRFID.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [e.to_dict() for e in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })
