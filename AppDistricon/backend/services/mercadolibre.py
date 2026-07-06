"""Mercado Libre API connector — mock by default."""
import os
import requests
from flask import current_app

API_BASE = 'https://api.mercadolibre.com'

def _headers():
    return {'Authorization': f'Bearer {current_app.config["MERCADOLIBRE_CLIENT_SECRET"]}'}

def get_orders(seller_id=None, limit=20, offset=0):
    if current_app.config.get('MOCK_MERCADO_LIBRE', True):
        return _mock_orders(limit)
    try:
        resp = requests.get(f'{API_BASE}/orders/search', headers=_headers(),
                            params={'seller': seller_id, 'limit': limit, 'offset': offset})
        resp.raise_for_status()
        return resp.json().get('results', [])
    except Exception as e:
        return _mock_orders(limit, error=str(e))

def get_shipments(seller_id=None, limit=10):
    if current_app.config.get('MOCK_MERCADO_LIBRE', True):
        return _mock_shipments(limit)
    return _mock_shipments(limit)

def get_items(seller_id=None, limit=15):
    if current_app.config.get('MOCK_MERCADO_LIBRE', True):
        return _mock_items(limit)
    return _mock_items(limit)

def get_claims(seller_id=None, limit=5):
    if current_app.config.get('MOCK_MERCADO_LIBRE', True):
        return _mock_claims(limit)
    return _mock_claims(limit)

def get_questions(seller_id=None, limit=8):
    if current_app.config.get('MOCK_MERCADO_LIBRE', True):
        return _mock_questions(limit)
    return _mock_questions(limit)

def _mock_orders(n):
    statuses = ['paid', 'shipped', 'delivered', 'cancelled', 'refunded']
    return [{'id': i, 'order_id': f'MLA-{2309800+i}', 'status': statuses[i%5],
             'total_amount': round(1500 + i*350 + (i*123)%500, 2),
             'date_created': f'2026-0{(i%9)+1}-{(i%28)+1:02d}T10:00:00.000-03:00',
             'items': [{'id': f'ITEM{i}0', 'title': f'Producto {i}', 'quantity': i%3+1, 'unit_price': 1200+i*50}]}
            for i in range(1, n+1)]

def _mock_shipments(n):
    statuses = ['pending', 'shipped', 'in_transit', 'delivered', 'delayed']
    return [{'id': i, 'shipment_id': 5000000+i, 'status': statuses[i%5],
             'carrier': 'OCA', 'tracking': f'TRACK{i:06d}'} for i in range(1, n+1)]

def _mock_items(n):
    return [{'id': f'MLA{i}', 'title': f'Artículo {i}', 'price': round(500 + i*100, 2),
             'available_quantity': 10+i, 'status': 'active'} for i in range(1, n+1)]

def _mock_claims(n):
    types = ['return', 'refund', 'complaint']
    statuses = ['open', 'in_progress', 'resolved']
    return [{'id': i, 'claim_id': 7000+i, 'type': types[i%3], 'status': statuses[i%3]} for i in range(1, n+1)]

def _mock_questions(n):
    return [{'id': i, 'question_id': 8000+i, 'item_id': f'MLA{i}',
             'text': f'¿Consulta sobre el producto {i}?', 'answer': None, 'status': 'UNANSWERED'}
            for i in range(1, n+1)]
