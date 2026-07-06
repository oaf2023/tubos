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
import base64

upload_bp = Blueprint('upload_bp', __name__)

MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@upload_bp.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if request.content_type and 'multipart/form-data' in request.content_type:
        if 'file' not in request.files:
            return jsonify({'error': 'No se envió ningún archivo'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nombre de archivo vacío'}), 400
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        if size > MAX_SIZE:
            return jsonify({'error': 'El archivo excede los 5MB'}), 413
        raw = file.read()
        mime = file.content_type or 'application/octet-stream'
        b64 = base64.b64encode(raw).decode()
        data_uri = f'data:{mime};base64,{b64}'
        return jsonify({'data': {'url': data_uri, 'filename': file.filename, 'size': size}}), 201

    data = request.get_json() or {}
    image_b64 = data.get('image', '')
    if not image_b64:
        return jsonify({'error': 'Se requiere campo image (base64) o multipart file'}), 400

    raw = base64.b64decode(image_b64)
    if len(raw) > MAX_SIZE:
        return jsonify({'error': 'La imagen excede los 5MB'}), 413

    header, _, payload = image_b64.partition(',')
    mime = 'image/png'
    if header.startswith('data:'):
        mime = header[5:].split(';')[0]
    data_uri = f'data:{mime};base64,{payload}' if ';base64' in image_b64 else image_b64

    return jsonify({'data': {'url': data_uri, 'size': len(raw)}}), 201
