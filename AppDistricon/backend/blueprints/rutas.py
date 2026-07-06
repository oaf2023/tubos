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

rutas_bp = Blueprint('rutas_bp', __name__)


# ─── Rutas CRUD ─────────────────────────────────────────────────────────


@rutas_bp.route('/api/rutas', methods=['GET'])
@login_required
def list_rutas():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    estado = request.args.get('estado', '').strip()
    vehiculo_id = request.args.get('vehiculoId', type=int)
    conductor_id = request.args.get('conductorId', type=int)

    query = Ruta.query

    if estado:
        query = query.filter(Ruta.estado == estado)
    if vehiculo_id:
        query = query.filter(Ruta.vehicleId == vehiculo_id)
    if conductor_id:
        query = query.filter(Ruta.conductorId == conductor_id)

    query = query.order_by(Ruta.fecha.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@rutas_bp.route('/api/rutas', methods=['POST'])
@login_required
def create_ruta():
    data = request.get_json() or {}
    nombre = data.get('nombre', '').strip()

    if not nombre:
        return jsonify({'error': 'nombre es requerido'}), 400

    ruta = Ruta(
        nombre=nombre,
        fecha=_parse_dt(data.get('fecha')) or datetime.utcnow(),
        estado=data.get('estado', 'planificada'),
        origenLat=data.get('origenLat', type=float),
        origenLng=data.get('origenLng', type=float),
        distanciaKm=data.get('distanciaKm', type=float),
        duracionHoras=data.get('duracionHoras', type=float),
        geometry=json.dumps(data.get('geometry')) if data.get('geometry') else None,
        vehicleId=data.get('vehicleId', type=int),
        conductorId=data.get('conductorId', type=int),
    )
    db.session.add(ruta)
    db.session.flush()

    for idx, p_data in enumerate(data.get('paradas') or []):
        parada = RutaParada(
            rutaId=ruta.id,
            orden=p_data.get('orden', idx),
            lat=p_data.get('lat', type=float),
            lng=p_data.get('lng', type=float),
            nombre=p_data.get('nombre', ''),
            cylinderIds=json.dumps(p_data.get('cylinderIds')) if p_data.get('cylinderIds') else None,
            estado=p_data.get('estado', 'pendiente'),
            clienteId=p_data.get('clienteId', type=int),
        )
        db.session.add(parada)

    db.session.commit()
    return jsonify({'data': ruta.to_dict()}), 201


@rutas_bp.route('/api/rutas/<int:id>', methods=['GET'])
@login_required
def get_ruta(id):
    ruta = Ruta.query.get_or_404(id)
    result = ruta.to_dict()
    result['paradas'] = [p.to_dict() for p in ruta.paradas.order_by(RutaParada.orden.asc()).all()]
    result['vehicle'] = Vehiculo.query.get(ruta.vehicleId).to_dict() if ruta.vehicleId and Vehiculo.query.get(ruta.vehicleId) else None
    result['conductor'] = Usuario.query.get(ruta.conductorId).to_dict() if ruta.conductorId and Usuario.query.get(ruta.conductorId) else None
    return jsonify({'data': result})


@rutas_bp.route('/api/rutas/<int:id>', methods=['PUT'])
@login_required
def update_ruta(id):
    ruta = Ruta.query.get_or_404(id)
    data = request.get_json() or {}

    for field in ('nombre', 'estado'):
        if field in data:
            setattr(ruta, field, data[field])

    for field in ('origenLat', 'origenLng', 'distanciaKm', 'duracionHoras'):
        if field in data:
            setattr(ruta, field, data[field])

    if 'vehicleId' in data:
        ruta.vehicleId = data['vehicleId']
    if 'conductorId' in data:
        ruta.conductorId = data['conductorId']
    if 'geometry' in data:
        ruta.geometry = json.dumps(data['geometry']) if data['geometry'] else None
    if 'fecha' in data:
        ruta.fecha = _parse_dt(data['fecha'])

    if 'paradas' in data:
        RutaParada.query.filter_by(rutaId=id).delete()
        db.session.flush()
        for idx, p_data in enumerate(data['paradas']):
            parada = RutaParada(
                rutaId=id,
                orden=p_data.get('orden', idx),
                lat=p_data.get('lat', type=float),
                lng=p_data.get('lng', type=float),
                nombre=p_data.get('nombre', ''),
                cylinderIds=json.dumps(p_data.get('cylinderIds')) if p_data.get('cylinderIds') else None,
                estado=p_data.get('estado', 'pendiente'),
                clienteId=p_data.get('clienteId', type=int),
            )
            db.session.add(parada)

    db.session.commit()
    return jsonify({'data': ruta.to_dict()})


@rutas_bp.route('/api/rutas/<int:id>', methods=['DELETE'])
@login_required
def delete_ruta(id):
    ruta = Ruta.query.get_or_404(id)
    RutaParada.query.filter_by(rutaId=id).delete()
    UbicacionGPS.query.filter_by(rutaId=id).delete()
    SesionConductor.query.filter_by(rutaId=id).update({'rutaId': None})
    db.session.delete(ruta)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── Manifest / Paradas ────────────────────────────────────────────────


@rutas_bp.route('/api/rutas/<int:id>/manifest', methods=['GET'])
@login_required
def ruta_manifest(id):
    ruta = Ruta.query.get_or_404(id)
    paradas = ruta.paradas.order_by(RutaParada.orden.asc()).all()

    manifest = []
    seen = set()
    for p in paradas:
        cliente = Cliente.query.get(p.clienteId) if p.clienteId else None
        cylinder_ids = []
        try:
            cylinder_ids = json.loads(p.cylinderIds) if p.cylinderIds else []
        except (json.JSONDecodeError, TypeError):
            pass
        cylinders = []
        for cid in cylinder_ids:
            c = Cylinder.query.get(cid)
            if c and c.numeroSerie not in seen:
                seen.add(c.numeroSerie)
                cylinders.append(c.to_dict())
        manifest.append({
            'paradaId': p.id,
            'orden': p.orden,
            'nombre': p.nombre,
            'cliente': cliente.to_dict() if cliente else None,
            'estado': p.estado,
            'cylinders': cylinders,
        })

    return jsonify({'data': {'ruta': ruta.to_dict(), 'manifest': manifest}})


@rutas_bp.route('/api/rutas/<int:id>/paradas/<int:paradaId>', methods=['GET'])
@login_required
def get_parada(id, paradaId):
    ruta = Ruta.query.get_or_404(id)
    parada = RutaParada.query.filter_by(id=paradaId, rutaId=id).first_or_404()
    result = parada.to_dict()
    cliente = Cliente.query.get(parada.clienteId) if parada.clienteId else None
    result['cliente'] = cliente.to_dict() if cliente else None
    return jsonify({'data': result})


@rutas_bp.route('/api/rutas/<int:id>/paradas/<int:paradaId>', methods=['PUT'])
@login_required
def update_parada(id, paradaId):
    ruta = Ruta.query.get_or_404(id)
    parada = RutaParada.query.filter_by(id=paradaId, rutaId=id).first_or_404()
    data = request.get_json() or {}

    for field in ('orden', 'lat', 'lng', 'nombre', 'estado', 'clienteId'):
        if field in data:
            setattr(parada, field, data[field])

    if 'cylinderIds' in data:
        parada.cylinderIds = json.dumps(data['cylinderIds']) if data['cylinderIds'] else None

    db.session.commit()
    return jsonify({'data': parada.to_dict()})


@rutas_bp.route('/api/rutas/<int:id>/start-navigation', methods=['POST'])
@login_required
def start_navigation(id):
    ruta = Ruta.query.get_or_404(id)
    data = request.get_json() or {}

    ruta.estado = 'en_curso'
    if not ruta.navigationToken:
        ruta.navigationToken = hashlib.sha256(f'ruta-{ruta.id}:{datetime.utcnow().isoformat()}'.encode()).hexdigest()

    if 'vehicleId' in data:
        ruta.vehicleId = data['vehicleId']
    if 'conductorId' in data:
        ruta.conductorId = data['conductorId']

    db.session.commit()
    return jsonify({'data': ruta.to_dict()})


# ─── Routing / Matrix / Optimization ────────────────────────────────────


@rutas_bp.route('/api/routes/matrix', methods=['GET'])
@login_required
def route_matrix():
    origins_str = request.args.get('origins', '')
    destinations_str = request.args.get('destinations', '')

    if not origins_str or not destinations_str:
        return jsonify({'error': 'origins y destinations son requeridos'}), 400

    try:
        origins = json.loads(origins_str)
        destinations = json.loads(destinations_str)
    except (json.JSONDecodeError, TypeError):
        return jsonify({'error': 'Formato inválido. Enviar arrays JSON'}), 400

    matrix = []
    for o in origins:
        row = []
        for d in destinations:
            cache = RouteCache.query.filter_by(
                origenLat=o.get('lat'), origenLng=o.get('lng'),
                destLat=d.get('lat'), destLng=d.get('lng'),
            ).first()
            if cache:
                row.append({
                    'distanciaKm': cache.distanciaKm,
                    'duracionMin': cache.duracionMin,
                    'geometry': json.loads(cache.geometry) if cache.geometry else None,
                })
            else:
                import math
                dlat = (d.get('lat', 0) - o.get('lat', 0)) * math.pi / 180
                dlng = (d.get('lng', 0) - o.get('lng', 0)) * math.pi / 180
                a = math.sin(dlat / 2) ** 2 + math.cos(o.get('lat', 0) * math.pi / 180) * math.cos(d.get('lat', 0) * math.pi / 180) * math.sin(dlng / 2) ** 2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                dist_km = 6371 * c
                duration_min = dist_km * 2
                row.append({
                    'distanciaKm': round(dist_km, 2),
                    'duracionMin': round(duration_min, 1),
                    'geometry': None,
                })
        matrix.append(row)

    return jsonify({'data': matrix})


@rutas_bp.route('/api/routes/optimize', methods=['POST'])
@login_required
def optimize_route():
    data = request.get_json() or {}
    waypoints = data.get('waypoints', [])
    origin = data.get('origin')
    destination = data.get('destination')

    if not waypoints:
        return jsonify({'error': 'waypoints es requerido'}), 400

    ordered = sorted(waypoints, key=lambda w: w.get('orden', 0) if 'orden' in w else 0)

    ordered = sorted(ordered, key=lambda w: float(w.get('lat', 0)) + float(w.get('lng', 0)))

    return jsonify({
        'data': {
            'origin': origin,
            'destination': destination,
            'waypoints': ordered,
            'optimized': True,
        }
    })


@rutas_bp.route('/api/routing/vrp', methods=['POST'])
@login_required
def vrp_calculation():
    data = request.get_json() or {}
    stops = data.get('stops', [])
    vehicles = data.get('vehicles', [])

    if not stops or not vehicles:
        return jsonify({'error': 'stops y vehicles son requeridos'}), 400

    import random
    assignments = []
    for i, stop in enumerate(stops):
        v_idx = i % len(vehicles)
        assignments.append({
            'stop': stop,
            'vehicleIndex': v_idx,
            'vehicleId': vehicles[v_idx].get('id') if isinstance(vehicles[v_idx], dict) else vehicles[v_idx],
            'estimatedDurationMin': random.uniform(5, 30),
        })

    return jsonify({
        'data': {
            'assignments': assignments,
            'totalRoutes': len(vehicles),
            'totalStops': len(stops),
        }
    })


@rutas_bp.route('/api/routing/recalculate', methods=['POST'])
@login_required
def recalculate_route():
    data = request.get_json() or {}
    ruta_id = data.get('rutaId', type=int)

    if not ruta_id:
        return jsonify({'error': 'rutaId es requerido'}), 400

    ruta = Ruta.query.get_or_404(ruta_id)
    paradas = ruta.paradas.order_by(RutaParada.orden.asc()).all()

    total_km = 0
    prev = None
    for p in paradas:
        if prev is not None and p.lat and p.lng and prev.lat and prev.lng:
            import math
            dlat = (p.lat - prev.lat) * math.pi / 180
            dlng = (p.lng - prev.lng) * math.pi / 180
            a = math.sin(dlat / 2) ** 2 + math.cos(prev.lat * math.pi / 180) * math.cos(p.lat * math.pi / 180) * math.sin(dlng / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            total_km += 6371 * c
        prev = p

    ruta.distanciaKm = round(total_km, 2)
    ruta.duracionHoras = round(total_km / 40, 2)
    ruta.estado = 'recalculada'
    db.session.commit()

    RouteCalcLog(
        rutaId=ruta.id,
        engine='haversine',
        source='recalculate',
        distanceKm=ruta.distanciaKm,
        durationMin=ruta.duracionHoras * 60,
    )
    db.session.commit()

    return jsonify({'data': ruta.to_dict()})


@rutas_bp.route('/api/routing/route-complete', methods=['POST'])
@login_required
def route_complete():
    data = request.get_json() or {}
    ruta_id = data.get('rutaId', type=int)

    if not ruta_id:
        return jsonify({'error': 'rutaId es requerido'}), 400

    ruta = Ruta.query.get_or_404(ruta_id)
    ruta.estado = 'completada'

    RutaParada.query.filter_by(rutaId=ruta_id, estado='pendiente').update({'estado': 'completada'})
    SesionConductor.query.filter_by(rutaId=ruta_id, estaEnLinea=1).update({'estaEnLinea': 0})

    db.session.commit()
    return jsonify({'data': ruta.to_dict()})


# ─── Geocercas CRUD ─────────────────────────────────────────────────────


@rutas_bp.route('/api/geocercas', methods=['GET'])
@login_required
def list_geocercas():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    tipo = request.args.get('tipo', '').strip()

    query = Geocerca.query
    if tipo:
        query = query.filter(Geocerca.tipo == tipo)

    query = query.order_by(Geocerca.nombre.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [g.to_dict() for g in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@rutas_bp.route('/api/geocercas', methods=['POST'])
@login_required
def create_geocerca():
    data = request.get_json() or {}
    nombre = data.get('nombre', '').strip()

    if not nombre:
        return jsonify({'error': 'nombre es requerido'}), 400

    geocerca = Geocerca(
        nombre=nombre,
        lat=data.get('lat', type=float),
        lng=data.get('lng', type=float),
        radioMetros=data.get('radioMetros', type=float),
        polygon=json.dumps(data.get('polygon')) if data.get('polygon') else None,
        tipo=data.get('tipo', ''),
    )
    db.session.add(geocerca)
    db.session.commit()
    return jsonify({'data': geocerca.to_dict()}), 201


@rutas_bp.route('/api/geocercas/<int:id>', methods=['GET'])
@login_required
def get_geocerca(id):
    geocerca = Geocerca.query.get_or_404(id)
    result = geocerca.to_dict()
    if geocerca.polygon:
        try:
            result['polygon'] = json.loads(geocerca.polygon)
        except (json.JSONDecodeError, TypeError):
            pass
    return jsonify({'data': result})


@rutas_bp.route('/api/geocercas/<int:id>', methods=['PUT'])
@login_required
def update_geocerca(id):
    geocerca = Geocerca.query.get_or_404(id)
    data = request.get_json() or {}

    for field in ('nombre', 'tipo'):
        if field in data:
            setattr(geocerca, field, data[field])

    for field in ('lat', 'lng', 'radioMetros'):
        if field in data:
            setattr(geocerca, field, data[field])

    if 'polygon' in data:
        geocerca.polygon = json.dumps(data['polygon']) if data['polygon'] else None

    db.session.commit()
    return jsonify({'data': geocerca.to_dict()})


@rutas_bp.route('/api/geocercas/<int:id>', methods=['DELETE'])
@login_required
def delete_geocerca(id):
    geocerca = Geocerca.query.get_or_404(id)
    db.session.delete(geocerca)
    db.session.commit()
    return jsonify({'data': {'id': id, 'deleted': True}})


# ─── GPS ────────────────────────────────────────────────────────────────


@rutas_bp.route('/api/gps/ping', methods=['POST'])
@login_required
def gps_ping():
    data = request.get_json() or {}
    ruta_id = data.get('rutaId', type=int)
    vehiculo_id = data.get('vehiculoId', type=int)
    lat = data.get('lat', type=float)
    lng = data.get('lng', type=float)

    if lat is None or lng is None:
        return jsonify({'error': 'lat y lng son requeridos'}), 400

    ubicacion = UbicacionGPS(
        rutaId=ruta_id,
        vehiculoId=vehiculo_id,
        lat=lat,
        lng=lng,
        velocidad=data.get('velocidad', type=float),
        fuente=data.get('fuente', 'app'),
    )
    db.session.add(ubicacion)
    db.session.commit()
    return jsonify({'data': ubicacion.to_dict()}), 201


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
