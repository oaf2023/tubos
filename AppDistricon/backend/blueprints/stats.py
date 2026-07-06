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

stats_bp = Blueprint('stats_bp', __name__)


@stats_bp.route('/api/stats', methods=['GET'])
@login_required
def general_stats():
    total_cylinders = Cylinder.query.count()
    total_clientes = Cliente.query.count()
    active_routes = Ruta.query.filter(Ruta.estado.in_(['en_curso', 'activa'])).count()
    total_vehiculos = Vehiculo.query.count()
    total_pedidos = Pedido.query.count()
    total_gases = Gas.query.count()

    cylinders_by_status = db.session.query(
        Cylinder.estado, func.count(Cylinder.id)
    ).group_by(Cylinder.estado).all()

    cylinders_ok = total_cylinders
    cylinders_alerta = 0
    for estado, count in cylinders_by_status:
        if estado in ('mantenimiento', 'baja'):
            cylinders_alerta += count

    return jsonify({
        'data': {
            'totalCylinders': total_cylinders,
            'totalClientes': total_clientes,
            'activeRoutes': active_routes,
            'totalVehiculos': total_vehiculos,
            'totalPedidos': total_pedidos,
            'totalGases': total_gases,
            'cylindersOk': cylinders_ok - cylinders_alerta,
            'cylindersAlerta': cylinders_alerta,
        }
    })


@stats_bp.route('/api/stats/finanzas', methods=['GET'])
@login_required
def finanzas_stats():
    from models import Factura
    hoy = datetime.utcnow()
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_facturado = db.session.query(func.coalesce(func.sum(Factura.total), 0)).filter(
        Factura.fecha >= inicio_mes
    ).scalar()

    total_cobrado = db.session.query(func.coalesce(func.sum(Factura.total), 0)).filter(
        Factura.fecha >= inicio_mes, Factura.estado == 'pagada'
    ).scalar()

    pendiente = db.session.query(func.coalesce(func.sum(Factura.total), 0)).filter(
        Factura.estado == 'pendiente'
    ).scalar()

    vencido = db.session.query(func.coalesce(func.sum(Factura.total), 0)).filter(
        Factura.estado == 'vencida'
    ).scalar()

    return jsonify({
        'data': {
            'totalFacturado': float(total_facturado),
            'totalCobrado': float(total_cobrado),
            'pendiente': float(pendiente),
            'vencido': float(vencido),
            'periodo': inicio_mes.isoformat(),
        }
    })


@stats_bp.route('/api/stats/analytics/panel-general', methods=['GET'])
@login_required
def panel_general():
    total_cylinders = Cylinder.query.count()
    activos = Cylinder.query.filter(Cylinder.estado == 'disponible').count()
    en_reparto = Cylinder.query.filter(Cylinder.estado == 'en_reparto').count()
    en_mantenimiento = Cylinder.query.filter(Cylinder.estado.in_(['mantenimiento', 'baja'])).count()

    return jsonify({
        'data': {
            'totalCylinders': total_cylinders,
            'cylindersActivos': activos,
            'cylindersEnReparto': en_reparto,
            'cylindersMantenimiento': en_mantenimiento,
            'tasaUso': round((activos / total_cylinders * 100) if total_cylinders else 0, 1),
        }
    })


@stats_bp.route('/api/stats/analytics/tablero', methods=['GET'])
@login_required
def tablero():
    hoy = datetime.utcnow()
    inicio_semana = hoy - timedelta(days=hoy.weekday())

    pedidos_semana = Pedido.query.filter(Pedido.created_at >= inicio_semana).count()
    rutas_activas = Ruta.query.filter(Ruta.estado.in_(['en_curso', 'activa'])).count()
    clientes_nuevos = Cliente.query.filter(Cliente.created_at >= inicio_semana).count()

    return jsonify({
        'data': {
            'pedidosSemana': pedidos_semana,
            'rutasActivas': rutas_activas,
            'clientesNuevos': clientes_nuevos,
            'timestamp': hoy.isoformat(),
        }
    })


@stats_bp.route('/api/stats/analytics/tendencias', methods=['GET'])
@login_required
def tendencias():
    dias = request.args.get('dias', 30, type=int)
    desde = datetime.utcnow() - timedelta(days=dias)

    pedidos_por_dia = db.session.query(
        func.date(Pedido.created_at).label('fecha'),
        func.count(Pedido.id).label('total'),
    ).filter(Pedido.created_at >= desde).group_by(func.date(Pedido.created_at)).order_by('fecha').all()

    pedidos_series = [{'fecha': str(r.fecha), 'total': r.total} for r in pedidos_por_dia]

    from models import Factura
    facturado_por_dia = db.session.query(
        func.date(Factura.fecha).label('fecha'),
        func.coalesce(func.sum(Factura.total), 0).label('total'),
    ).filter(Factura.fecha >= desde).group_by(func.date(Factura.fecha)).order_by('fecha').all()

    facturado_series = [{'fecha': str(r.fecha), 'total': float(r.total)} for r in facturado_por_dia]

    return jsonify({
        'data': {
            'pedidos': pedidos_series,
            'facturado': facturado_series,
            'desde': desde.isoformat(),
            'dias': dias,
        }
    })


@stats_bp.route('/api/stats/analytics/clientes', methods=['GET'])
@login_required
def analytics_clientes():
    total = Cliente.query.count()
    activos = Cliente.query.filter(Cliente.activo == 1).count()
    con_pedidos = db.session.query(func.count(func.distinct(Pedido.clienteId))).scalar() or 0

    top_clientes = db.session.query(
        Cliente.nombre,
        func.count(Pedido.id).label('total_pedidos'),
        func.coalesce(func.sum(Pedido.total), 0).label('total_gastado'),
    ).join(Pedido, Pedido.clienteId == Cliente.id, isouter=True
    ).group_by(Cliente.id, Cliente.nombre
    ).order_by(func.coalesce(func.sum(Pedido.total), 0).desc()).limit(10).all()

    return jsonify({
        'data': {
            'total': total,
            'activos': activos,
            'conPedidos': con_pedidos,
            'tasaActividad': round((con_pedidos / total * 100) if total else 0, 1),
            'topClientes': [
                {'nombre': r.nombre, 'totalPedidos': r.total_pedidos, 'totalGastado': float(r.total_gastado)}
                for r in top_clientes
            ],
        }
    })


@stats_bp.route('/api/stats/analytics/operaciones', methods=['GET'])
@login_required
def analytics_operaciones():
    total_pedidos = Pedido.query.count()
    pendientes = Pedido.query.filter(Pedido.estado == 'pendiente').count()
    completados = Pedido.query.filter(Pedido.estado == 'completado').count()

    from models import Remito
    total_remitos = Remito.query.count()

    return jsonify({
        'data': {
            'totalPedidos': total_pedidos,
            'pendientes': pendientes,
            'completados': completados,
            'totalRemitos': total_remitos,
            'tasaCompletitud': round((completados / total_pedidos * 100) if total_pedidos else 0, 1),
        }
    })


@stats_bp.route('/api/stats/analytics/logistica', methods=['GET'])
@login_required
def analytics_logistica():
    total_rutas = Ruta.query.count()
    completadas = Ruta.query.filter(Ruta.estado == 'completada').count()
    en_curso = Ruta.query.filter(Ruta.estado == 'en_curso').count()

    distancia_total = db.session.query(func.coalesce(func.sum(Ruta.distanciaKm), 0)).scalar() or 0

    return jsonify({
        'data': {
            'totalRutas': total_rutas,
            'completadas': completadas,
            'enCurso': en_curso,
            'distanciaTotalKm': float(distancia_total),
            'tasaCompletitud': round((completadas / total_rutas * 100) if total_rutas else 0, 1),
        }
    })


@stats_bp.route('/api/stats/analytics/calidad', methods=['GET'])
@login_required
def analytics_calidad():
    total = Cylinder.query.count()
    con_mantenimiento = Cylinder.query.filter(Cylinder.estado == 'mantenimiento').count()
    en_retest = Cylinder.query.filter(
        Cylinder.fechaProximoRetest.isnot(None),
        Cylinder.fechaProximoRetest <= datetime.utcnow() + timedelta(days=30),
    ).count()

    from models import Mantenimiento
    mantenimientos_mes = Mantenimiento.query.filter(
        Mantenimiento.fecha >= datetime.utcnow().replace(day=1)
    ).count()

    return jsonify({
        'data': {
            'totalCylinders': total,
            'enMantenimiento': con_mantenimiento,
            'proximoRetest': en_retest,
            'mantenimientosMes': mantenimientos_mes,
            'tasaMantenimiento': round((con_mantenimiento / total * 100) if total else 0, 1),
        }
    })


@stats_bp.route('/api/stats/analytics/financiero', methods=['GET'])
@login_required
def analytics_financiero():
    from models import Factura
    hoy = datetime.utcnow()
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    inicio_anio = hoy.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    mes = db.session.query(
        func.coalesce(func.sum(Factura.total), 0)
    ).filter(Factura.fecha >= inicio_mes).scalar() or 0

    anio = db.session.query(
        func.coalesce(func.sum(Factura.total), 0)
    ).filter(Factura.fecha >= inicio_anio).scalar() or 0

    impagos = db.session.query(func.coalesce(func.sum(Factura.total), 0)).filter(
        Factura.estado.in_(['pendiente', 'vencida'])
    ).scalar() or 0

    return jsonify({
        'data': {
            'facturadoMes': float(mes),
            'facturadoAnio': float(anio),
            'impagos': float(impagos),
            'promedioMensual': round(float(anio) / max((hoy.month - 1 if hoy.month > 1 else 1), 1), 2),
        }
    })


@stats_bp.route('/api/stats/analytics/rfid', methods=['GET'])
@login_required
def analytics_rfid():
    from models import EventoRFID, TagRFID
    total_tags = TagRFID.query.count()
    total_eventos = EventoRFID.query.count()
    eventos_hoy = EventoRFID.query.filter(
        EventoRFID.timestamp >= datetime.utcnow().replace(hour=0, minute=0, second=0)
    ).count()

    tags_sin_asignar = TagRFID.query.filter(TagRFID.cylinderId.is_(None)).count()

    return jsonify({
        'data': {
            'totalTags': total_tags,
            'totalEventos': total_eventos,
            'eventosHoy': eventos_hoy,
            'tagsSinAsignar': tags_sin_asignar,
            'tasaAsignacion': round(((total_tags - tags_sin_asignar) / total_tags * 100) if total_tags else 0, 1),
        }
    })
