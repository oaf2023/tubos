from functools import wraps
from flask import jsonify, request
from .jwt import get_session_user

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_session_user()
        if not user:
            return jsonify({'error': 'No autorizado'}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated(*args, **kwargs):
            user_role = request.user.get('rol', '')
            if user_role not in roles:
                return jsonify({'error': 'Permisos insuficientes'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def optional_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_session_user()
        request.user = user
        return f(*args, **kwargs)
    return decorated
