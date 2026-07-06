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

gerencia_bp = Blueprint('gerencia_bp', __name__)


# ─── KPIs ────────────────────────────────────────────────────────────


@gerencia_bp.route('/api/gerencia/kpis', methods=['GET'])
@require_role('gerencia')
def kpis():
    total_clientes = Cliente.query.count()
    clientes_activos = Cliente.query.filter(Cliente.activo == 1).count()
    total_pedidos = Pedido.query.count()
    pedidos_pendientes = Pedido.query.filter(Pedido.estado == 'pendiente').count()
    total_cylinders = Cylinder.query.count()
    cylinders_disponibles = Cylinder.query.filter(Cylinder.estado == 'disponible').count()
    total_rutas = Ruta.query.count()
    rutas_completadas = Ruta.query.filter(Ruta.estado == 'completada').count()

    from models import Factura
    total_facturado = db.session.query(func.coalesce(func.sum(Factura.total), 0)).scalar() or 0
    total_cobrado = db.session.query(func.coalesce(func.sum(Factura.total), 0)).filter(
        Factura.estado == 'pagada'
    ).scalar() or 0

    def semaforo(valor, verde, amarillo):
        if valor >= verde:
            return 'verde'
        if valor >= amarillo:
            return 'amarillo'
        return 'rojo'

    comerciales = {
        'clientesActivos': clientes_activos,
        'totalClientes': total_clientes,
        'tasaCaptacion': round((clientes_activos / total_clientes * 100) if total_clientes else 0, 1),
        'semaforo': semaforo(clientes_activos / max(total_clientes, 1), 0.8, 0.5),
    }

    financieros = {
        'totalFacturado': float(total_facturado),
        'totalCobrado': float(total_cobrado),
        'tasaCobro': round((total_cobrado / total_facturado * 100) if total_facturado else 0, 1),
        'semaforo': semaforo(total_cobrado / max(total_facturado, 1), 0.8, 0.5),
    }

    operativos = {
        'pedidosPendientes': pedidos_pendientes,
        'totalPedidos': total_pedidos,
        'cylindersDisponibles': cylinders_disponibles,
        'totalCylinders': total_cylinders,
        'rutasCompletadas': rutas_completadas,
        'totalRutas': total_rutas,
        'tasaOperativa': round(
            ((total_pedidos - pedidos_pendientes) / max(total_pedidos, 1)) * 100, 1
        ),
        'semaforo': semaforo(
            (total_pedidos - pedidos_pendientes) / max(total_pedidos, 1), 0.8, 0.5
        ),
    }

    return jsonify({
        'data': {
            'comerciales': comerciales,
            'financieros': financieros,
            'operativos': operativos,
            'timestamp': datetime.utcnow().isoformat(),
        }
    })


# ─── MercadoLibre ────────────────────────────────────────────────────


@gerencia_bp.route('/api/gerencia/ml/orders', methods=['GET'])
@require_role('gerencia')
def ml_orders():
    orders = MlOrder.query.order_by(MlOrder.dateCreated.desc()).limit(50).all()
    if orders:
        return jsonify({'data': [o.to_dict() for o in orders]})

    return jsonify({
        'data': [
            {'id': 1, 'orderId': 1001, 'status': 'paid', 'totalAmount': 2500.00,
             'dateCreated': (datetime.utcnow() - timedelta(days=2)).isoformat()},
            {'id': 2, 'orderId': 1002, 'status': 'shipped', 'totalAmount': 1800.50,
             'dateCreated': (datetime.utcnow() - timedelta(days=1)).isoformat()},
            {'id': 3, 'orderId': 1003, 'status': 'delivered', 'totalAmount': 3200.00,
             'dateCreated': datetime.utcnow().isoformat()},
        ]
    })


@gerencia_bp.route('/api/gerencia/ml/shipments', methods=['GET'])
@require_role('gerencia')
def ml_shipments():
    shipments = MlShipment.query.order_by(MlShipment.id.desc()).limit(50).all()
    if shipments:
        return jsonify({'data': [s.to_dict() for s in shipments]})

    return jsonify({
        'data': [
            {'id': 1, 'shipmentId': 5001, 'status': 'delivered', 'carrier': 'Correo Argentino',
             'tracking': 'TA123456789AR'},
            {'id': 2, 'shipmentId': 5002, 'status': 'in_transit', 'carrier': 'OCA',
             'tracking': 'OC987654321'},
            {'id': 3, 'shipmentId': 5003, 'status': 'pending', 'carrier': 'Andreani',
             'tracking': 'AN456789123'},
        ]
    })


@gerencia_bp.route('/api/gerencia/ml/items', methods=['GET'])
@require_role('gerencia')
def ml_items():
    items = MlItem.query.order_by(MlItem.id.desc()).limit(50).all()
    if items:
        return jsonify({'data': [i.to_dict() for i in items]})

    return jsonify({
        'data': [
            {'id': 1, 'itemId': 'MLA101', 'title': 'Tubo de Gas 10kg', 'price': 4500.00,
             'availableQty': 50, 'status': 'active'},
            {'id': 2, 'itemId': 'MLA102', 'title': 'Tubo de Gas 15kg', 'price': 6200.00,
             'availableQty': 30, 'status': 'active'},
            {'id': 3, 'itemId': 'MLA103', 'title': 'Válvula de Seguridad', 'price': 850.00,
             'availableQty': 100, 'status': 'paused'},
        ]
    })


@gerencia_bp.route('/api/gerencia/ml/claims', methods=['GET'])
@require_role('gerencia')
def ml_claims():
    claims = MlClaimReturn.query.order_by(MlClaimReturn.id.desc()).limit(50).all()
    if claims:
        return jsonify({'data': [c.to_dict() for c in claims]})

    return jsonify({
        'data': [
            {'id': 1, 'claimId': 7001, 'type': 'claim', 'status': 'open'},
            {'id': 2, 'claimId': 7002, 'type': 'return', 'status': 'closed'},
            {'id': 3, 'claimId': 7003, 'type': 'claim', 'status': 'under_review'},
        ]
    })


@gerencia_bp.route('/api/gerencia/ml/questions', methods=['GET'])
@require_role('gerencia')
def ml_questions():
    questions = MlQuestion.query.order_by(MlQuestion.id.desc()).limit(50).all()
    if questions:
        return jsonify({'data': [q.to_dict() for q in questions]})

    return jsonify({
        'data': [
            {'id': 1, 'questionId': 9001, 'itemId': 'MLA101',
             'text': 'Tienen envío gratis?', 'answer': 'Sí, a todo el país', 'status': 'answered'},
            {'id': 2, 'questionId': 9002, 'itemId': 'MLA102',
             'text': 'Es compatible con cocina?', 'answer': None, 'status': 'unanswered'},
        ]
    })


# ─── MercadoPago ─────────────────────────────────────────────────────


@gerencia_bp.route('/api/gerencia/mp/payments', methods=['GET'])
@require_role('gerencia')
def mp_payments():
    payments = MpPayment.query.order_by(MpPayment.dateCreated.desc()).limit(50).all()
    if payments:
        return jsonify({'data': [p.to_dict() for p in payments]})

    return jsonify({
        'data': [
            {'id': 1, 'paymentId': 3001, 'status': 'approved', 'amount': 2500.00,
             'netReceived': 2350.00, 'dateCreated': (datetime.utcnow() - timedelta(days=1)).isoformat()},
            {'id': 2, 'paymentId': 3002, 'status': 'pending', 'amount': 1800.50,
             'netReceived': 0, 'dateCreated': datetime.utcnow().isoformat()},
            {'id': 3, 'paymentId': 3003, 'status': 'approved', 'amount': 3200.00,
             'netReceived': 3008.00, 'dateCreated': (datetime.utcnow() - timedelta(hours=6)).isoformat()},
        ]
    })


@gerencia_bp.route('/api/gerencia/mp/movements', methods=['GET'])
@require_role('gerencia')
def mp_movements():
    movements = MpAccountMovement.query.order_by(MpAccountMovement.date.desc()).limit(50).all()
    if movements:
        return jsonify({'data': [m.to_dict() for m in movements]})

    return jsonify({
        'data': [
            {'id': 1, 'sourceId': 100, 'type': 'payment', 'amount': 2500.00,
             'balance': 15000.00, 'date': (datetime.utcnow() - timedelta(days=1)).isoformat()},
            {'id': 2, 'sourceId': 101, 'type': 'release', 'amount': 5000.00,
             'balance': 20000.00, 'date': datetime.utcnow().isoformat()},
            {'id': 3, 'sourceId': 102, 'type': 'refund', 'amount': -500.00,
             'balance': 19500.00, 'date': datetime.utcnow().isoformat()},
        ]
    })


@gerencia_bp.route('/api/gerencia/mp/balance', methods=['GET'])
@require_role('gerencia')
def mp_balance():
    ultimo_mov = MpAccountMovement.query.order_by(MpAccountMovement.date.desc()).first()
    saldo_actual = ultimo_mov.balance if ultimo_mov else 0

    total_aprobados = db.session.query(func.coalesce(func.sum(MpPayment.amount), 0)).filter(
        MpPayment.status == 'approved'
    ).scalar() or 0

    total_pendientes = db.session.query(func.coalesce(func.sum(MpPayment.amount), 0)).filter(
        MpPayment.status == 'pending'
    ).scalar() or 0

    return jsonify({
        'data': {
            'saldoActual': float(saldo_actual),
            'totalAprobados': float(total_aprobados),
            'totalPendientes': float(total_pendientes),
            'disponible': float(saldo_actual) if saldo_actual else 0,
        }
    })


# ─── Conciliación ────────────────────────────────────────────────────


@gerencia_bp.route('/api/gerencia/conciliacion', methods=['GET'])
@require_role('gerencia')
def conciliacion():
    conciliaciones = ConciliacionOperacion.query.order_by(
        ConciliacionOperacion.fecha.desc()
    ).limit(100).all()

    if conciliaciones:
        return jsonify({'data': [c.to_dict() for c in conciliaciones]})

    orders_with_payments = db.session.query(
        MlOrder, MpPayment
    ).join(MpPayment, MpPayment.mlOrderId == MlOrder.id, isouter=True).limit(50).all()

    if orders_with_payments:
        result = []
        for order, payment in orders_with_payments:
            importe_orden = order.totalAmount or 0
            importe_pago = payment.amount if payment else 0
            diferencia = importe_orden - importe_pago
            result.append({
                'mlOrderId': order.orderId,
                'mpPaymentId': payment.paymentId if payment else None,
                'importeOrden': float(importe_orden),
                'importePago': float(importe_pago),
                'diferencia': float(diferencia),
                'alerta': 'ok' if abs(diferencia) < 0.01 else 'diferencia',
                'status': 'conciliado' if abs(diferencia) < 0.01 else 'pendiente',
                'fecha': order.dateCreated.isoformat() if order.dateCreated else None,
            })
        return jsonify({'data': result})

    return jsonify({
        'data': [
            {'mlOrderId': 1001, 'mpPaymentId': 3001, 'importeOrden': 2500.00,
             'importePago': 2500.00, 'diferencia': 0, 'alerta': 'ok',
             'status': 'conciliado', 'fecha': (datetime.utcnow() - timedelta(days=2)).isoformat()},
            {'mlOrderId': 1002, 'mpPaymentId': 3002, 'importeOrden': 1800.50,
             'importePago': 1800.50, 'diferencia': 0, 'alerta': 'ok',
             'status': 'conciliado', 'fecha': (datetime.utcnow() - timedelta(days=1)).isoformat()},
            {'mlOrderId': 1003, 'mpPaymentId': None, 'importeOrden': 3200.00,
             'importePago': 0, 'diferencia': 3200.00, 'alerta': 'critica',
             'status': 'pendiente', 'fecha': datetime.utcnow().isoformat()},
        ]
    })


# ─── Reportes Exportar ────────────────────────────────────────────────


@gerencia_bp.route('/api/gerencia/reportes/exportar', methods=['GET'])
@require_role('gerencia')
def exportar_reporte():
    formato = request.args.get('formato', 'csv')
    tipo = request.args.get('tipo', 'diario')

    hoy = datetime.utcnow()
    if tipo == 'diario':
        desde = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
    elif tipo == 'semanal':
        desde = hoy - timedelta(days=hoy.weekday())
        desde = desde.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    pedidos = Pedido.query.filter(Pedido.created_at >= desde).all()

    if formato == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Fecha', 'ClienteID', 'GasID', 'Total', 'Estado'])
        for p in pedidos:
            writer.writerow([
                p.id, p.created_at.isoformat() if p.created_at else '',
                p.clienteId, p.gasId, p.total, p.estado,
            ])
        csv_content = output.getvalue()
        output.close()

        return jsonify({
            'data': {
                'formato': 'csv',
                'tipo': tipo,
                'contenido': csv_content,
                'filename': f'reporte_{tipo}_{hoy.strftime("%Y%m%d")}.csv',
            }
        })

    return jsonify({
        'data': {
            'formato': 'json',
            'tipo': tipo,
            'contenido': [p.to_dict() for p in pedidos],
            'total': len(pedidos),
            'desde': desde.isoformat(),
            'hasta': hoy.isoformat(),
        }
    })
