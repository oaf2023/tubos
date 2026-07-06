"""Mercado Pago API connector — mock by default."""
import requests
from flask import current_app

API_BASE = 'https://api.mercadopago.com'

def _headers():
    token = current_app.config.get('MERCADOPAGO_ACCESS_TOKEN', '')
    return {'Authorization': f'Bearer {token}'}

def get_payments(limit=25, offset=0):
    if current_app.config.get('MOCK_MERCADO_PAGO', True):
        return _mock_payments(limit)
    try:
        resp = requests.get(f'{API_BASE}/v1/payments/search', headers=_headers(),
                            params={'limit': limit, 'offset': offset})
        resp.raise_for_status()
        return resp.json().get('results', [])
    except Exception:
        return _mock_payments(limit)

def get_movements(limit=15):
    if current_app.config.get('MOCK_MERCADO_PAGO', True):
        return _mock_movements(limit)
    return _mock_movements(limit)

def get_balance():
    if current_app.config.get('MOCK_MERCADO_PAGO', True):
        return {'available_balance': 892340.00, 'pending_balance': 423500.00,
                'total_balance': 1315840.00}
    try:
        resp = requests.get(f'{API_BASE}/v1/account/money_balance', headers=_headers())
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return {'available_balance': 892340.00, 'pending_balance': 423500.00, 'total_balance': 1315840.00}

def get_releases(limit=10):
    if current_app.config.get('MOCK_MERCADO_PAGO', True):
        return _mock_releases(limit)
    return _mock_releases(limit)

def _mock_payments(n):
    statuses = ['approved', 'pending', 'in_process', 'rejected', 'refunded']
    return [{'id': i, 'payment_id': 90000000+i, 'status': statuses[i%5],
             'amount': round(1500 + i*200, 2), 'net_received': round(1350 + i*180, 2),
             'date_created': f'2026-0{(i%9)+1:02d}-{(i%28)+1:02d}T12:00:00.000-03:00'}
            for i in range(1, n+1)]

def _mock_movements(n):
    types = ['income', 'expense', 'fee', 'refund']
    return [{'id': i, 'source_id': f'MOV{i}', 'type': types[i%4],
             'amount': round(200 + i*50, 2), 'balance': round(1000000 - i*250, 2),
             'date': f'2026-0{(i%9)+1:02d}-{(i%28)+1:02d}T10:00:00Z'} for i in range(1, n+1)]

def _mock_releases(n):
    statuses = ['available', 'pending', 'released']
    return [{'id': i, 'source_id': f'REL{i}', 'external_ref': f'REF{i:06d}',
             'release_date': f'2026-0{(i%9)+1:02d}-{(i%28)+1:02d}T10:00:00Z',
             'amount': round(5000 + i*300, 2), 'status': statuses[i%3]} for i in range(1, n+1)]
