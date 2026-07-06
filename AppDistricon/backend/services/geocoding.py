"""Geocoding via Nominatim (OpenStreetMap)."""
import requests
import time

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

def geocode(query: str, limit: int = 1) -> list[dict]:
    headers = {'User-Agent': 'AppDistricon/1.0 (gestion@appdistricon.com)'}
    try:
        resp = requests.get(NOMINATIM_URL, params={
            'q': query, 'format': 'json', 'limit': limit, 'addressdetails': 1,
        }, headers=headers, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        return [{
            'lat': float(r['lat']),
            'lng': float(r['lon']),
            'display_name': r.get('display_name', ''),
            'type': r.get('type', ''),
        } for r in results]
    except Exception as e:
        return []

def reverse_geocode(lat: float, lng: float) -> dict | None:
    headers = {'User-Agent': 'AppDistricon/1.0 (gestion@appdistricon.com)'}
    try:
        resp = requests.get('https://nominatim.openstreetmap.org/reverse',
                            params={'lat': lat, 'lon': lng, 'format': 'json',
                                    'addressdetails': 1},
                            headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            'display_name': data.get('display_name', ''),
            'address': data.get('address', {}),
        }
    except Exception:
        return None
