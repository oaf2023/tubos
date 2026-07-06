import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from models.base import db
from blueprints import register_blueprints

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../frontend/out', static_url_path='')
    app.config.from_object(config_class)

    # Ensure data directory exists
    os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)

    db.init_app(app)
    CORS(app, supports_credentials=True)

    with app.app_context():
        db.create_all()
        register_blueprints(app)

    # Serve SPA frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        static_dir = app.static_folder
        if not static_dir or not os.path.isdir(static_dir):
            return {'error': 'Frontend not built. Run: cd frontend && npm run build'}, 503
        if path and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)
        index_path = os.path.join(static_dir, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_dir, 'index.html')
        return {'error': 'Frontend not found'}, 404

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
