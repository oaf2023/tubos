from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models import Usuario, ClienteAcceso, Cliente, AuditLog
from auth.jwt import create_session_token, get_session_user
from auth.decorators import login_required
import bcrypt
import json
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    usuario = data.get('usuario', '')
    password = data.get('password', '')

    user = Usuario.query.filter_by(usuario=usuario).first()
    if not user or not user.activo:
        _log_audit('LOGIN', 'Usuario', None, usuario, {'resultado': 'fallo: no encontrado'}, request)
        return jsonify({'error': 'Credenciales inválidas'}), 401

    if not bcrypt.checkpw(password.encode(), user.password.encode()):
        _log_audit('LOGIN', 'Usuario', user.id, usuario, {'resultado': 'fallo: contraseña'}, request)
        return jsonify({'error': 'Credenciales inválidas'}), 401

    _log_audit('LOGIN', 'Usuario', user.id, usuario, {'resultado': 'exitoso'}, request)

    token = create_session_token({
        'id': user.id, 'nombre': user.nombre, 'usuario': user.usuario,
        'rolId': user.rolId or '', 'rol': user.rol.nombre if user.rol else '',
        'tipo': 'usuario', 'nivelAcceso': user.nivelAcceso,
    })

    resp = make_response(jsonify({'user': user.to_dict(), 'token': token}))
    resp.set_cookie('session', token, httponly=True, samesite='Lax',
                    max_age=86400 * int(__import__('flask').current_app.config.get('JWT_EXPIRATION_HOURS', 24)))
    return resp

@auth_bp.route('/api/auth/login-gerencia', methods=['POST'])
def login_gerencia():
    data = request.get_json() or {}
    usuario = data.get('usuario', '')
    password = data.get('password', '')

    user = Usuario.query.filter_by(usuario=usuario).first()
    if not user or not user.activo:
        return jsonify({'error': 'Credenciales inválidas'}), 401

    if user.nivelAcceso != 0:
        _log_audit('LOGIN', 'Usuario', user.id, usuario, {'resultado': 'fallo: nivel acceso'}, request)
        return jsonify({'error': 'Acceso denegado: permisos insuficientes'}), 403

    if not user.rol or user.rol.nombre != 'gerencia':
        _log_audit('LOGIN', 'Usuario', user.id, usuario, {'resultado': 'fallo: rol incorrecto'}, request)
        return jsonify({'error': 'Acceso denegado: rol incorrecto'}), 403

    if not bcrypt.checkpw(password.encode(), user.password.encode()):
        return jsonify({'error': 'Credenciales inválidas'}), 401

    _log_audit('LOGIN', 'Usuario', user.id, usuario, {'tipo': 'gerencia', 'resultado': 'exitoso'}, request)

    token = create_session_token({
        'id': user.id, 'nombre': user.nombre, 'usuario': user.usuario,
        'rolId': user.rolId or '', 'rol': user.rol.nombre,
        'tipo': 'gerencia', 'nivelAcceso': user.nivelAcceso,
    })

    resp = make_response(jsonify({'user': user.to_dict(), 'token': token}))
    resp.set_cookie('session', token, httponly=True, samesite='Lax',
                    max_age=86400 * int(__import__('flask').current_app.config.get('JWT_EXPIRATION_HOURS', 24)))
    return resp

@auth_bp.route('/api/auth/login-cliente', methods=['POST'])
def login_cliente():
    data = request.get_json() or {}
    usuario = data.get('usuario', '')
    password = data.get('password', '')

    acceso = ClienteAcceso.query.filter_by(usuario=usuario).first()
    if not acceso:
        return jsonify({'error': 'Credenciales inválidas'}), 401

    if not bcrypt.checkpw(password.encode(), acceso.password.encode()):
        return jsonify({'error': 'Credenciales inválidas'}), 401

    cliente = Cliente.query.get(acceso.clienteId)
    token = create_session_token({
        'id': acceso.id, 'nombre': cliente.nombre if cliente else usuario,
        'usuario': acceso.usuario, 'clienteId': acceso.clienteId,
        'tipo': 'cliente', 'rol': '', 'nivelAcceso': 10,
    })

    resp = make_response(jsonify({'user': {
        'id': acceso.id, 'nombre': cliente.nombre if cliente else usuario,
        'usuario': acceso.usuario, 'clienteId': acceso.clienteId, 'tipo': 'cliente',
        'rol': None, 'nivelAcceso': 10,
    }}))
    resp.set_cookie('session', token, httponly=True, samesite='Lax',
                    max_age=86400 * int(__import__('flask').current_app.config.get('JWT_EXPIRATION_HOURS', 24)))
    return resp

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    user = get_session_user()
    if user:
        _log_audit('LOGOUT', 'Usuario', user.get('id'), user.get('usuario'), {}, request)
    resp = make_response(jsonify({'ok': True}))
    resp.set_cookie('session', '', expires=0)
    return resp

@auth_bp.route('/api/auth/me', methods=['GET'])
@login_required
def me():
    uid = request.user.get('id')
    if request.user.get('tipo') == 'cliente':
        return jsonify({'user': request.user})
    user = Usuario.query.get(uid)
    if not user:
        return jsonify({'error': 'No encontrado'}), 404
    return jsonify({'user': user.to_dict()})

def _log_audit(accion, entidad, entidadId, usuario, detalle, req):
    try:
        entry = AuditLog(
            accion=accion, entidad=entidad,
            entidadId=str(entidadId) if entidadId else None,
            usuario=usuario,
            detalle=json.dumps(detalle, default=str),
            direccionIp=req.headers.get('X-Forwarded-For', req.remote_addr or ''),
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()
