'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationPickerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  height?: string
}

export default function LocationPicker({ lat, lng, onChange, height = '250px' }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map)

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      onChange(pos.lat, pos.lng)
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      onChange(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // Update marker position when lat/lng props change (e.g., manual input)
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      const map = mapRef.current
      markerRef.current.setLatLng([lat, lng])
      map.setView([lat, lng], map.getZoom())
    }
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}
      className="border border-slate-300 shadow-sm z-0"
    />
  )
}
