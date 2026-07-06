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
import json

cabina_bp = Blueprint('cabina_bp', __name__)


@cabina_bp.route('/api/cabina', methods=['GET'])
@login_required
def list_cabinas():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Cabina.query.order_by(Cabina.codigo.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@cabina_bp.route('/api/cabina', methods=['POST'])
@login_required
def create_cabina():
    data = request.get_json() or {}
    codigo = data.get('codigo', '').strip()

    if not codigo:
        return jsonify({'error': 'codigo es requerido'}), 400

    if Cabina.query.filter_by(codigo=codigo).first():
        return jsonify({'error': 'Ya existe una cabina con ese código'}), 409

    cabina = Cabina(
        codigo=codigo,
        nombre=data.get('nombre', '').strip() or None,
        ubicacion=data.get('ubicacion', '').strip() or None,
    )
    db.session.add(cabina)
    db.session.commit()
    return jsonify({'data': cabina.to_dict()}), 201


@cabina_bp.route('/api/cabina/sensores', methods=['GET'])
@login_required
def list_sensores():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cabina_id = request.args.get('cabinaId', type=int)

    query = SensorCabina.query
    if cabina_id:
        query = query.filter(SensorCabina.cabinaId == cabina_id)

    query = query.order_by(SensorCabina.codigo.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [s.to_dict() for s in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@cabina_bp.route('/api/cabina/peso', methods=['POST'])
@login_required
def registrar_peso():
    data = request.get_json() or {}
    cabina_id = data.get('cabinaId')
    cylinder_id = data.get('cylinderId')

    if not cabina_id or not data.get('pesoKg') is None:
        return jsonify({'error': 'cabinaId y pesoKg son requeridos'}), 400

    if not Cabina.query.get(cabina_id):
        return jsonify({'error': 'Cabina no encontrada'}), 404
    if cylinder_id and not Cylinder.query.get(cylinder_id):
        return jsonify({'error': 'Cilindro no encontrado'}), 404

    lectura = LecturaPeso(
        cabinaId=cabina_id,
        cylinderId=cylinder_id,
        pesoKg=data.get('pesoKg', type=float),
        sensorId=data.get('sensorId', type=int),
    )
    db.session.add(lectura)
    db.session.commit()
    return jsonify({'data': lectura.to_dict()}), 201


@cabina_bp.route('/api/cabina/foto', methods=['POST'])
@login_required
def upload_foto():
    data = request.get_json() or {}
    cabina_id = data.get('cabinaId')

    if not cabina_id or not data.get('imagen'):
        return jsonify({'error': 'cabinaId e imagen son requeridos'}), 400

    if not Cabina.query.get(cabina_id):
        return jsonify({'error': 'Cabina no encontrada'}), 404

    foto = EvidenciaFoto(
        cabinaId=cabina_id,
        cylinderId=data.get('cylinderId', type=int),
        imagen=data['imagen'],
        imagenUrl=data.get('imagenUrl', '').strip() or None,
    )
    db.session.add(foto)
    db.session.commit()
    return jsonify({'data': foto.to_dict()}), 201


@cabina_bp.route('/api/cabina/validar', methods=['POST'])
@login_required
def validar_cabina():
    data = request.get_json() or {}
    cabina_id = data.get('cabinaId')
    cylinder_id = data.get('cylinderId')
    lectura_peso_id = data.get('lecturaPesoId')
    evidencia_foto_id = data.get('evidenciaFotoId')

    if not cabina_id or not cylinder_id:
        return jsonify({'error': 'cabinaId y cylinderId son requeridos'}), 400

    if not Cabina.query.get(cabina_id):
        return jsonify({'error': 'Cabina no encontrada'}), 404

    cylinder = Cylinder.query.get(cylinder_id)
    if not cylinder:
        return jsonify({'error': 'Cilindro no encontrado'}), 404

    peso_kg = data.get('pesoKg', type=float)
    if peso_kg is None and lectura_peso_id:
        lectura = LecturaPeso.query.get(lectura_peso_id)
        if lectura:
            peso_kg = lectura.pesoKg

    diagnostico = {'valido': True, 'observaciones': []}

    regla = ReglaPeso.query.filter_by(gasId=cylinder.gasId).first()
    if regla and peso_kg is not None:
        if regla.pesoMinKg is not None and peso_kg < regla.pesoMinKg:
            diagnostico['valido'] = False
            diagnostico['observaciones'].append(f'Peso {peso_kg}kg por debajo del mínimo {regla.pesoMinKg}kg')
        if regla.pesoMaxKg is not None and peso_kg > regla.pesoMaxKg:
            diagnostico['valido'] = False
            diagnostico['observaciones'].append(f'Peso {peso_kg}kg por encima del máximo {regla.pesoMaxKg}kg')
        if regla.pesoTaraKg is not None and regla.pesoLlenoKg is not None:
            diagnostico['pesoTaraKg'] = regla.pesoTaraKg
            diagnostico['pesoLlenoKg'] = regla.pesoLlenoKg

    validacion = ValidacionCabina(
        cabinaId=cabina_id,
        cylinderId=cylinder_id,
        lecturaPesoId=lectura_peso_id,
        evidenciaFotoId=evidencia_foto_id,
        diagnostico=json.dumps(diagnostico),
    )
    db.session.add(validacion)
    db.session.commit()

    if not diagnostico['valido'] and data.get('generarAlerta', False):
        alerta = Alerta(
            tipo='validacion',
            cabinaId=cabina_id,
            cylinderId=cylinder_id,
            mensaje='; '.join(diagnostico['observaciones']),
            nivel='media',
        )
        db.session.add(alerta)
        db.session.commit()

    return jsonify({'data': validacion.to_dict()}), 201


@cabina_bp.route('/api/cabina/validacion', methods=['GET'])
@login_required
def list_validaciones():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cabina_id = request.args.get('cabinaId', type=int)
    cylinder_id = request.args.get('cylinderId', type=int)

    query = ValidacionCabina.query
    if cabina_id:
        query = query.filter(ValidacionCabina.cabinaId == cabina_id)
    if cylinder_id:
        query = query.filter(ValidacionCabina.cylinderId == cylinder_id)

    query = query.order_by(ValidacionCabina.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [v.to_dict() for v in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@cabina_bp.route('/api/cabina/reglas-peso', methods=['GET'])
@login_required
def list_reglas_peso():
    reglas = ReglaPeso.query.all()
    return jsonify({'data': [r.to_dict() for r in reglas]})


@cabina_bp.route('/api/cabina/reglas-peso', methods=['POST'])
@login_required
def create_regla_peso():
    data = request.get_json() or {}
    gas_id = data.get('gasId')

    if not gas_id:
        return jsonify({'error': 'gasId es requerido'}), 400

    if ReglaPeso.query.filter_by(gasId=gas_id).first():
        return jsonify({'error': 'Ya existe una regla de peso para ese gas'}), 409

    regla = ReglaPeso(
        gasId=gas_id,
        pesoMinKg=data.get('pesoMinKg', type=float),
        pesoMaxKg=data.get('pesoMaxKg', type=float),
        pesoTaraKg=data.get('pesoTaraKg', type=float),
        pesoLlenoKg=data.get('pesoLlenoKg', type=float),
    )
    db.session.add(regla)
    db.session.commit()
    return jsonify({'data': regla.to_dict()}), 201


@cabina_bp.route('/api/cabina/alertas', methods=['GET'])
@login_required
def list_alertas():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cabina_id = request.args.get('cabinaId', type=int)
    leida = request.args.get('leida', type=int)

    query = Alerta.query
    if cabina_id:
        query = query.filter(Alerta.cabinaId == cabina_id)
    if leida is not None:
        query = query.filter(Alerta.leida == leida)

    query = query.order_by(Alerta.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@cabina_bp.route('/api/cabina/evento', methods=['POST'])
@login_required
def create_evento_trazabilidad():
    data = request.get_json() or {}
    cabina_id = data.get('cabinaId')

    if not cabina_id or not data.get('tipo'):
        return jsonify({'error': 'cabinaId y tipo son requeridos'}), 400

    if not Cabina.query.get(cabina_id):
        return jsonify({'error': 'Cabina no encontrada'}), 404

    evento = EventoTrazabilidad(
        cabinaId=cabina_id,
        cylinderId=data.get('cylinderId', type=int),
        tipo=data.get('tipo', ''),
        descripcion=data.get('descripcion', ''),
    )
    db.session.add(evento)
    db.session.commit()
    return jsonify({'data': evento.to_dict()}), 201


@cabina_bp.route('/api/cabina/eventos-trazabilidad', methods=['GET'])
@login_required
def list_eventos_trazabilidad():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cabina_id = request.args.get('cabinaId', type=int)
    cylinder_id = request.args.get('cylinderId', type=int)
    tipo = request.args.get('tipo', '').strip()

    query = EventoTrazabilidad.query
    if cabina_id:
        query = query.filter(EventoTrazabilidad.cabinaId == cabina_id)
    if cylinder_id:
        query = query.filter(EventoTrazabilidad.cylinderId == cylinder_id)
    if tipo:
        query = query.filter(EventoTrazabilidad.tipo == tipo)

    query = query.order_by(EventoTrazabilidad.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [e.to_dict() for e in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@cabina_bp.route('/api/cabina/<int:id>', methods=['GET'])
@login_required
def get_cabina(id):
    cabina = Cabina.query.get_or_404(id)
    result = cabina.to_dict()
    result['sensores'] = [s.to_dict() for s in cabina.sensores.all()]
    return jsonify({'data': result})


@cabina_bp.route('/api/cabina/<int:id>', methods=['PUT'])
@login_required
def update_cabina(id):
    cabina = Cabina.query.get_or_404(id)
    data = request.get_json() or {}

    if 'codigo' in data:
        val = data['codigo'].strip()
        if not val:
            return jsonify({'error': 'El código no puede estar vacío'}), 400
        existing = Cabina.query.filter(Cabina.codigo == val, Cabina.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otra cabina con ese código'}), 409
        cabina.codigo = val

    for field in ('nombre', 'ubicacion'):
        if field in data:
            setattr(cabina, field, (data[field] or '').strip() or None)

    db.session.commit()
    return jsonify({'data': cabina.to_dict()})


@cabina_bp.route('/api/cabina/<int:id>', methods=['DELETE'])
@login_required
def delete_cabina(id):
    cabina = Cabina.query.get_or_404(id)
    db.session.delete(cabina)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})
