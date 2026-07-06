"""
SQLAlchemy models — converted from Prisma schema (71 models)
SQLite-compatible: enums → String, BigInt → Integer, Boolean → Integer, Json → Text
"""

import json
from datetime import datetime, date
from .base import db

# ─── Helpers ─────────────────────────────────────────────────────

def auto_str(cls):
    def __str__(self):
        return f'<{cls.__name__} {self.id}>'
    cls.__str__ = __str__
    return cls

def to_dict(self):
    d = {}
    for c in self.__table__.columns:
        v = getattr(self, c.name)
        if isinstance(v, datetime):
            d[c.name] = v.isoformat()
        elif isinstance(v, date):
            d[c.name] = v.isoformat()
        elif isinstance(v, bytes):
            d[c.name] = v.decode()
        else:
            try:
                json.dumps(v)
                d[c.name] = v
            except (TypeError, ValueError):
                d[c.name] = str(v)
    return d

# ─── 1. Gases ────────────────────────────────────────────────────

@auto_str
class Gas(db.Model):
    __tablename__ = 'gas'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    presionBar = db.Column(db.Float)
    colorHex = db.Column(db.String(7))
    categoria = db.Column(db.String(20))  # CategoriaGas
    peligro = db.Column(db.String(20))    # PeligroGas
    precioAlquilerDiario = db.Column(db.Float, default=0)
    precioAlquilerMensual = db.Column(db.Float, default=0)
    precioVenta = db.Column(db.Float, default=0)

    cylinders = db.relationship('Cylinder', backref='gas', lazy='dynamic')
    alert_configs = db.relationship('AlertConfig', backref='gas', lazy='dynamic')
    pedidos = db.relationship('Pedido', backref='gas', lazy='dynamic')
    reglas_peso = db.relationship('ReglaPeso', backref='gas', lazy='dynamic')
    stock_gas = db.relationship('StockGas', backref='gas', uselist=False)
    movimientos_stock = db.relationship('MovimientoStock', backref='gas', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 2. Cylinders ────────────────────────────────────────────────

@auto_str
class Cylinder(db.Model):
    __tablename__ = 'cylinder'
    id = db.Column(db.Integer, primary_key=True)
    numeroSerie = db.Column(db.String(50), unique=True, nullable=False)
    propietario = db.Column(db.String(100))
    fabricante = db.Column(db.String(100))
    presionTrabajoBar = db.Column(db.Float)
    capacidadLitros = db.Column(db.Float)
    pesoTaraKg = db.Column(db.Float)
    pesoMaxLlenadoKg = db.Column(db.Float)
    presionEnsayoBar = db.Column(db.Float)
    fechaFabricacion = db.Column(db.DateTime)
    fechaProximoRetest = db.Column(db.DateTime)
    gasId = db.Column(db.Integer, db.ForeignKey('gas.id'))
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'))
    estado = db.Column(db.String(20), default='disponible')  # EstadoCilindro
    ubicacionLat = db.Column(db.Float)
    ubicacionLng = db.Column(db.Float)
    compatibleH2 = db.Column(db.Integer, default=0)
    ultimoMovimientoId = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    movimientos = db.relationship('CylinderMovimiento', backref='cylinder', lazy='dynamic')
    mantenimientos = db.relationship('Mantenimiento', backref='cylinder', lazy='dynamic')
    tags_rfid = db.relationship('TagRFID', backref='cylinder', lazy='dynamic')
    identificadores = db.relationship('IdentificadorTubo', backref='cylinder', lazy='dynamic')
    eventos_tubo = db.relationship('EventoTubo', backref='cylinder', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 3. CylinderMovimiento ──────────────────────────────────────

@auto_str
class CylinderMovimiento(db.Model):
    __tablename__ = 'cylinder_movimiento'
    id = db.Column(db.Integer, primary_key=True)
    cylinderId = db.Column(db.Integer, db.ForeignKey('cylinder.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    tipo = db.Column(db.String(20))  # TipoMovimiento
    descripcion = db.Column(db.Text)
    usuario = db.Column(db.String(100))
    latOrigen = db.Column(db.Float)
    lngOrigen = db.Column(db.Float)
    latDestino = db.Column(db.Float)
    lngDestino = db.Column(db.Float)

    def to_dict(self): return to_dict(self)

# ─── 4. Mantenimiento ───────────────────────────────────────────

@auto_str
class Mantenimiento(db.Model):
    __tablename__ = 'mantenimiento'
    id = db.Column(db.Integer, primary_key=True)
    cylinderId = db.Column(db.Integer, db.ForeignKey('cylinder.id'), nullable=False)
    tipo = db.Column(db.String(30))  # TipoMantenimiento
    descripcion = db.Column(db.Text)
    tecnico = db.Column(db.String(100))
    costo = db.Column(db.Float, default=0)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 5. Location ────────────────────────────────────────────────

@auto_str
class Location(db.Model):
    __tablename__ = 'location'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    provincia = db.Column(db.String(100))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    esBase = db.Column(db.Integer, default=0)
    tipo = db.Column(db.String(20))  # TipoUbicacion

    def to_dict(self): return to_dict(self)

# ─── 6. Cliente ─────────────────────────────────────────────────

@auto_str
class Cliente(db.Model):
    __tablename__ = 'cliente'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), unique=True, nullable=False)
    email = db.Column(db.String(200))
    telefono = db.Column(db.String(50))
    taxId = db.Column(db.String(20))
    contacto = db.Column(db.String(200))
    calle = db.Column(db.String(200))
    ciudad = db.Column(db.String(100))
    provincia = db.Column(db.String(100))
    condicionIva = db.Column(db.String(20))
    iibb = db.Column(db.String(50))
    limiteCredito = db.Column(db.Float, default=0)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    activo = db.Column(db.Integer, default=1)
    estadoCliente = db.Column(db.String(20))  # EstadoCliente
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cylinders = db.relationship('Cylinder', backref='cliente', lazy='dynamic')
    remitos = db.relationship('Remito', backref='cliente', lazy='dynamic')
    facturas = db.relationship('Factura', backref='cliente', lazy='dynamic')
    pedidos = db.relationship('Pedido', backref='cliente', lazy='dynamic')
    acceso = db.relationship('ClienteAcceso', backref='cliente', uselist=False)
    rutas_paradas = db.relationship('RutaParada', backref='cliente', lazy='dynamic')
    repartos = db.relationship('Reparto', backref='cliente', lazy='dynamic')
    eventos_tubo = db.relationship('EventoTubo', backref='cliente', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 7. ClienteAcceso ───────────────────────────────────────────

@auto_str
class ClienteAcceso(db.Model):
    __tablename__ = 'cliente_acceso'
    id = db.Column(db.Integer, primary_key=True)
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'), unique=True, nullable=False)
    usuario = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

    def to_dict(self):
        d = to_dict(self)
        d.pop('password', None)
        return d

# ─── 8. Remito ──────────────────────────────────────────────────

@auto_str
class Remito(db.Model):
    __tablename__ = 'remito'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(50), unique=True, nullable=False)
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    tipo = db.Column(db.String(20))  # TipoRemito
    estado = db.Column(db.String(20), default='pendiente')  # EstadoRemito
    observaciones = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('RemitoItem', backref='remito', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 9. RemitoItem ──────────────────────────────────────────────

@auto_str
class RemitoItem(db.Model):
    __tablename__ = 'remito_item'
    id = db.Column(db.Integer, primary_key=True)
    remitoId = db.Column(db.Integer, db.ForeignKey('remito.id'), nullable=False)
    cylinderId = db.Column(db.Integer, db.ForeignKey('cylinder.id'))
    numeroSerie = db.Column(db.String(50))
    gasCodigo = db.Column(db.String(20))
    tipoOperacion = db.Column(db.String(20))
    cantidad = db.Column(db.Integer, default=1)
    precioUnitario = db.Column(db.Float, default=0)

    def to_dict(self): return to_dict(self)

# ─── 10. Factura ────────────────────────────────────────────────

@auto_str
class Factura(db.Model):
    __tablename__ = 'factura'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(50), unique=True, nullable=False)
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    fechaVencimiento = db.Column(db.DateTime)
    subtotal = db.Column(db.Float, default=0)
    descuento = db.Column(db.Float, default=0)
    impuestos = db.Column(db.Float, default=0)
    total = db.Column(db.Float, default=0)
    totalGeneral = db.Column(db.Float, default=0)
    estado = db.Column(db.String(20), default='pendiente')  # EstadoFactura
    observaciones = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('FacturaItem', backref='factura', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 11. FacturaItem ────────────────────────────────────────────

@auto_str
class FacturaItem(db.Model):
    __tablename__ = 'factura_item'
    id = db.Column(db.Integer, primary_key=True)
    facturaId = db.Column(db.Integer, db.ForeignKey('factura.id'), nullable=False)
    concepto = db.Column(db.String(200))
    tipo = db.Column(db.String(20))  # TipoItemFactura
    cantidad = db.Column(db.Integer, default=1)
    precioUnitario = db.Column(db.Float, default=0)
    subtotal = db.Column(db.Float, default=0)

    def to_dict(self): return to_dict(self)

# ─── 12. AlertConfig ────────────────────────────────────────────

@auto_str
class AlertConfig(db.Model):
    __tablename__ = 'alert_config'
    id = db.Column(db.Integer, primary_key=True)
    gasId = db.Column(db.Integer, db.ForeignKey('gas.id'), unique=True, nullable=False)
    diasAlertaRetest = db.Column(db.Integer, default=30)
    diasMaxCliente = db.Column(db.Integer, default=90)
    alertaPH = db.Column(db.Integer, default=0)

    def to_dict(self): return to_dict(self)

# ─── 13. Ruta ───────────────────────────────────────────────────

@auto_str
class Ruta(db.Model):
    __tablename__ = 'ruta'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200))
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default='planificada')  # EstadoRuta
    origenLat = db.Column(db.Float)
    origenLng = db.Column(db.Float)
    distanciaKm = db.Column(db.Float)
    duracionHoras = db.Column(db.Float)
    geometry = db.Column(db.Text)  # JSON string
    vehicleId = db.Column(db.Integer, db.ForeignKey('vehiculo.id'))
    conductorId = db.Column(db.Integer, db.ForeignKey('usuario.id'))
    navigationToken = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    paradas = db.relationship('RutaParada', backref='ruta', lazy='dynamic', order_by='RutaParada.orden')
    ubicaciones_gps = db.relationship('UbicacionGPS', backref='ruta', lazy='dynamic')
    sesiones_conductor = db.relationship('SesionConductor', backref='ruta', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 14. RutaParada ─────────────────────────────────────────────

@auto_str
class RutaParada(db.Model):
    __tablename__ = 'ruta_parada'
    id = db.Column(db.Integer, primary_key=True)
    rutaId = db.Column(db.Integer, db.ForeignKey('ruta.id'), nullable=False)
    orden = db.Column(db.Integer, default=0)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    nombre = db.Column(db.String(200))
    cylinderIds = db.Column(db.Text)  # JSON array string
    estado = db.Column(db.String(20), default='pendiente')  # EstadoParada
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'))

    def to_dict(self): return to_dict(self)

# ─── 15. RouteCache ─────────────────────────────────────────────

@auto_str
class RouteCache(db.Model):
    __tablename__ = 'route_cache'
    id = db.Column(db.Integer, primary_key=True)
    hash = db.Column(db.String(64), unique=True, nullable=False)
    origenLat = db.Column(db.Float)
    origenLng = db.Column(db.Float)
    destLat = db.Column(db.Float)
    destLng = db.Column(db.Float)
    distanciaKm = db.Column(db.Float)
    duracionMin = db.Column(db.Float)
    geometry = db.Column(db.Text)  # JSON string

    def to_dict(self): return to_dict(self)

# ─── 16. Pedido ─────────────────────────────────────────────────

@auto_str
class Pedido(db.Model):
    __tablename__ = 'pedido'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    gasId = db.Column(db.Integer, db.ForeignKey('gas.id'), nullable=False)
    operacionEnvase = db.Column(db.String(20))  # OperacionEnvase
    total = db.Column(db.Float, default=0)
    estado = db.Column(db.String(20), default='pendiente')  # EstadoPedido
    capacidadLitros = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('PedidoItem', backref='pedido', lazy='dynamic')
    cilindros = db.relationship('PedidoCilindro', backref='pedido', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 17. PedidoItem ─────────────────────────────────────────────

@auto_str
class PedidoItem(db.Model):
    __tablename__ = 'pedido_item'
    id = db.Column(db.Integer, primary_key=True)
    pedidoId = db.Column(db.Integer, db.ForeignKey('pedido.id'), nullable=False)
    concepto = db.Column(db.String(200))
    monto = db.Column(db.Float, default=0)

    def to_dict(self): return to_dict(self)

# ─── 18. PedidoCilindro ─────────────────────────────────────────

@auto_str
class PedidoCilindro(db.Model):
    __tablename__ = 'pedido_cilindro'
    id = db.Column(db.Integer, primary_key=True)
    pedidoId = db.Column(db.Integer, db.ForeignKey('pedido.id'), nullable=False)
    numeroSerie = db.Column(db.String(50))
    gasCodigo = db.Column(db.String(20))
    verified = db.Column(db.Integer, default=0)

    def to_dict(self): return to_dict(self)

# ─── 19. TipoOperacionPedido ────────────────────────────────────

@auto_str
class TipoOperacionPedido(db.Model):
    __tablename__ = 'tipo_operacion_pedido'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    activo = db.Column(db.Integer, default=1)
    orden = db.Column(db.Integer, default=0)

    def to_dict(self): return to_dict(self)

# ─── 20. Rol ────────────────────────────────────────────────────

@auto_str
class Rol(db.Model):
    __tablename__ = 'rol'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    descripcion = db.Column(db.String(200))

    usuarios = db.relationship('Usuario', backref='rol', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 21. Usuario ────────────────────────────────────────────────

@auto_str
class Usuario(db.Model):
    __tablename__ = 'usuario'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(200))
    usuario = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    activo = db.Column(db.Integer, default=1)
    nivelAcceso = db.Column(db.Integer, default=5)
    rolId = db.Column(db.Integer, db.ForeignKey('rol.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        d = to_dict(self)
        d.pop('password', None)
        d['rol'] = self.rol.to_dict() if self.rol else None
        return d

# ─── 22. Observacion ────────────────────────────────────────────

@auto_str
class Observacion(db.Model):
    __tablename__ = 'observacion'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(30))  # TipoObservacion
    titulo = db.Column(db.String(200))
    descripcion = db.Column(db.Text)
    audioUrl = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    archivos = db.relationship('ObservacionArchivo', backref='observacion', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 23. ObservacionArchivo ─────────────────────────────────────

@auto_str
class ObservacionArchivo(db.Model):
    __tablename__ = 'observacion_archivo'
    id = db.Column(db.Integer, primary_key=True)
    observacionId = db.Column(db.Integer, db.ForeignKey('observacion.id'), nullable=False)
    tipo = db.Column(db.String(20))  # TipoArchivoObservacion
    nombre = db.Column(db.String(200))
    datos = db.Column(db.Text)  # base64
    archivoUrl = db.Column(db.String(500))

    def to_dict(self): return to_dict(self)

# ─── 24. Vehiculo ───────────────────────────────────────────────

@auto_str
class Vehiculo(db.Model):
    __tablename__ = 'vehiculo'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    patente = db.Column(db.String(20), unique=True, nullable=False)
    marca = db.Column(db.String(50))
    modelo = db.Column(db.String(50))
    anio = db.Column(db.Integer)
    tipo = db.Column(db.String(20))  # TipoVehiculo
    combustible = db.Column(db.String(20))  # CombustibleVehiculo
    kmActual = db.Column(db.Integer, default=0)
    estado = db.Column(db.String(20), default='disponible')
    largoCajaCm = db.Column(db.Float)
    maxTubos = db.Column(db.Integer, default=0)
    orientacionTubos = db.Column(db.String(20))  # OrientacionTubos
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    cargas = db.relationship('CargaVehiculo', backref='vehiculo', lazy='dynamic')
    mantenimientos = db.relationship('MantenimientoVehiculo', backref='vehiculo', lazy='dynamic')
    documentos = db.relationship('DocumentoVehiculo', backref='vehiculo', lazy='dynamic')
    cargas_combustible = db.relationship('CargaCombustible', backref='vehiculo', lazy='dynamic')
    rutas = db.relationship('Ruta', backref='vehiculo', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 25–29: Vehiculo children ────────────────────────────────────

@auto_str
class CargaVehiculo(db.Model):
    __tablename__ = 'carga_vehiculo'
    id = db.Column(db.Integer, primary_key=True)
    vehiculoId = db.Column(db.Integer, db.ForeignKey('vehiculo.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default='activa')

    items = db.relationship('CargaVehiculoItem', backref='carga', lazy='dynamic')

    def to_dict(self): return to_dict(self)

@auto_str
class CargaVehiculoItem(db.Model):
    __tablename__ = 'carga_vehiculo_item'
    id = db.Column(db.Integer, primary_key=True)
    cargaId = db.Column(db.Integer, db.ForeignKey('carga_vehiculo.id'), nullable=False)
    cylinderId = db.Column(db.Integer, db.ForeignKey('cylinder.id'), nullable=False)
    posicion = db.Column(db.Integer)

    def to_dict(self): return to_dict(self)

@auto_str
class MantenimientoVehiculo(db.Model):
    __tablename__ = 'mantenimiento_vehiculo'
    id = db.Column(db.Integer, primary_key=True)
    vehiculoId = db.Column(db.Integer, db.ForeignKey('vehiculo.id'), nullable=False)
    tipo = db.Column(db.String(30))
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    descripcion = db.Column(db.Text)
    costo = db.Column(db.Float, default=0)
    estado = db.Column(db.String(20), default='pendiente')

    def to_dict(self): return to_dict(self)

@auto_str
class CargaCombustible(db.Model):
    __tablename__ = 'carga_combustible'
    id = db.Column(db.Integer, primary_key=True)
    vehiculoId = db.Column(db.Integer, db.ForeignKey('vehiculo.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    litros = db.Column(db.Float)
    costo = db.Column(db.Float)
    kmActual = db.Column(db.Integer)

    def to_dict(self): return to_dict(self)

@auto_str
class DocumentoVehiculo(db.Model):
    __tablename__ = 'documento_vehiculo'
    id = db.Column(db.Integer, primary_key=True)
    vehiculoId = db.Column(db.Integer, db.ForeignKey('vehiculo.id'), nullable=False)
    tipo = db.Column(db.String(30))
    numero = db.Column(db.String(50))
    fechaVencimiento = db.Column(db.DateTime)
    estado = db.Column(db.String(20), default='vigente')

    def to_dict(self): return to_dict(self)

# ─── 30. ZonaLectura ────────────────────────────────────────────

@auto_str
class ZonaLectura(db.Model):
    __tablename__ = 'zona_lectura'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(100))
    tipo = db.Column(db.String(20))  # TipoZonaLectura

    lectores = db.relationship('LectorIoT', backref='zona', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 31. LectorIoT ──────────────────────────────────────────────

@auto_str
class LectorIoT(db.Model):
    __tablename__ = 'lector_iot'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(100))
    tipo = db.Column(db.String(20))  # TipoLector
    ip = db.Column(db.String(45))
    zonaLecturaId = db.Column(db.Integer, db.ForeignKey('zona_lectura.id'))

    eventos = db.relationship('EventoRFID', backref='lector', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 32. TagRFID ────────────────────────────────────────────────

@auto_str
class TagRFID(db.Model):
    __tablename__ = 'tag_rfid'
    id = db.Column(db.Integer, primary_key=True)
    tid = db.Column(db.String(50), unique=True, nullable=False)
    cylinderId = db.Column(db.Integer, db.ForeignKey('cylinder.id'))

    def to_dict(self): return to_dict(self)

# ─── 33. EventoRFID ─────────────────────────────────────────────

@auto_str
class EventoRFID(db.Model):
    __tablename__ = 'evento_rfid'
    id = db.Column(db.Integer, primary_key=True)
    tid = db.Column(db.String(50))
    lectorId = db.Column(db.Integer, db.ForeignKey('lector_iot.id'))
    zonaId = db.Column(db.Integer, db.ForeignKey('zona_lectura.id'))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    estadoAnterior = db.Column(db.String(30))
    estadoNuevo = db.Column(db.String(30))

    def to_dict(self): return to_dict(self)

# ─── 34. SesionLecturaRFID ──────────────────────────────────────

@auto_str
class SesionLecturaRFID(db.Model):
    __tablename__ = 'sesion_lectura_rfid'
    id = db.Column(db.Integer, primary_key=True)
    lectorId = db.Column(db.Integer)
    zonaId = db.Column(db.Integer)
    tid = db.Column(db.String(50))
    cylinderId = db.Column(db.Integer)
    inicio = db.Column(db.DateTime)
    fin = db.Column(db.DateTime)
    conteo = db.Column(db.Integer, default=0)
    procesado = db.Column(db.Integer, default=0)

    def to_dict(self): return to_dict(self)

# ─── 35. StockGas ───────────────────────────────────────────────

@auto_str
class StockGas(db.Model):
    __tablename__ = 'stock_gas'
    id = db.Column(db.Integer, primary_key=True)
    gasId = db.Column(db.Integer, db.ForeignKey('gas.id'), unique=True, nullable=False)
    llenos = db.Column(db.Integer, default=0)
    vacios = db.Column(db.Integer, default=0)
    enReparto = db.Column(db.Integer, default=0)
    enCarga = db.Column(db.Integer, default=0)
    mantenimiento = db.Column(db.Integer, default=0)
    baja = db.Column(db.Integer, default=0)

    def to_dict(self): return to_dict(self)

# ─── 36. MovimientoStock ────────────────────────────────────────

@auto_str
class MovimientoStock(db.Model):
    __tablename__ = 'movimiento_stock'
    id = db.Column(db.Integer, primary_key=True)
    gasId = db.Column(db.Integer, db.ForeignKey('gas.id'), nullable=False)
    tipo = db.Column(db.String(20))
    cantidad = db.Column(db.Integer, default=0)
    eventoRfidId = db.Column(db.Integer, db.ForeignKey('evento_rfid.id'))
    fecha = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 37. Reparto ────────────────────────────────────────────────

@auto_str
class Reparto(db.Model):
    __tablename__ = 'reparto'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'))
    estado = db.Column(db.String(20), default='pendiente')

    def to_dict(self): return to_dict(self)

# ─── 38–43: Cabina ──────────────────────────────────────────────

@auto_str
class Cabina(db.Model):
    __tablename__ = 'cabina'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(100))
    ubicacion = db.Column(db.String(200))

    sensores = db.relationship('SensorCabina', backref='cabina', lazy='dynamic')

    def to_dict(self): return to_dict(self)

@auto_str
class SensorCabina(db.Model):
    __tablename__ = 'sensor_cabina'
    id = db.Column(db.Integer, primary_key=True)
    cabinaId = db.Column(db.Integer, db.ForeignKey('cabina.id'), nullable=False)
    tipo = db.Column(db.String(20))  # TipoSensorCabina
    codigo = db.Column(db.String(50))
    configuracion = db.Column(db.Text)  # JSON string

    def to_dict(self): return to_dict(self)

@auto_str
class LecturaPeso(db.Model):
    __tablename__ = 'lectura_peso'
    id = db.Column(db.Integer, primary_key=True)
    cabinaId = db.Column(db.Integer)
    cylinderId = db.Column(db.Integer)
    pesoKg = db.Column(db.Float)
    sensorId = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

@auto_str
class EvidenciaFoto(db.Model):
    __tablename__ = 'evidencia_foto'
    id = db.Column(db.Integer, primary_key=True)
    cabinaId = db.Column(db.Integer)
    cylinderId = db.Column(db.Integer)
    imagen = db.Column(db.Text)  # base64
    imagenUrl = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

@auto_str
class ValidacionCabina(db.Model):
    __tablename__ = 'validacion_cabina'
    id = db.Column(db.Integer, primary_key=True)
    cabinaId = db.Column(db.Integer)
    cylinderId = db.Column(db.Integer)
    lecturaPesoId = db.Column(db.Integer)
    evidenciaFotoId = db.Column(db.Integer)
    diagnostico = db.Column(db.Text)  # JSON string
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

@auto_str
class ReglaPeso(db.Model):
    __tablename__ = 'regla_peso'
    id = db.Column(db.Integer, primary_key=True)
    gasId = db.Column(db.Integer, db.ForeignKey('gas.id'), unique=True, nullable=False)
    pesoMinKg = db.Column(db.Float)
    pesoMaxKg = db.Column(db.Float)
    pesoTaraKg = db.Column(db.Float)
    pesoLlenoKg = db.Column(db.Float)

    def to_dict(self): return to_dict(self)

# ─── 44. EventoTrazabilidad ─────────────────────────────────────

@auto_str
class EventoTrazabilidad(db.Model):
    __tablename__ = 'evento_trazabilidad'
    id = db.Column(db.Integer, primary_key=True)
    cabinaId = db.Column(db.Integer)
    cylinderId = db.Column(db.Integer)
    tipo = db.Column(db.String(30))
    descripcion = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 45. Alerta ─────────────────────────────────────────────────

@auto_str
class Alerta(db.Model):
    __tablename__ = 'alerta'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(30))  # TipoAlerta
    cabinaId = db.Column(db.Integer)
    cylinderId = db.Column(db.Integer)
    mensaje = db.Column(db.Text)
    nivel = db.Column(db.String(20))  # NivelAlerta
    leida = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 46. AuditLog ───────────────────────────────────────────────

@auto_str
class AuditLog(db.Model):
    __tablename__ = 'audit_log'
    id = db.Column(db.Integer, primary_key=True)
    accion = db.Column(db.String(30))  # AccionAudit
    entidad = db.Column(db.String(50))
    entidadId = db.Column(db.String(50))
    usuario = db.Column(db.String(100))
    detalle = db.Column(db.Text)  # JSON string
    direccionIp = db.Column(db.String(45))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 47. Geocerca ───────────────────────────────────────────────

@auto_str
class Geocerca(db.Model):
    __tablename__ = 'geocerca'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    radioMetros = db.Column(db.Float)
    polygon = db.Column(db.Text)  # JSON string
    tipo = db.Column(db.String(20))  # TipoGeocerca

    def to_dict(self): return to_dict(self)

# ─── 48. UbicacionGPS ───────────────────────────────────────────

@auto_str
class UbicacionGPS(db.Model):
    __tablename__ = 'ubicacion_gps'
    id = db.Column(db.Integer, primary_key=True)
    rutaId = db.Column(db.Integer, db.ForeignKey('ruta.id'))
    vehiculoId = db.Column(db.Integer)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    velocidad = db.Column(db.Float)
    fuente = db.Column(db.String(20))  # FuenteGPS
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 49. SesionConductor ────────────────────────────────────────

@auto_str
class SesionConductor(db.Model):
    __tablename__ = 'sesion_conductor'
    id = db.Column(db.Integer, primary_key=True)
    conductorId = db.Column(db.Integer, db.ForeignKey('usuario.id'))
    rutaId = db.Column(db.Integer, db.ForeignKey('ruta.id'))
    token = db.Column(db.String(100), unique=True, nullable=False)
    estaEnLinea = db.Column(db.Integer, default=0)
    ultimoHeartbeat = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 50. TrafficHistory ─────────────────────────────────────────

@auto_str
class TrafficHistory(db.Model):
    __tablename__ = 'traffic_history'
    id = db.Column(db.Integer, primary_key=True)
    tramoHash = db.Column(db.String(64))
    origenLat = db.Column(db.Float)
    origenLng = db.Column(db.Float)
    destLat = db.Column(db.Float)
    destLng = db.Column(db.Float)
    hora = db.Column(db.Integer)
    diaSemana = db.Column(db.Integer)
    velocidad = db.Column(db.Float)

    __table_args__ = (db.Index('ix_traffic_tramo', 'tramoHash', 'hora', 'diaSemana'),)

    def to_dict(self): return to_dict(self)

# ─── 51. IdentificadorTubo ──────────────────────────────────────

@auto_str
class IdentificadorTubo(db.Model):
    __tablename__ = 'identificador_tubo'
    id = db.Column(db.Integer, primary_key=True)
    cylinderId = db.Column(db.Integer, db.ForeignKey('cylinder.id'))
    tipo = db.Column(db.String(20))  # TipoIdentificador
    valor = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self): return to_dict(self)

# ─── 52. EventoTubo ─────────────────────────────────────────────

@auto_str
class EventoTubo(db.Model):
    __tablename__ = 'evento_tubo'
    id = db.Column(db.Integer, primary_key=True)
    cylinderId = db.Column(db.Integer, db.ForeignKey('cylinder.id'))
    fechaHora = db.Column(db.DateTime, default=datetime.utcnow)
    origen = db.Column(db.String(20))  # OrigenLectura
    accion = db.Column(db.String(30))
    usuarioId = db.Column(db.Integer)
    clienteId = db.Column(db.Integer, db.ForeignKey('cliente.id'))
    latitud = db.Column(db.Float)
    longitud = db.Column(db.Float)
    fotoUrl = db.Column(db.String(500))

    def to_dict(self): return to_dict(self)

# ─── 53–54: PedidoLectura ────────────────────────────────────────

@auto_str
class PedidoLectura(db.Model):
    __tablename__ = 'pedido_lectura'
    id = db.Column(db.Integer, primary_key=True)
    clienteId = db.Column(db.Integer)
    estado = db.Column(db.String(20), default='pendiente')  # EstadoPedidoLectura
    prioridad = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('PedidoLecturaItem', backref='pedido', lazy='dynamic')

    def to_dict(self): return to_dict(self)

@auto_str
class PedidoLecturaItem(db.Model):
    __tablename__ = 'pedido_lectura_item'
    id = db.Column(db.Integer, primary_key=True)
    pedidoId = db.Column(db.Integer, db.ForeignKey('pedido_lectura.id'))
    cylinderId = db.Column(db.Integer)
    accion = db.Column(db.String(20))
    cantidad = db.Column(db.Integer, default=1)

    def to_dict(self): return to_dict(self)

# ─── 55. RouteCalcLog ───────────────────────────────────────────

@auto_str
class RouteCalcLog(db.Model):
    __tablename__ = 'route_calc_log'
    id = db.Column(db.Integer, primary_key=True)
    rutaId = db.Column(db.Integer)
    engine = db.Column(db.String(50))
    source = db.Column(db.String(50))
    distanceKm = db.Column(db.Float)
    durationMin = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 56. IdempotencyKey ─────────────────────────────────────────

@auto_str
class IdempotencyKey(db.Model):
    __tablename__ = 'idempotency_key'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    response = db.Column(db.Text)  # JSON string
    status = db.Column(db.Integer)
    expiresAt = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self): return to_dict(self)

# ─── 57–58: ComprobanteHistorico ─────────────────────────────────

@auto_str
class ComprobanteHistorico(db.Model):
    __tablename__ = 'comprobante_historico'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime)
    tipo = db.Column(db.String(20))
    cbteCompleto = db.Column(db.Text)  # JSON string
    clienteId = db.Column(db.Integer)
    netoGravado = db.Column(db.Float)
    iva21 = db.Column(db.Float)
    total = db.Column(db.Float)

    items = db.relationship('ComprobanteItemHistorico', backref='comprobante', lazy='dynamic')

    def to_dict(self): return to_dict(self)

@auto_str
class ComprobanteItemHistorico(db.Model):
    __tablename__ = 'comprobante_item_historico'
    id = db.Column(db.Integer, primary_key=True)
    comprobanteId = db.Column(db.Integer, db.ForeignKey('comprobante_historico.id'))
    descripcion = db.Column(db.String(200))
    cantidad = db.Column(db.Integer)
    precioUnitario = db.Column(db.Float)
    subtotal = db.Column(db.Float)

    def to_dict(self): return to_dict(self)

# ─── 59. CuentaCorrienteMovimiento ──────────────────────────────

@auto_str
class CuentaCorrienteMovimiento(db.Model):
    __tablename__ = 'cuenta_corriente_movimiento'
    id = db.Column(db.Integer, primary_key=True)
    clienteId = db.Column(db.Integer)
    comprobante = db.Column(db.String(50))
    fecha = db.Column(db.DateTime)
    debe = db.Column(db.Float, default=0)
    haber = db.Column(db.Float, default=0)
    saldo = db.Column(db.Float, default=0)

    __table_args__ = (db.Index('ix_ctacte_cliente', 'clienteId'),)

    def to_dict(self): return to_dict(self)

# ─── 60. SellerAccount ──────────────────────────────────────────

@auto_str
class SellerAccount(db.Model):
    __tablename__ = 'seller_account'
    id = db.Column(db.Integer, primary_key=True)
    sellerId = db.Column(db.Integer)
    siteId = db.Column(db.String(10))
    accessToken = db.Column(db.Text)
    refreshToken = db.Column(db.Text)
    expiresAt = db.Column(db.DateTime)

    ml_orders = db.relationship('MlOrder', backref='seller', lazy='dynamic')
    ml_items = db.relationship('MlItem', backref='seller', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 61. MlOrder ────────────────────────────────────────────────

@auto_str
class MlOrder(db.Model):
    __tablename__ = 'ml_order'
    id = db.Column(db.Integer, primary_key=True)
    orderId = db.Column(db.Integer, unique=True, nullable=False)
    packId = db.Column(db.Integer)
    sellerAccountId = db.Column(db.Integer, db.ForeignKey('seller_account.id'))
    status = db.Column(db.String(30))
    totalAmount = db.Column(db.Float)
    dateCreated = db.Column(db.DateTime)
    dateClosed = db.Column(db.DateTime)

    items = db.relationship('MlOrderItem', backref='order', lazy='dynamic')
    shipments = db.relationship('MlShipment', backref='order', lazy='dynamic')
    claims = db.relationship('MlClaimReturn', backref='order', lazy='dynamic')
    payments = db.relationship('MpPayment', backref='order', lazy='dynamic')

    def to_dict(self): return to_dict(self)

# ─── 62. MlOrderItem ────────────────────────────────────────────

@auto_str
class MlOrderItem(db.Model):
    __tablename__ = 'ml_order_item'
    id = db.Column(db.Integer, primary_key=True)
    orderId = db.Column(db.Integer, db.ForeignKey('ml_order.id'))
    itemId = db.Column(db.String(30))
    title = db.Column(db.String(200))
    quantity = db.Column(db.Integer)
    unitPrice = db.Column(db.Float)

    def to_dict(self): return to_dict(self)

# ─── 63. MlShipment ─────────────────────────────────────────────

@auto_str
class MlShipment(db.Model):
    __tablename__ = 'ml_shipment'
    id = db.Column(db.Integer, primary_key=True)
    shipmentId = db.Column(db.Integer, unique=True, nullable=False)
    orderId = db.Column(db.Integer, db.ForeignKey('ml_order.id'))
    status = db.Column(db.String(30))
    carrier = db.Column(db.String(50))
    tracking = db.Column(db.String(100))

    def to_dict(self): return to_dict(self)

# ─── 64. MlClaimReturn ──────────────────────────────────────────

@auto_str
class MlClaimReturn(db.Model):
    __tablename__ = 'ml_claim_return'
    id = db.Column(db.Integer, primary_key=True)
    claimId = db.Column(db.Integer, unique=True, nullable=False)
    mlOrderId = db.Column(db.Integer, db.ForeignKey('ml_order.id'))
    type = db.Column(db.String(30))
    status = db.Column(db.String(30))

    def to_dict(self): return to_dict(self)

# ─── 65. MlQuestion ─────────────────────────────────────────────

@auto_str
class MlQuestion(db.Model):
    __tablename__ = 'ml_question'
    id = db.Column(db.Integer, primary_key=True)
    questionId = db.Column(db.Integer, unique=True, nullable=False)
    itemId = db.Column(db.String(30))
    text = db.Column(db.Text)
    answer = db.Column(db.Text)
    status = db.Column(db.String(30))

    def to_dict(self): return to_dict(self)

# ─── 66. MlItem ─────────────────────────────────────────────────

@auto_str
class MlItem(db.Model):
    __tablename__ = 'ml_item'
    id = db.Column(db.Integer, primary_key=True)
    itemId = db.Column(db.String(30), unique=True, nullable=False)
    sellerAccountId = db.Column(db.Integer, db.ForeignKey('seller_account.id'))
    title = db.Column(db.String(200))
    price = db.Column(db.Float)
    availableQty = db.Column(db.Integer)
    status = db.Column(db.String(30))

    def to_dict(self): return to_dict(self)

# ─── 67. MpPayment ──────────────────────────────────────────────

@auto_str
class MpPayment(db.Model):
    __tablename__ = 'mp_payment'
    id = db.Column(db.Integer, primary_key=True)
    paymentId = db.Column(db.Integer, unique=True, nullable=False)
    mlOrderId = db.Column(db.Integer, db.ForeignKey('ml_order.id'))
    status = db.Column(db.String(30))
    amount = db.Column(db.Float)
    netReceived = db.Column(db.Float)
    dateCreated = db.Column(db.DateTime)

    def to_dict(self): return to_dict(self)

# ─── 68. MpAccountMovement ──────────────────────────────────────

@auto_str
class MpAccountMovement(db.Model):
    __tablename__ = 'mp_account_movement'
    id = db.Column(db.Integer, primary_key=True)
    sourceId = db.Column(db.Integer)
    type = db.Column(db.String(30))
    amount = db.Column(db.Float)
    balance = db.Column(db.Float)
    date = db.Column(db.DateTime)

    def to_dict(self): return to_dict(self)

# ─── 69. MpReleaseReport ────────────────────────────────────────

@auto_str
class MpReleaseReport(db.Model):
    __tablename__ = 'mp_release_report'
    id = db.Column(db.Integer, primary_key=True)
    sourceId = db.Column(db.Integer)
    externalRef = db.Column(db.String(50))
    releaseDate = db.Column(db.DateTime)
    amount = db.Column(db.Float)
    status = db.Column(db.String(30))

    def to_dict(self): return to_dict(self)

# ─── 70. ConciliacionOperacion ──────────────────────────────────

@auto_str
class ConciliacionOperacion(db.Model):
    __tablename__ = 'conciliacion_operacion'
    id = db.Column(db.Integer, primary_key=True)
    mlOrderId = db.Column(db.Integer)
    mpPaymentId = db.Column(db.Integer)
    importeOrden = db.Column(db.Float)
    importePago = db.Column(db.Float)
    diferencia = db.Column(db.Float)
    alerta = db.Column(db.String(30))
    status = db.Column(db.String(20))
    fecha = db.Column(db.DateTime)

    def to_dict(self): return to_dict(self)

# ─── 71. AuditoriaSincronizacion ────────────────────────────────

@auto_str
class AuditoriaSincronizacion(db.Model):
    __tablename__ = 'auditoria_sincronizacion'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(30))
    fechaInicio = db.Column(db.DateTime)
    fechaFin = db.Column(db.DateTime)
    estado = db.Column(db.String(20))
    registrosNuevos = db.Column(db.Integer, default=0)

    def to_dict(self): return to_dict(self)
