import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET = os.getenv('JWT_SECRET', 'dev-jwt-secret')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

    basedir = os.path.dirname(__file__)
    db_path = os.getenv('DATABASE_PATH', 'data/tubos.db')
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, db_path)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    COMPANY_NAME = os.getenv('COMPANY_NAME', 'AppDistricon')
    COMPANY_TAGLINE = os.getenv('COMPANY_TAGLINE', 'Control Digital')
    COMPANY_BASE_CITY = os.getenv('COMPANY_BASE_CITY', 'San Nicolás de los Arroyos')
    COMPANY_BASE_PROVINCE = os.getenv('COMPANY_BASE_PROVINCE', 'Buenos Aires')
    COMPANY_BASE_LAT = float(os.getenv('COMPANY_BASE_LAT', '-33.3292'))
    COMPANY_BASE_LNG = float(os.getenv('COMPANY_BASE_LNG', '-60.2265'))

    MOCK_MERCADO_LIBRE = os.getenv('MOCK_MERCADO_LIBRE', 'true').lower() == 'true'
    MERCADOLIBRE_CLIENT_ID = os.getenv('MERCADOLIBRE_CLIENT_ID', '')
    MERCADOLIBRE_CLIENT_SECRET = os.getenv('MERCADOLIBRE_CLIENT_SECRET', '')
    MERCADOLIBRE_REDIRECT_URI = os.getenv('MERCADOLIBRE_REDIRECT_URI', '')

    MOCK_MERCADO_PAGO = os.getenv('MOCK_MERCADO_PAGO', 'true').lower() == 'true'
    MERCADOPAGO_ACCESS_TOKEN = os.getenv('MERCADOPAGO_ACCESS_TOKEN', '')

    OSRM_BASE_URL = os.getenv('OSRM_BASE_URL', 'https://router.project-osrm.org')
    OR_TOOLS_URL = os.getenv('OR_TOOLS_URL', 'http://localhost:8000')
    UPLOAD_DIR = os.getenv('UPLOAD_DIR', 'public/uploads')
    EVENT_HASH_SALT = os.getenv('EVENT_HASH_SALT', 'change-this-salt')
