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
import hashlib
import bcrypt

chofer_bp = Blueprint('chofer_bp', __name__)


@chofer_bp.route('/api/chofer/login', methods=['POST'])
def chofer_login():
    data = request.get_json() or {}
    usuario = data.get('usuario', '')
    password = data.get('password', '')
    ruta_id = data.get('rutaId', type=int)

    if not usuario or not password:
        return jsonify({'error': 'usuario y password son requeridos'}), 400

    user = Usuario.query.filter_by(usuario=usuario).first()
    if not user or not user.activo:
        return jsonify({'error': 'Credenciales inválidas'}), 401

    if not bcrypt.checkpw(password.encode(), user.password.encode()):
        return jsonify({'error': 'Credenciales inválidas'}), 401

    token = hashlib.sha256(f'{user.id}:{datetime.utcnow().isoformat()}'.encode()).hexdigest()

    sesion = SesionConductor(
        conductorId=user.id,
        rutaId=ruta_id,
        token=token,
        estaEnLinea=1,
        ultimoHeartbeat=datetime.utcnow(),
    )
    db.session.add(sesion)
    db.session.commit()

    return jsonify({
        'data': {
            'token': token,
            'sesionId': sesion.id,
            'conductor': user.to_dict(),
        }
    })


@chofer_bp.route('/api/chofer/heartbeat', methods=['POST'])
def chofer_heartbeat():
    token = request.headers.get('X-Api-Token', '')
    if not token:
        return jsonify({'error': 'X-Api-Token header requerido'}), 401

    sesion = SesionConductor.query.filter_by(token=token, estaEnLinea=1).first()
    if not sesion:
        return jsonify({'error': 'Sesión no encontrada o inactiva'}), 404

    sesion.ultimoHeartbeat = datetime.utcnow()
    db.session.commit()

    return jsonify({'data': {'ok': True, 'ultimoHeartbeat': sesion.ultimoHeartbeat.isoformat()}})


@chofer_bp.route('/api/chofer/activos', methods=['GET'])
@login_required
def chofer_activos():
    sesiones = SesionConductor.query.filter_by(estaEnLinea=1).order_by(SesionConductor.ultimoHeartbeat.desc()).all()

    result = []
    for s in sesiones:
        d = s.to_dict()
        conductor = Usuario.query.get(s.conductorId)
        if conductor:
            d['conductor'] = conductor.to_dict()
        ruta = Ruta.query.get(s.rutaId) if s.rutaId else None
        if ruta:
            d['ruta'] = ruta.to_dict()
        result.append(d)

    return jsonify({'data': result})


@chofer_bp.route('/api/chofer/mi-ruta', methods=['GET'])
def chofer_mi_ruta():
    token = request.headers.get('X-Api-Token', '')
    if not token:
        return jsonify({'error': 'X-Api-Token header requerido'}), 401

    sesion = SesionConductor.query.filter_by(token=token, estaEnLinea=1).first()
    if not sesion:
        return jsonify({'error': 'Sesión no encontrada o inactiva'}), 404

    if not sesion.rutaId:
        return jsonify({'data': None})

    ruta = Ruta.query.get(sesion.rutaId)
    if not ruta:
        return jsonify({'error': 'Ruta no encontrada'}), 404

    result = ruta.to_dict()
    result['paradas'] = [p.to_dict() for p in ruta.paradas.order_by(RutaParada.orden.asc()).all()]
    result['sesion'] = sesion.to_dict()

    return jsonify({'data': result})
