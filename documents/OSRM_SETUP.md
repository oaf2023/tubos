# OSRM Local Setup

## Service

An optional `osrm-local` service is defined in `docker-compose.yml` (commented by default).
To enable it, uncomment the `osrm-local` block and set `OSRM_BASE_URL=http://osrm-local:5000` in your `.env`.

## Quick Start

1. Install OSRM backend tools:
```bash
# macOS
brew install osrm-backend

# Ubuntu/Debian
sudo apt install osrm-backend

# Windows via WSL or Docker (see docker-compose.yml)
```

2. Download OSM data for your region:
```bash
# Argentina
wget https://download.geofabrik.de/south-america/argentina-latest.osm.pbf

# Buenos Aires only
wget https://download.geofabrik.de/south-america/argentina/buenos-aires-latest.osm.pbf

# Santa Fe (includes San Nicolás area)
wget https://download.geofabrik.de/south-america/argentina/santa-fe-latest.osm.pbf
```

3. Pre-process for car routing:
```bash
osrm-extract argentina-latest.osm.pbf -p /opt/osrm-backend/profiles/car.lua
osrm-partition argentina-latest.osrb
osrm-customize argentina-latest.osrb
```

4. Start OSRM server:
```bash
osrm-routed --algorithm mld argentina-latest.osrm --port 5000
```

5. Test:
```bash
curl "http://localhost:5000/route/v1/driving/-60.2244,-33.3293;-60.2260,-33.3301?overview=false"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OSRM_BASE_URL` | `https://router.project-osrm.org` | OSRM server URL |

Set `OSRM_BASE_URL=http://localhost:5000` (or `http://osrm-local:5000` inside Docker) to use local OSRM.

## Fallback Chain

1. **OSRM Local** (`OSRM_LOCAL`): Used when `OSRM_BASE_URL` contains `localhost` and is reachable.
2. **OSRM Public** (`OSRM_PUBLIC`): Used when the public OSRM demo server is reachable.
3. **Haversine Estimated** (`HAVERSINE_ESTIMATED`): Pure straight-line estimation, no road geometry.

Real road-following geometry is only available from OSRM (local or public).
Haversine fallback produces dotted gray lines on the map with "SIN RUTEO REAL" warning.
