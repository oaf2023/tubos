from models import (Usuario, Rol, AuditLog, Observacion, ObservacionArchivo,
    Gas, Cliente, Pedido, Cylinder, ConciliacionOperacion, MpPayment, MlOrder,
    SellerAccount, MlItem, MlShipment, MlClaimReturn, MlQuestion,
    MpAccountMovement, MpReleaseReport, Geocerca, Ruta, Vehiculo)
from models.base import db
from auth.decorators import login_required, require_role, optional_auth
from auth.jwt import get_session_user
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func, extract
import json, csv, io

admin_bp = Blueprint('admin_bp', __name__)

# ─── Configuration models (inlined to avoid model file changes) ─────

class SystemConfig(db.Model):
    __tablename__ = 'system_config'
    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(100), unique=True, nullable=False)
    valor = db.Column(db.Text)

    def to_dict(self):
        return {'id': self.id, 'clave': self.clave, 'valor': self.valor}

class EmpresaConfig(db.Model):
    __tablename__ = 'empresa_config'
    id = db.Column(db.Integer, primary_key=True)
    razonSocial = db.Column(db.String(200))
    cuit = db.Column(db.String(20))
    direccion = db.Column(db.String(300))
    telefono = db.Column(db.String(50))
    email = db.Column(db.String(200))
    logo = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id, 'razonSocial': self.razonSocial,
            'cuit': self.cuit, 'direccion': self.direccion,
            'telefono': self.telefono, 'email': self.email, 'logo': self.logo,
        }


# ─── Usuarios CRUD ──────────────────────────────────────────────────


@admin_bp.route('/api/usuarios', methods=['GET'])
@login_required
def list_usuarios():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()

    query = Usuario.query
    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                Usuario.nombre.ilike(like),
                Usuario.usuario.ilike(like),
                Usuario.email.ilike(like),
            )
        )

    query = query.order_by(Usuario.nombre.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@admin_bp.route('/api/usuarios', methods=['POST'])
@login_required
def create_usuario():
    data = request.get_json() or {}
    usuario = data.get('usuario', '').strip()
    nombre = data.get('nombre', '').strip()
    password = data.get('password', '')

    if not usuario or not nombre or not password:
        return jsonify({'error': 'usuario, nombre y password son requeridos'}), 400

    if Usuario.query.filter_by(usuario=usuario).first():
        return jsonify({'error': 'El nombre de usuario ya existe'}), 409

    rol_id = data.get('rolId', type=int)
    if rol_id:
        rol = Rol.query.get(rol_id)
        if rol and rol.nombre == 'gerencia':
            current = get_session_user()
            if not current or current.get('nivelAcceso', 5) != 0:
                return jsonify({'error': 'Solo usuarios con nivelAcceso 0 pueden asignar rol gerencia'}), 403

    user = Usuario(
        usuario=usuario,
        nombre=nombre,
        email=data.get('email', '').strip() or None,
        password=import_bcrypt().hashpw(password.encode(), import_bcrypt().gensalt()).decode(),
        activo=data.get('activo', 1),
        nivelAcceso=data.get('nivelAcceso', 5),
        rolId=rol_id,
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'data': user.to_dict()}), 201


@admin_bp.route('/api/usuarios/<int:id>', methods=['GET'])
@login_required
def get_usuario(id):
    user = Usuario.query.get_or_404(id)
    return jsonify({'data': user.to_dict()})


@admin_bp.route('/api/usuarios/<int:id>', methods=['PUT'])
@login_required
def update_usuario(id):
    user = Usuario.query.get_or_404(id)
    data = request.get_json() or {}

    if 'usuario' in data:
        val = data['usuario'].strip()
        if not val:
            return jsonify({'error': 'El usuario no puede estar vacío'}), 400
        existing = Usuario.query.filter(Usuario.usuario == val, Usuario.id != id).first()
        if existing:
            return jsonify({'error': 'El nombre de usuario ya existe'}), 409
        user.usuario = val

    if 'nombre' in data:
        val = data['nombre'].strip()
        if not val:
            return jsonify({'error': 'El nombre no puede estar vacío'}), 400
        user.nombre = val

    if 'email' in data:
        user.email = (data['email'] or '').strip() or None

    if 'password' in data and data['password']:
        user.password = import_bcrypt().hashpw(data['password'].encode(), import_bcrypt().gensalt()).decode()

    if 'activo' in data:
        user.activo = data['activo']

    if 'nivelAcceso' in data:
        user.nivelAcceso = data['nivelAcceso']

    if 'rolId' in data:
        new_rol_id = data['rolId']
        if new_rol_id:
            rol = Rol.query.get(new_rol_id)
            if rol and rol.nombre == 'gerencia':
                current = get_session_user()
                if not current or current.get('nivelAcceso', 5) != 0:
                    return jsonify({'error': 'Solo usuarios con nivelAcceso 0 pueden asignar rol gerencia'}), 403
        user.rolId = new_rol_id

    db.session.commit()
    return jsonify({'data': user.to_dict()})


@admin_bp.route('/api/usuarios/<int:id>', methods=['DELETE'])
@login_required
def delete_usuario(id):
    user = Usuario.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── Roles ──────────────────────────────────────────────────────────


@admin_bp.route('/api/roles', methods=['GET'])
@login_required
def list_roles():
    roles = Rol.query.order_by(Rol.nombre.asc()).all()
    return jsonify({'data': [r.to_dict() for r in roles]})


@admin_bp.route('/api/roles', methods=['POST'])
@login_required
def create_rol():
    data = request.get_json() or {}
    nombre = data.get('nombre', '').strip()
    if not nombre:
        return jsonify({'error': 'nombre es requerido'}), 400
    if Rol.query.filter_by(nombre=nombre).first():
        return jsonify({'error': 'Ya existe un rol con ese nombre'}), 409
    rol = Rol(nombre=nombre, descripcion=data.get('descripcion', ''))
    db.session.add(rol)
    db.session.commit()
    return jsonify({'data': rol.to_dict()}), 201


# ─── Config ─────────────────────────────────────────────────────────


@admin_bp.route('/api/config', methods=['GET'])
@login_required
def get_config():
    configs = SystemConfig.query.all()
    return jsonify({'data': {c.clave: c.valor for c in configs}})


@admin_bp.route('/api/config', methods=['PUT'])
@login_required
def update_config():
    data = request.get_json() or {}
    for clave, valor in data.items():
        config = SystemConfig.query.filter_by(clave=clave).first()
        if config:
            config.valor = str(valor) if valor is not None else None
        else:
            config = SystemConfig(clave=clave, valor=str(valor) if valor is not None else None)
            db.session.add(config)
    db.session.commit()
    configs = SystemConfig.query.all()
    return jsonify({'data': {c.clave: c.valor for c in configs}})


@admin_bp.route('/api/config-empresa', methods=['GET'])
@login_required
def get_config_empresa():
    config = EmpresaConfig.query.first()
    if not config:
        config = EmpresaConfig(razonSocial='', cuit='', direccion='', telefono='', email='')
        db.session.add(config)
        db.session.commit()
    return jsonify({'data': config.to_dict()})


@admin_bp.route('/api/config-empresa', methods=['PUT'])
@login_required
def update_config_empresa():
    config = EmpresaConfig.query.first()
    if not config:
        config = EmpresaConfig()
        db.session.add(config)
    data = request.get_json() or {}
    for field in ('razonSocial', 'cuit', 'direccion', 'telefono', 'email', 'logo'):
        if field in data:
            setattr(config, field, data[field])
    db.session.commit()
    return jsonify({'data': config.to_dict()})


# ─── Alert configs ──────────────────────────────────────────────────


from models import AlertConfig


@admin_bp.route('/api/config-alertas', methods=['GET'])
@login_required
def list_alertas():
    alertas = AlertConfig.query.all()
    return jsonify({'data': [a.to_dict() for a in alertas]})


@admin_bp.route('/api/config-alertas', methods=['POST'])
@login_required
def create_alerta():
    data = request.get_json() or {}
    gas_id = data.get('gasId', type=int)
    if not gas_id:
        return jsonify({'error': 'gasId es requerido'}), 400
    if not Gas.query.get(gas_id):
        return jsonify({'error': 'Gas no encontrado'}), 404
    if AlertConfig.query.filter_by(gasId=gas_id).first():
        return jsonify({'error': 'Ya existe una configuración para ese gas'}), 409
    alerta = AlertConfig(
        gasId=gas_id,
        diasAlertaRetest=data.get('diasAlertaRetest', 30),
        diasMaxCliente=data.get('diasMaxCliente', 90),
        alertaPH=data.get('alertaPH', 0),
    )
    db.session.add(alerta)
    db.session.commit()
    return jsonify({'data': alerta.to_dict()}), 201


@admin_bp.route('/api/config-alertas/<int:id>', methods=['PUT'])
@login_required
def update_alerta(id):
    alerta = AlertConfig.query.get_or_404(id)
    data = request.get_json() or {}
    if 'gasId' in data and data['gasId'] != alerta.gasId:
        if not Gas.query.get(data['gasId']):
            return jsonify({'error': 'Gas no encontrado'}), 404
        existing = AlertConfig.query.filter(AlertConfig.gasId == data['gasId'], AlertConfig.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otra configuración para ese gas'}), 409
        alerta.gasId = data['gasId']
    if 'diasAlertaRetest' in data:
        alerta.diasAlertaRetest = data['diasAlertaRetest']
    if 'diasMaxCliente' in data:
        alerta.diasMaxCliente = data['diasMaxCliente']
    if 'alertaPH' in data:
        alerta.alertaPH = data['alertaPH']
    db.session.commit()
    return jsonify({'data': alerta.to_dict()})


@admin_bp.route('/api/config-alertas/<int:id>', methods=['DELETE'])
@login_required
def delete_alerta(id):
    alerta = AlertConfig.query.get_or_404(id)
    db.session.delete(alerta)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── Audit Logs ─────────────────────────────────────────────────────


@admin_bp.route('/api/audit', methods=['GET'])
@login_required
def list_audit():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    accion = request.args.get('accion', '').strip()
    entidad = request.args.get('entidad', '').strip()

    query = AuditLog.query
    if accion:
        query = query.filter(AuditLog.accion == accion)
    if entidad:
        query = query.filter(AuditLog.entidad == entidad)

    query = query.order_by(AuditLog.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


# ─── Observaciones CRUD ─────────────────────────────────────────────


@admin_bp.route('/api/observaciones', methods=['GET'])
@login_required
def list_observaciones():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    tipo = request.args.get('tipo', '').strip()

    query = Observacion.query
    if tipo:
        query = query.filter(Observacion.tipo == tipo)

    query = query.order_by(Observacion.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    result = []
    for obs in pagination.items:
        d = obs.to_dict()
        d['archivos'] = [a.to_dict() for a in obs.archivos.all()]
        result.append(d)

    return jsonify({
        'data': result,
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@admin_bp.route('/api/observaciones', methods=['POST'])
@login_required
def create_observacion():
    data = request.get_json() or {}
    obs = Observacion(
        tipo=data.get('tipo', ''),
        titulo=data.get('titulo', ''),
        descripcion=data.get('descripcion', ''),
        audioUrl=data.get('audioUrl', ''),
    )
    db.session.add(obs)
    db.session.flush()

    for archivo_data in (data.get('archivos') or []):
        archivo = ObservacionArchivo(
            observacionId=obs.id,
            tipo=archivo_data.get('tipo', 'imagen'),
            nombre=archivo_data.get('nombre', ''),
            datos=archivo_data.get('datos', ''),
            archivoUrl=archivo_data.get('archivoUrl', ''),
        )
        db.session.add(archivo)

    db.session.commit()
    result = obs.to_dict()
    result['archivos'] = [a.to_dict() for a in obs.archivos.all()]
    return jsonify({'data': result}), 201


@admin_bp.route('/api/observaciones/<int:id>', methods=['GET'])
@login_required
def get_observacion(id):
    obs = Observacion.query.get_or_404(id)
    result = obs.to_dict()
    result['archivos'] = [a.to_dict() for a in obs.archivos.all()]
    return jsonify({'data': result})


@admin_bp.route('/api/observaciones/<int:id>', methods=['PUT'])
@login_required
def update_observacion(id):
    obs = Observacion.query.get_or_404(id)
    data = request.get_json() or {}

    for field in ('tipo', 'titulo', 'descripcion', 'audioUrl'):
        if field in data:
            setattr(obs, field, data[field])

    if 'archivos' in data:
        ObservacionArchivo.query.filter_by(observacionId=id).delete()
        db.session.flush()
        for archivo_data in data['archivos']:
            archivo = ObservacionArchivo(
                observacionId=id,
                tipo=archivo_data.get('tipo', 'imagen'),
                nombre=archivo_data.get('nombre', ''),
                datos=archivo_data.get('datos', ''),
                archivoUrl=archivo_data.get('archivoUrl', ''),
            )
            db.session.add(archivo)

    db.session.commit()
    result = obs.to_dict()
    result['archivos'] = [a.to_dict() for a in obs.archivos.all()]
    return jsonify({'data': result})


@admin_bp.route('/api/observaciones/<int:id>', methods=['DELETE'])
@login_required
def delete_observacion(id):
    obs = Observacion.query.get_or_404(id)
    ObservacionArchivo.query.filter_by(observacionId=id).delete()
    db.session.delete(obs)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── Locations CRUD ─────────────────────────────────────────────────


from models import Location


@admin_bp.route('/api/locations', methods=['GET'])
@login_required
def list_locations():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    query = Location.query.order_by(Location.nombre.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'data': [l.to_dict() for l in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@admin_bp.route('/api/locations', methods=['POST'])
@login_required
def create_location():
    data = request.get_json() or {}
    nombre = data.get('nombre', '').strip()
    if not nombre:
        return jsonify({'error': 'nombre es requerido'}), 400
    if Location.query.filter_by(nombre=nombre).first():
        return jsonify({'error': 'Ya existe una ubicación con ese nombre'}), 409
    loc = Location(
        nombre=nombre,
        provincia=data.get('provincia', '').strip() or None,
        lat=data.get('lat', type=float),
        lng=data.get('lng', type=float),
        esBase=data.get('esBase', 0),
        tipo=data.get('tipo', ''),
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify({'data': loc.to_dict()}), 201


@admin_bp.route('/api/locations/<int:id>', methods=['GET'])
@login_required
def get_location(id):
    loc = Location.query.get_or_404(id)
    return jsonify({'data': loc.to_dict()})


@admin_bp.route('/api/locations/<int:id>', methods=['PUT'])
@login_required
def update_location(id):
    loc = Location.query.get_or_404(id)
    data = request.get_json() or {}
    if 'nombre' in data:
        val = data['nombre'].strip()
        if not val:
            return jsonify({'error': 'El nombre no puede estar vacío'}), 400
        existing = Location.query.filter(Location.nombre == val, Location.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otra ubicación con ese nombre'}), 409
        loc.nombre = val
    for field in ('provincia', 'tipo'):
        if field in data:
            setattr(loc, field, (data[field] or '').strip() or None)
    for field in ('lat', 'lng'):
        if field in data:
            setattr(loc, field, data[field])
    if 'esBase' in data:
        loc.esBase = data['esBase']
    db.session.commit()
    return jsonify({'data': loc.to_dict()})


@admin_bp.route('/api/locations/<int:id>', methods=['DELETE'])
@login_required
def delete_location(id):
    loc = Location.query.get_or_404(id)
    db.session.delete(loc)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── Helpers ────────────────────────────────────────────────────────


def import_bcrypt():
    import bcrypt
    return bcrypt
