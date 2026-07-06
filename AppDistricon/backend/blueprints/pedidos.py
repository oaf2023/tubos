from flask import Blueprint, request, jsonify
from models import Pedido, PedidoItem, PedidoCilindro, TipoOperacionPedido, Cliente, Gas
from models.base import db
from auth.decorators import login_required, require_role, optional_auth
from datetime import datetime

pedidos_bp = Blueprint('pedidos_bp', __name__)


@pedidos_bp.route('/api/pedidos', methods=['GET'])
@login_required
def list_pedidos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    estado = request.args.get('estado', '').strip()
    cliente_id = request.args.get('clienteId', type=int)
    fecha_desde = request.args.get('fechaDesde', '').strip()
    fecha_hasta = request.args.get('fechaHasta', '').strip()

    query = Pedido.query

    if estado:
        query = query.filter(Pedido.estado == estado)
    if cliente_id:
        query = query.filter(Pedido.clienteId == cliente_id)
    if fecha_desde:
        try:
            dt = datetime.fromisoformat(fecha_desde)
            query = query.filter(Pedido.fecha >= dt)
        except ValueError:
            pass
    if fecha_hasta:
        try:
            dt = datetime.fromisoformat(fecha_hasta)
            query = query.filter(Pedido.fecha <= dt)
        except ValueError:
            pass

    query = query.order_by(Pedido.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@pedidos_bp.route('/api/pedidos', methods=['POST'])
@login_required
def create_pedido():
    data = request.get_json() or {}
    cliente_id = data.get('clienteId')
    gas_id = data.get('gasId')

    if not cliente_id or not gas_id:
        return jsonify({'error': 'clienteId y gasId son requeridos'}), 400

    if not Cliente.query.get(cliente_id):
        return jsonify({'error': 'Cliente no encontrado'}), 404
    if not Gas.query.get(gas_id):
        return jsonify({'error': 'Gas no encontrado'}), 404

    pedido = Pedido(
        clienteId=cliente_id,
        gasId=gas_id,
        operacionEnvase=data.get('operacionEnvase'),
        total=data.get('total', 0, type=float),
        estado=data.get('estado', 'pendiente'),
        capacidadLitros=data.get('capacidadLitros', type=float),
    )
    db.session.add(pedido)
    db.session.flush()

    for item_data in (data.get('items') or []):
        item = PedidoItem(
            pedidoId=pedido.id,
            concepto=item_data.get('concepto', ''),
            monto=item_data.get('monto', 0, type=float),
        )
        db.session.add(item)

    for cil_data in (data.get('cilindros') or []):
        cil = PedidoCilindro(
            pedidoId=pedido.id,
            numeroSerie=cil_data.get('numeroSerie', ''),
            gasCodigo=cil_data.get('gasCodigo', ''),
            verified=cil_data.get('verified', 0),
        )
        db.session.add(cil)

    db.session.commit()
    return jsonify({'data': pedido.to_dict()}), 201


@pedidos_bp.route('/api/pedidos/<int:id>', methods=['GET'])
@login_required
def get_pedido(id):
    pedido = Pedido.query.get_or_404(id)
    result = pedido.to_dict()
    result['items'] = [i.to_dict() for i in pedido.items.all()]
    result['cilindros'] = [c.to_dict() for c in pedido.cilindros.all()]
    return jsonify({'data': result})


@pedidos_bp.route('/api/pedidos/<int:id>', methods=['PUT'])
@login_required
def update_pedido(id):
    pedido = Pedido.query.get_or_404(id)
    data = request.get_json() or {}

    if 'estado' in data:
        pedido.estado = data['estado']
    if 'total' in data:
        pedido.total = data['total'] or 0
    if 'capacidadLitros' in data:
        pedido.capacidadLitros = data['capacidadLitros']
    if 'operacionEnvase' in data:
        pedido.operacionEnvase = data['operacionEnvase']

    db.session.commit()
    return jsonify({'data': pedido.to_dict()})


@pedidos_bp.route('/api/pedidos/<int:id>', methods=['DELETE'])
@login_required
def delete_pedido(id):
    pedido = Pedido.query.get_or_404(id)
    if pedido.estado != 'pendiente':
        return jsonify({'error': 'Solo se pueden eliminar pedidos en estado pendiente'}), 400

    PedidoItem.query.filter_by(pedidoId=id).delete()
    PedidoCilindro.query.filter_by(pedidoId=id).delete()
    db.session.delete(pedido)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


@pedidos_bp.route('/api/pedidos/<int:id>/cilindros', methods=['GET'])
@login_required
def list_pedido_cilindros(id):
    pedido = Pedido.query.get_or_404(id)
    cilindros = PedidoCilindro.query.filter_by(pedidoId=id).all()
    return jsonify({'data': [c.to_dict() for c in cilindros]})


@pedidos_bp.route('/api/pedidos/pendientes-entrega', methods=['GET'])
@login_required
def pedidos_pendientes_entrega():
    pedidos = Pedido.query.filter_by(estado='pendiente').order_by(Pedido.fecha.asc()).all()
    return jsonify({'data': [p.to_dict() for p in pedidos]})


@pedidos_bp.route('/api/tipos-operacion-pedido', methods=['GET'])
@login_required
def list_tipos_operacion():
    tipos = TipoOperacionPedido.query.filter_by(activo=1).order_by(TipoOperacionPedido.orden.asc()).all()
    return jsonify({'data': [t.to_dict() for t in tipos]})
