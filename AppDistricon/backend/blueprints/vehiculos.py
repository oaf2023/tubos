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

vehiculos_bp = Blueprint('vehiculos_bp', __name__)


@vehiculos_bp.route('/api/vehiculos', methods=['GET'])
@login_required
def list_vehiculos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()
    estado = request.args.get('estado', '').strip()

    query = Vehiculo.query

    if estado:
        query = query.filter(Vehiculo.estado == estado)
    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                Vehiculo.patente.ilike(like),
                Vehiculo.codigo.ilike(like),
                Vehiculo.marca.ilike(like),
                Vehiculo.modelo.ilike(like),
            )
        )

    query = query.order_by(Vehiculo.codigo.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [v.to_dict() for v in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@vehiculos_bp.route('/api/vehiculos', methods=['POST'])
@login_required
def create_vehiculo():
    data = request.get_json() or {}
    codigo = data.get('codigo', '').strip()
    patente = data.get('patente', '').strip()

    if not codigo or not patente:
        return jsonify({'error': 'codigo y patente son requeridos'}), 400

    if Vehiculo.query.filter_by(codigo=codigo).first():
        return jsonify({'error': 'Ya existe un vehículo con ese código'}), 409
    if Vehiculo.query.filter_by(patente=patente).first():
        return jsonify({'error': 'Ya existe un vehículo con esa patente'}), 409

    vehiculo = Vehiculo(
        codigo=codigo,
        patente=patente,
        marca=data.get('marca', '').strip() or None,
        modelo=data.get('modelo', '').strip() or None,
        anio=data.get('anio', type=int),
        tipo=data.get('tipo', '').strip() or None,
        combustible=data.get('combustible', '').strip() or None,
        kmActual=data.get('kmActual', 0, type=int),
        estado=data.get('estado', 'disponible'),
        largoCajaCm=data.get('largoCajaCm', type=float),
        maxTubos=data.get('maxTubos', type=int),
        orientacionTubos=data.get('orientacionTubos', '').strip() or None,
    )
    db.session.add(vehiculo)
    db.session.commit()
    return jsonify({'data': vehiculo.to_dict()}), 201


@vehiculos_bp.route('/api/vehiculos/<int:id>', methods=['GET'])
@login_required
def get_vehiculo(id):
    vehiculo = Vehiculo.query.get_or_404(id)
    result = vehiculo.to_dict()
    result['_counts'] = {
        'cargas': vehiculo.cargas_combustible.count(),
        'cargas_tubos': vehiculo.cargas.count(),
        'mantenimientos': vehiculo.mantenimientos.count(),
        'documentos': vehiculo.documentos.count(),
    }
    return jsonify({'data': result})


@vehiculos_bp.route('/api/vehiculos/<int:id>', methods=['PUT'])
@login_required
def update_vehiculo(id):
    vehiculo = Vehiculo.query.get_or_404(id)
    data = request.get_json() or {}

    if 'codigo' in data:
        val = data['codigo'].strip()
        if not val:
            return jsonify({'error': 'El código no puede estar vacío'}), 400
        existing = Vehiculo.query.filter(Vehiculo.codigo == val, Vehiculo.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro vehículo con ese código'}), 409
        vehiculo.codigo = val

    if 'patente' in data:
        val = data['patente'].strip()
        if not val:
            return jsonify({'error': 'La patente no puede estar vacía'}), 400
        existing = Vehiculo.query.filter(Vehiculo.patente == val, Vehiculo.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro vehículo con esa patente'}), 409
        vehiculo.patente = val

    for field in ('marca', 'modelo', 'tipo', 'combustible', 'estado', 'orientacionTubos'):
        if field in data:
            setattr(vehiculo, field, (data[field] or '').strip() or None)

    for field in ('anio', 'kmActual', 'maxTubos'):
        if field in data:
            setattr(vehiculo, field, data[field])

    for field in ('largoCajaCm',):
        if field in data:
            setattr(vehiculo, field, data[field])

    db.session.commit()
    return jsonify({'data': vehiculo.to_dict()})


@vehiculos_bp.route('/api/vehiculos/<int:id>', methods=['DELETE'])
@login_required
def delete_vehiculo(id):
    vehiculo = Vehiculo.query.get_or_404(id)
    db.session.delete(vehiculo)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


@vehiculos_bp.route('/api/vehiculos/<int:id>/cargas', methods=['GET'])
@login_required
def list_cargas(id):
    Vehiculo.query.get_or_404(id)
    cargas = CargaCombustible.query.filter_by(vehiculoId=id).order_by(CargaCombustible.fecha.desc()).all()
    return jsonify({'data': [c.to_dict() for c in cargas]})


@vehiculos_bp.route('/api/vehiculos/<int:id>/cargas', methods=['POST'])
@login_required
def create_carga(id):
    Vehiculo.query.get_or_404(id)
    data = request.get_json() or {}

    carga = CargaCombustible(
        vehiculoId=id,
        litros=data.get('litros', type=float),
        costo=data.get('costo', type=float),
        kmActual=data.get('kmActual', type=int),
        fecha=_parse_dt(data.get('fecha')) or datetime.utcnow(),
    )
    db.session.add(carga)
    db.session.commit()
    return jsonify({'data': carga.to_dict()}), 201


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos', methods=['GET'])
@login_required
def list_carga_tubos(id):
    Vehiculo.query.get_or_404(id)
    cargas = CargaVehiculo.query.filter_by(vehiculoId=id).order_by(CargaVehiculo.fecha.desc()).all()
    return jsonify({'data': [c.to_dict() for c in cargas]})


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos', methods=['POST'])
@login_required
def create_carga_tubos(id):
    Vehiculo.query.get_or_404(id)
    data = request.get_json() or {}

    carga = CargaVehiculo(
        vehiculoId=id,
        estado=data.get('estado', 'activa'),
    )
    db.session.add(carga)
    db.session.commit()
    return jsonify({'data': carga.to_dict()}), 201


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos/<int:carga_id>', methods=['GET'])
@login_required
def get_carga_tubos(id, carga_id):
    Vehiculo.query.get_or_404(id)
    carga = CargaVehiculo.query.filter_by(id=carga_id, vehiculoId=id).first_or_404()
    result = carga.to_dict()
    result['items'] = [i.to_dict() for i in carga.items.order_by(CargaVehiculoItem.posicion.asc()).all()]
    return jsonify({'data': result})


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos/<int:carga_id>', methods=['PUT'])
@login_required
def update_carga_tubos(id, carga_id):
    Vehiculo.query.get_or_404(id)
    carga = CargaVehiculo.query.filter_by(id=carga_id, vehiculoId=id).first_or_404()
    data = request.get_json() or {}

    if 'estado' in data:
        carga.estado = data['estado']

    db.session.commit()
    return jsonify({'data': carga.to_dict()})


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos/<int:carga_id>/items', methods=['GET'])
@login_required
def list_carga_items(id, carga_id):
    Vehiculo.query.get_or_404(id)
    carga = CargaVehiculo.query.filter_by(id=carga_id, vehiculoId=id).first_or_404()
    items = carga.items.order_by(CargaVehiculoItem.posicion.asc()).all()
    return jsonify({'data': [i.to_dict() for i in items]})


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos/<int:carga_id>/items', methods=['POST'])
@login_required
def create_carga_item(id, carga_id):
    Vehiculo.query.get_or_404(id)
    carga = CargaVehiculo.query.filter_by(id=carga_id, vehiculoId=id).first_or_404()
    data = request.get_json() or {}

    cylinder_id = data.get('cylinderId')
    if not cylinder_id:
        return jsonify({'error': 'cylinderId es requerido'}), 400
    if not Cylinder.query.get(cylinder_id):
        return jsonify({'error': 'Cilindro no encontrado'}), 404

    item = CargaVehiculoItem(
        cargaId=carga.id,
        cylinderId=cylinder_id,
        posicion=data.get('posicion', type=int),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'data': item.to_dict()}), 201


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos/<int:carga_id>/items/<int:item_id>', methods=['PUT'])
@login_required
def update_carga_item(id, carga_id, item_id):
    Vehiculo.query.get_or_404(id)
    carga = CargaVehiculo.query.filter_by(id=carga_id, vehiculoId=id).first_or_404()
    item = CargaVehiculoItem.query.filter_by(id=item_id, cargaId=carga.id).first_or_404()
    data = request.get_json() or {}

    if 'posicion' in data:
        item.posicion = data['posicion']
    if 'cylinderId' in data:
        if not Cylinder.query.get(data['cylinderId']):
            return jsonify({'error': 'Cilindro no encontrado'}), 404
        item.cylinderId = data['cylinderId']

    db.session.commit()
    return jsonify({'data': item.to_dict()})


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos/<int:carga_id>/confirmar', methods=['POST'])
@login_required
def confirmar_carga(id, carga_id):
    Vehiculo.query.get_or_404(id)
    carga = CargaVehiculo.query.filter_by(id=carga_id, vehiculoId=id).first_or_404()
    carga.estado = 'confirmada'
    db.session.commit()
    return jsonify({'data': carga.to_dict()})


@vehiculos_bp.route('/api/vehiculos/<int:id>/carga-tubos/<int:carga_id>/descargar', methods=['POST'])
@login_required
def descargar_carga(id, carga_id):
    Vehiculo.query.get_or_404(id)
    carga = CargaVehiculo.query.filter_by(id=carga_id, vehiculoId=id).first_or_404()
    carga.estado = 'descargada'
    db.session.commit()
    return jsonify({'data': carga.to_dict()})


@vehiculos_bp.route('/api/vehiculos/<int:id>/mantenimientos', methods=['GET'])
@login_required
def list_mantenimientos(id):
    Vehiculo.query.get_or_404(id)
    mantenimientos = MantenimientoVehiculo.query.filter_by(vehiculoId=id).order_by(MantenimientoVehiculo.fecha.desc()).all()
    return jsonify({'data': [m.to_dict() for m in mantenimientos]})


@vehiculos_bp.route('/api/vehiculos/<int:id>/mantenimientos', methods=['POST'])
@login_required
def create_mantenimiento(id):
    Vehiculo.query.get_or_404(id)
    data = request.get_json() or {}

    mantenimiento = MantenimientoVehiculo(
        vehiculoId=id,
        tipo=data.get('tipo', '').strip() or None,
        descripcion=data.get('descripcion', ''),
        costo=data.get('costo', 0, type=float),
        estado=data.get('estado', 'pendiente'),
    )
    db.session.add(mantenimiento)
    db.session.commit()
    return jsonify({'data': mantenimiento.to_dict()}), 201


@vehiculos_bp.route('/api/vehiculos/<int:id>/documentos', methods=['GET'])
@login_required
def list_documentos(id):
    Vehiculo.query.get_or_404(id)
    documentos = DocumentoVehiculo.query.filter_by(vehiculoId=id).order_by(DocumentoVehiculo.fechaVencimiento.desc()).all()
    return jsonify({'data': [d.to_dict() for d in documentos]})


@vehiculos_bp.route('/api/vehiculos/<int:id>/documentos', methods=['POST'])
@login_required
def create_documento(id):
    Vehiculo.query.get_or_404(id)
    data = request.get_json() or {}

    documento = DocumentoVehiculo(
        vehiculoId=id,
        tipo=data.get('tipo', '').strip() or None,
        numero=data.get('numero', '').strip() or None,
        fechaVencimiento=_parse_dt(data.get('fechaVencimiento')),
        estado=data.get('estado', 'vigente'),
    )
    db.session.add(documento)
    db.session.commit()
    return jsonify({'data': documento.to_dict()}), 201


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
