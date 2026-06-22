'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  color: string
  label: string
  popup: string
  isBase?: boolean
  count?: number
}

export interface MapRoute {
  id: string
  color: string
  points: { lat: number; lng: number; nombre: string }[]
  nombre: string
  distanciaKm?: number
}

interface MapViewProps {
  markers: MapMarker[]
  routes?: MapRoute[]
  center?: [number, number]
  zoom?: number
  height?: string
  onSelectMarker?: (id: string) => void
}

// Crea un icono de marcador con color personalizado usando divIcon
function createColoredIcon(color: string, isBase = false, count?: number) {
  const size = isBase ? 36 : 28
  const ring = isBase ? 'box-shadow: 0 0 0 4px rgba(220,38,38,0.3);' : ''
  const label = count && count > 1 ? `<span style="position:absolute;top:-6px;right:-6px;background:#1e293b;color:white;border-radius:9px;padding:1px 5px;font-size:9px;font-weight:700;">${count}</span>` : ''
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <div style="width:${size}px;height:${size}px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);${ring}box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
      ${label}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

export default function MapView({
  markers,
  routes = [],
  center = [-33.3293, -60.2244], // San Nicolás de los Arroyos
  zoom = 6,
  height = '600px',
  onSelectMarker,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  // Inicializar mapa una sola vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    // Tiles de OpenStreetMap (sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // Forzar recálculo de tamaño
    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Actualizar marcadores y rutas cuando cambian
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return
    layerRef.current.clearLayers()

    // Dibujar rutas primero (debajo de los marcadores)
    routes.forEach((route) => {
      if (route.points.length < 2) return
      const latlngs = route.points.map((p) => [p.lat, p.lng]) as [number, number][]

      // Línea de ruta
      L.polyline(latlngs, {
        color: route.color,
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 8',
      }).addTo(layerRef.current!)

      // Marcadores numerados para cada parada
      route.points.forEach((p, idx) => {
        if (idx === 0) return // el origen es la base
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: 'route-stop',
            html: `<div style="background:${route.color};color:white;border:2px solid white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,0.4);">${idx}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .bindPopup(
            `<div style="font-family:system-ui,sans-serif;min-width:140px;">
              <strong style="color:${route.color}">Parada ${idx}</strong><br/>
              <strong>${p.nombre}</strong><br/>
              <span style="color:#64748b;font-size:11px;">${route.nombre}</span>
            </div>`
          )
          .addTo(layerRef.current!)
      })
    })

    // Marcadores de tubos
    markers.forEach((m) => {
      const icon = createColoredIcon(m.color, m.isBase, m.count)
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:180px;font-size:12px;">
            <div style="font-weight:700;font-size:13px;color:${m.color};margin-bottom:4px;">
              ${m.isBase ? '🏭 BASE OPERATIVA' : '🔩 TUBO DE GAS'}
            </div>
            <div style="font-weight:600;margin-bottom:2px;">${m.label}</div>
            <div style="color:#475569;line-height:1.4;">${m.popup}</div>
          </div>`
        )
        .addTo(layerRef.current!)

      if (onSelectMarker) {
        marker.on('click', () => onSelectMarker(m.id))
      }
    })

    // Ajustar vista si hay marcadores
    if (markers.length > 0 || routes.length > 0) {
      const allPoints: [number, number][] = []
      markers.forEach((m) => allPoints.push([m.lat, m.lng]))
      routes.forEach((r) =>
        r.points.forEach((p) => allPoints.push([p.lat, p.lng]))
      )
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints)
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
      }
    }
  }, [markers, routes, onSelectMarker])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
      className="border border-slate-200 shadow-sm z-0"
    />
  )
}
