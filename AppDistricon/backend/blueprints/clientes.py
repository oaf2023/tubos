from flask import Blueprint, request, jsonify
from models import Cliente, ClienteAcceso
from models.base import db
from auth.decorators import login_required, require_role, optional_auth
import bcrypt

clientes_bp = Blueprint('clientes_bp', __name__)


# ─── Clientes CRUD ─────────────────────────────────────────────────────


@clientes_bp.route('/api/clientes', methods=['GET'])
@login_required
def list_clientes():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()

    query = Cliente.query

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                Cliente.nombre.ilike(like),
                Cliente.email.ilike(like),
                Cliente.telefono.ilike(like),
                Cliente.taxId.ilike(like),
            )
        )

    query = query.order_by(Cliente.nombre.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@clientes_bp.route('/api/clientes', methods=['POST'])
@login_required
def create_cliente():
    data = request.get_json() or {}
    nombre = data.get('nombre', '').strip()
    if not nombre:
        return jsonify({'error': 'El campo nombre es requerido'}), 400

    if Cliente.query.filter_by(nombre=nombre).first():
        return jsonify({'error': 'Ya existe un cliente con ese nombre'}), 409

    cliente = Cliente(
        nombre=nombre,
        email=data.get('email', '').strip() or None,
        telefono=data.get('telefono', '').strip() or None,
        taxId=data.get('taxId', '').strip() or None,
        contacto=data.get('contacto', '').strip() or None,
        calle=data.get('calle', '').strip() or None,
        ciudad=data.get('ciudad', '').strip() or None,
        provincia=data.get('provincia', '').strip() or None,
        condicionIva=data.get('condicionIva', '').strip() or None,
        iibb=data.get('iibb', '').strip() or None,
        limiteCredito=data.get('limiteCredito', 0, type=float),
        lat=data.get('lat'),
        lng=data.get('lng'),
        estadoCliente=data.get('estadoCliente', 'activo'),
    )
    db.session.add(cliente)
    db.session.commit()
    return jsonify({'data': cliente.to_dict()}), 201


@clientes_bp.route('/api/clientes/<int:id>', methods=['GET'])
@login_required
def get_cliente(id):
    cliente = Cliente.query.get_or_404(id)
    result = cliente.to_dict()
    result['_counts'] = {
        'cylinders': cliente.cylinders.count(),
        'pedidos': cliente.pedidos.count(),
        'remitos': cliente.remitos.count(),
        'facturas': cliente.facturas.count(),
    }
    return jsonify({'data': result})


@clientes_bp.route('/api/clientes/<int:id>', methods=['PUT'])
@login_required
def update_cliente(id):
    cliente = Cliente.query.get_or_404(id)
    data = request.get_json() or {}

    if 'nombre' in data:
        val = data['nombre'].strip()
        if not val:
            return jsonify({'error': 'El campo nombre no puede estar vacío'}), 400
        existing = Cliente.query.filter(Cliente.nombre == val, Cliente.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otro cliente con ese nombre'}), 409
        cliente.nombre = val

    for field in ('email', 'telefono', 'taxId', 'contacto', 'calle', 'ciudad',
                  'provincia', 'condicionIva', 'iibb', 'estadoCliente'):
        if field in data:
            setattr(cliente, field, (data[field] or '').strip() or None)

    if 'limiteCredito' in data:
        cliente.limiteCredito = data['limiteCredito'] or 0
    if 'lat' in data:
        cliente.lat = data['lat']
    if 'lng' in data:
        cliente.lng = data['lng']

    db.session.commit()
    return jsonify({'data': cliente.to_dict()})


@clientes_bp.route('/api/clientes/<int:id>', methods=['DELETE'])
@login_required
def delete_cliente(id):
    cliente = Cliente.query.get_or_404(id)
    cliente.activo = 0
    db.session.commit()
    return jsonify({'data': cliente.to_dict()})


@clientes_bp.route('/api/clientes/con-coordenadas', methods=['GET'])
@login_required
def clientes_con_coordenadas():
    clientes = Cliente.query.filter(
        Cliente.lat.isnot(None),
        Cliente.lng.isnot(None),
        Cliente.activo == 1,
    ).all()
    return jsonify({'data': [c.to_dict() for c in clientes]})


# ─── ClienteAcceso CRUD ───────────────────────────────────────────────


@clientes_bp.route('/api/clientes-acceso', methods=['GET'])
@login_required
def list_accesos():
    accesos = ClienteAcceso.query.all()
    return jsonify({'data': [a.to_dict() for a in accesos]})


@clientes_bp.route('/api/clientes-acceso', methods=['POST'])
@login_required
def create_acceso():
    data = request.get_json() or {}
    cliente_id = data.get('clienteId')
    usuario = data.get('usuario', '').strip()
    password = data.get('password', '')

    if not cliente_id or not usuario or not password:
        return jsonify({'error': 'clienteId, usuario y password son requeridos'}), 400

    if not Cliente.query.get(cliente_id):
        return jsonify({'error': 'Cliente no encontrado'}), 404

    if ClienteAcceso.query.filter_by(clienteId=cliente_id).first():
        return jsonify({'error': 'El cliente ya tiene un acceso configurado'}), 409

    if ClienteAcceso.query.filter_by(usuario=usuario).first():
        return jsonify({'error': 'El nombre de usuario ya existe'}), 409

    acceso = ClienteAcceso(
        clienteId=cliente_id,
        usuario=usuario,
        password=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
    )
    db.session.add(acceso)
    db.session.commit()
    return jsonify({'data': acceso.to_dict()}), 201


@clientes_bp.route('/api/clientes-acceso/<int:id>', methods=['PUT'])
@login_required
def update_acceso(id):
    acceso = ClienteAcceso.query.get_or_404(id)
    data = request.get_json() or {}

    if 'usuario' in data:
        val = data['usuario'].strip()
        if not val:
            return jsonify({'error': 'El usuario no puede estar vacío'}), 400
        existing = ClienteAcceso.query.filter(
            ClienteAcceso.usuario == val, ClienteAcceso.id != id
        ).first()
        if existing:
            return jsonify({'error': 'El nombre de usuario ya existe'}), 409
        acceso.usuario = val

    if 'password' in data and data['password']:
        acceso.password = bcrypt.hashpw(
            data['password'].encode(), bcrypt.gensalt()
        ).decode()

    if 'clienteId' in data:
        if not Cliente.query.get(data['clienteId']):
            return jsonify({'error': 'Cliente no encontrado'}), 404
        existing = ClienteAcceso.query.filter(
            ClienteAcceso.clienteId == data['clienteId'],
            ClienteAcceso.id != id,
        ).first()
        if existing:
            return jsonify({'error': 'El cliente ya tiene otro acceso'}), 409
        acceso.clienteId = data['clienteId']

    db.session.commit()
    return jsonify({'data': acceso.to_dict()})


@clientes_bp.route('/api/clientes-acceso/<int:id>', methods=['DELETE'])
@login_required
def delete_acceso(id):
    acceso = ClienteAcceso.query.get_or_404(id)
    db.session.delete(acceso)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})
