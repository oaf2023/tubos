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

facturas_bp = Blueprint('facturas_bp', __name__)


@facturas_bp.route('/api/facturas', methods=['GET'])
@login_required
def list_facturas():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cliente_id = request.args.get('clienteId', type=int)
    estado = request.args.get('estado', '').strip()

    query = Factura.query

    if cliente_id:
        query = query.filter(Factura.clienteId == cliente_id)
    if estado:
        query = query.filter(Factura.estado == estado)

    query = query.order_by(Factura.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [f.to_dict() for f in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@facturas_bp.route('/api/facturas', methods=['POST'])
@login_required
def create_factura():
    data = request.get_json() or {}
    cliente_id = data.get('clienteId')
    numero = data.get('numero', '').strip()

    if not cliente_id or not numero:
        return jsonify({'error': 'clienteId y numero son requeridos'}), 400

    if not Cliente.query.get(cliente_id):
        return jsonify({'error': 'Cliente no encontrado'}), 404

    if Factura.query.filter_by(numero=numero).first():
        return jsonify({'error': 'Ya existe una factura con ese número'}), 409

    factura = Factura(
        numero=numero,
        clienteId=cliente_id,
        fecha=_parse_dt(data.get('fecha')) or datetime.utcnow(),
        fechaVencimiento=_parse_dt(data.get('fechaVencimiento')),
        subtotal=data.get('subtotal', 0, type=float),
        descuento=data.get('descuento', 0, type=float),
        impuestos=data.get('impuestos', 0, type=float),
        total=data.get('total', 0, type=float),
        totalGeneral=data.get('totalGeneral', 0, type=float),
        estado=data.get('estado', 'pendiente'),
        observaciones=data.get('observaciones', ''),
    )
    db.session.add(factura)
    db.session.flush()

    for item_data in (data.get('items') or []):
        item = FacturaItem(
            facturaId=factura.id,
            concepto=item_data.get('concepto', ''),
            tipo=item_data.get('tipo', ''),
            cantidad=item_data.get('cantidad', 1, type=int),
            precioUnitario=item_data.get('precioUnitario', 0, type=float),
            subtotal=item_data.get('subtotal', 0, type=float),
        )
        db.session.add(item)

    db.session.commit()
    return jsonify({'data': factura.to_dict()}), 201


@facturas_bp.route('/api/facturas/<int:id>', methods=['GET'])
@login_required
def get_factura(id):
    factura = Factura.query.get_or_404(id)
    result = factura.to_dict()
    result['items'] = [i.to_dict() for i in factura.items.all()]
    return jsonify({'data': result})


@facturas_bp.route('/api/facturas/<int:id>', methods=['PUT'])
@login_required
def update_factura(id):
    factura = Factura.query.get_or_404(id)

    if factura.estado != 'pendiente':
        return jsonify({'error': 'Solo se pueden modificar facturas en estado pendiente'}), 400

    data = request.get_json() or {}

    if 'numero' in data:
        val = data['numero'].strip()
        if not val:
            return jsonify({'error': 'El número no puede estar vacío'}), 400
        existing = Factura.query.filter(Factura.numero == val, Factura.id != id).first()
        if existing:
            return jsonify({'error': 'Ya existe otra factura con ese número'}), 409
        factura.numero = val

    if 'clienteId' in data:
        if not Cliente.query.get(data['clienteId']):
            return jsonify({'error': 'Cliente no encontrado'}), 404
        factura.clienteId = data['clienteId']

    for field in ('subtotal', 'descuento', 'impuestos', 'total', 'totalGeneral'):
        if field in data:
            setattr(factura, field, data[field] or 0)

    for field in ('estado', 'observaciones'):
        if field in data:
            setattr(factura, field, data[field])

    if 'fecha' in data:
        factura.fecha = _parse_dt(data['fecha'])
    if 'fechaVencimiento' in data:
        factura.fechaVencimiento = _parse_dt(data['fechaVencimiento'])

    if 'items' in data:
        FacturaItem.query.filter_by(facturaId=id).delete()
        db.session.flush()
        for item_data in data['items']:
            item = FacturaItem(
                facturaId=id,
                concepto=item_data.get('concepto', ''),
                tipo=item_data.get('tipo', ''),
                cantidad=item_data.get('cantidad', 1, type=int),
                precioUnitario=item_data.get('precioUnitario', 0, type=float),
                subtotal=item_data.get('subtotal', 0, type=float),
            )
            db.session.add(item)

    db.session.commit()
    return jsonify({'data': factura.to_dict()})


@facturas_bp.route('/api/facturas/<int:id>', methods=['DELETE'])
@login_required
def delete_factura(id):
    factura = Factura.query.get_or_404(id)
    FacturaItem.query.filter_by(facturaId=id).delete()
    db.session.delete(factura)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


@facturas_bp.route('/api/facturas/calcular-alquiler', methods=['POST'])
@login_required
def calcular_alquiler():
    from models import Gas
    data = request.get_json() or {}
    gas_id = data.get('gasId')
    dias = data.get('dias', 0, type=int)

    if not gas_id or dias < 1:
        return jsonify({'error': 'gasId y dias (>0) son requeridos'}), 400

    gas = Gas.query.get(gas_id)
    if not gas:
        return jsonify({'error': 'Gas no encontrado'}), 404

    precio_diario = gas.precioAlquilerDiario or 0
    precio_mensual = gas.precioAlquilerMensual or 0

    if dias >= 30:
        meses = dias // 30
        resto = dias % 30
        total = (meses * precio_mensual) + (resto * precio_diario)
    else:
        total = dias * precio_diario

    return jsonify({
        'data': {
            'gasId': gas_id,
            'dias': dias,
            'precioDiario': precio_diario,
            'precioMensual': precio_mensual,
            'total': total,
        }
    })


@facturas_bp.route('/api/comprobantes-historicos', methods=['GET'])
@login_required
def list_comprobantes_historicos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cliente_id = request.args.get('clienteId', type=int)

    query = ComprobanteHistorico.query
    if cliente_id:
        query = query.filter(ComprobanteHistorico.clienteId == cliente_id)

    query = query.order_by(ComprobanteHistorico.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@facturas_bp.route('/api/comprobantes-historicos/<int:id>', methods=['GET'])
@login_required
def get_comprobante_historico(id):
    comp = ComprobanteHistorico.query.get_or_404(id)
    result = comp.to_dict()
    result['items'] = [i.to_dict() for i in comp.items.all()]
    return jsonify({'data': result})


@facturas_bp.route('/api/cuenta-corriente', methods=['GET'])
@login_required
def list_cuenta_corriente():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    cliente_id = request.args.get('clienteId', type=int)

    query = CuentaCorrienteMovimiento.query
    if cliente_id:
        query = query.filter(CuentaCorrienteMovimiento.clienteId == cliente_id)

    query = query.order_by(CuentaCorrienteMovimiento.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [m.to_dict() for m in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
