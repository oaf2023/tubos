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

rfid_bp = Blueprint('rfid_bp', __name__)


@rfid_bp.route('/api/rfid/eventos', methods=['GET'])
@login_required
def list_eventos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    zona_id = request.args.get('zonaId', type=int)
    lector_id = request.args.get('lectorId', type=int)
    tid = request.args.get('tid', '').strip()
    desde = request.args.get('desde', '').strip()
    hasta = request.args.get('hasta', '').strip()

    query = EventoRFID.query

    if zona_id:
        query = query.filter(EventoRFID.zonaId == zona_id)
    if lector_id:
        query = query.filter(EventoRFID.lectorId == lector_id)
    if tid:
        query = query.filter(EventoRFID.tid == tid)
    if desde:
        try:
            query = query.filter(EventoRFID.timestamp >= datetime.fromisoformat(desde))
        except ValueError:
            pass
    if hasta:
        try:
            query = query.filter(EventoRFID.timestamp <= datetime.fromisoformat(hasta))
        except ValueError:
            pass

    query = query.order_by(EventoRFID.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [e.to_dict() for e in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@rfid_bp.route('/api/rfid/eventos', methods=['POST'])
@login_required
def create_evento():
    data = request.get_json() or {}
    tid = data.get('tid', '').strip()

    if not tid:
        return jsonify({'error': 'tid es requerido'}), 400

    if data.get('lectorId') and not LectorIoT.query.get(data['lectorId']):
        return jsonify({'error': 'Lector no encontrado'}), 404
    if data.get('zonaId') and not ZonaLectura.query.get(data['zonaId']):
        return jsonify({'error': 'Zona no encontrada'}), 404

    evento = EventoRFID(
        tid=tid,
        lectorId=data.get('lectorId'),
        zonaId=data.get('zonaId'),
        estadoAnterior=data.get('estadoAnterior', '').strip() or None,
        estadoNuevo=data.get('estadoNuevo', '').strip() or None,
    )
    db.session.add(evento)
    db.session.commit()
    return jsonify({'data': evento.to_dict()}), 201


@rfid_bp.route('/api/rfid/sesiones', methods=['GET'])
@login_required
def list_sesiones():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    lector_id = request.args.get('lectorId', type=int)
    zona_id = request.args.get('zonaId', type=int)
    tid = request.args.get('tid', '').strip()
    cylinder_id = request.args.get('cylinderId', type=int)
    procesado = request.args.get('procesado', type=int)

    query = SesionLecturaRFID.query

    if lector_id:
        query = query.filter(SesionLecturaRFID.lectorId == lector_id)
    if zona_id:
        query = query.filter(SesionLecturaRFID.zonaId == zona_id)
    if tid:
        query = query.filter(SesionLecturaRFID.tid == tid)
    if cylinder_id:
        query = query.filter(SesionLecturaRFID.cylinderId == cylinder_id)
    if procesado is not None:
        query = query.filter(SesionLecturaRFID.procesado == procesado)

    query = query.order_by(SesionLecturaRFID.inicio.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [s.to_dict() for s in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@rfid_bp.route('/api/rfid/sesiones', methods=['POST'])
@login_required
def create_sesion():
    data = request.get_json() or {}

    sesion = SesionLecturaRFID(
        lectorId=data.get('lectorId', type=int),
        zonaId=data.get('zonaId', type=int),
        tid=data.get('tid', '').strip() or None,
        cylinderId=data.get('cylinderId', type=int),
        inicio=_parse_dt(data.get('inicio')),
        fin=_parse_dt(data.get('fin')),
        conteo=data.get('conteo', 0, type=int),
        procesado=data.get('procesado', 0, type=int),
    )
    db.session.add(sesion)
    db.session.commit()
    return jsonify({'data': sesion.to_dict()}), 201


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
