from flask import Flask

def register_blueprints(app: Flask):
    from .auth import auth_bp
    from .clientes import clientes_bp
    from .pedidos import pedidos_bp
    from .gases import gases_bp
    from .cylinders import cylinders_bp
    from .vehiculos import vehiculos_bp
    from .cabina import cabina_bp
    from .deposito import deposito_bp
    from .rfid import rfid_bp
    from .mobile import mobile_bp
    from .facturas import facturas_bp
    from .remitos import remitos_bp
    from .chofer import chofer_bp
    from .rutas import rutas_bp
    from .admin import admin_bp
    from .stats import stats_bp
    from .gerencia import gerencia_bp
    from .upload import upload_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(clientes_bp)
    app.register_blueprint(pedidos_bp)
    app.register_blueprint(gases_bp)
    app.register_blueprint(cylinders_bp)
    app.register_blueprint(vehiculos_bp)
    app.register_blueprint(cabina_bp)
    app.register_blueprint(deposito_bp)
    app.register_blueprint(rfid_bp)
    app.register_blueprint(mobile_bp)
    app.register_blueprint(facturas_bp)
    app.register_blueprint(remitos_bp)
    app.register_blueprint(chofer_bp)
    app.register_blueprint(rutas_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(gerencia_bp)
    app.register_blueprint(upload_bp)
