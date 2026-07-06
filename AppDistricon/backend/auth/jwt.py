import jwt
import datetime
from flask import request, jsonify, current_app
from functools import wraps

ALGORITHM = 'HS256'

def create_session_token(user_data: dict) -> str:
    payload = {
        **user_data,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(
            hours=current_app.config['JWT_EXPIRATION_HOURS']
        ),
        'iat': datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET'], algorithm=ALGORITHM)

def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, current_app.config['JWT_SECRET'], algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_session_user():
    token = request.cookies.get('session')
    if not token:
        # Also check Authorization header
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:]
    if not token:
        return None
    payload = verify_token(token)
    if not payload:
        return None
    return payload
