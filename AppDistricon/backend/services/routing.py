"""OSRM routing client."""
import requests
from flask import current_app

def get_route(origin_lat, origin_lng, dest_lat, dest_lng):
    base = current_app.config.get('OSRM_BASE_URL', 'https://router.project-osrm.org')
    url = f'{base}/route/v1/driving/{origin_lng},{origin_lat};{dest_lng},{dest_lat}'
    try:
        resp = requests.get(url, params={'overview': 'full', 'geometries': 'geojson'}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data.get('code') != 'Ok' or not data.get('routes'):
            return None
        route = data['routes'][0]
        return {
            'distance_km': round(route['distance'] / 1000, 2),
            'duration_min': round(route['duration'] / 60, 1),
            'geometry': route.get('geometry'),
        }
    except Exception:
        return None

def get_distance_matrix(coords):
    """coords: list of (lat, lng) tuples"""
    base = current_app.config.get('OSRM_BASE_URL', 'https://router.project-osrm.org')
    lnglat = ';'.join(f'{lng},{lat}' for lat, lng in coords)
    url = f'{base}/table/v1/driving/{lnglat}'
    try:
        resp = requests.get(url, params={'annotations': 'distance,duration'}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get('code') != 'Ok':
            return None
        return {
            'distances': data.get('distances', []),
            'durations': data.get('durations', []),
            'sources': data.get('sources', []),
            'destinations': data.get('destinations', []),
        }
    except Exception:
        return None

def snap_to_road(lat, lng):
    base = current_app.config.get('OSRM_BASE_URL', 'https://router.project-osrm.org')
    url = f'{base}/nearest/v1/driving/{lng},{lat}'
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        if data.get('code') != 'Ok' or not data.get('waypoints'):
            return None
        wp = data['waypoints'][0]
        return {'lat': wp['location'][1], 'lng': wp['location'][0], 'distance': wp['distance']}
    except Exception:
        return None

def match_to_road(trace):
    """trace: list of (lat, lng) tuples"""
    base = current_app.config.get('OSRM_BASE_URL', 'https://router.project-osrm.org')
    coords = ';'.join(f'{lng},{lat}' for lat, lng in trace)
    url = f'{base}/match/v1/driving/{coords}'
    try:
        resp = requests.get(url, params={'geometries': 'geojson'}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data.get('code') != 'Ok':
            return None
        return data
    except Exception:
        return None
