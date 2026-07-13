'use client'

import { useState } from 'react'
import { Navigation, MapPin, ExternalLink, Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type MapProvider = 'google' | 'waze' | 'osm'

const PROVIDERS: { key: MapProvider; label: string; color: string }[] = [
  { key: 'google', label: 'Google Maps', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { key: 'waze', label: 'Waze', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { key: 'osm', label: 'OpenStreetMap', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
]

export default function Navegar() {
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [provider, setProvider] = useState<MapProvider>('google')

  const buildUrl = () => {
    const d = encodeURIComponent(dest.trim() || 'Buenos Aires, Argentina')
    const o = origin.trim() ? encodeURIComponent(origin.trim()) : undefined

    switch (provider) {
      case 'google':
        return o
          ? `https://www.google.com/maps/dir/${o}/${d}`
          : `https://www.google.com/maps/search/${d}`
      case 'waze':
        return `https://www.waze.com/ul?q=${d}${o ? `&from=${o}` : ''}&navigate=yes`
      case 'osm':
        return o
          ? `https://www.openstreetmap.org/directions?from=${o}&to=${d}`
          : `https://www.openstreetmap.org/search?query=${d}`
    }
  }

  const openInNewTab = () => {
    const url = buildUrl()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const useCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => setOrigin(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => setOrigin(''),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }

  const quickDestinations = [
    'San Nicolás de los Arroyos, Buenos Aires',
    'Rosario, Santa Fe',
    'Buenos Aires, Argentina',
  ]

  return (
    <div className="space-y-4">
      {/* Provider selector */}
      <div className="flex gap-2">
        {PROVIDERS.map(p => (
          <button
            key={p.key}
            onClick={() => setProvider(p.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
              provider === p.key ? p.color : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Origin */}
      <div>
        <label className="block text-xs text-slate-500 mb-1 font-medium">Origen (opcional)</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              placeholder="Dirección actual..."
              className="pl-9 text-sm"
            />
          </div>
          <button
            onClick={useCurrentLocation}
            className="px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            title="Usar ubicación actual"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Destination */}
      <div>
        <label className="block text-xs text-slate-500 mb-1 font-medium">Destino *</label>
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
          <Input
            value={dest}
            onChange={e => setDest(e.target.value)}
            placeholder="Dirección, ciudad o coordenadas..."
            className="pl-9 text-sm"
            onKeyDown={e => e.key === 'Enter' && dest.trim() && openInNewTab()}
          />
        </div>
      </div>

      {/* Quick destinations */}
      <div className="flex flex-wrap gap-1.5">
        {quickDestinations.map(q => (
          <button
            key={q}
            onClick={() => setDest(q)}
            className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Open button */}
      <Button
        onClick={openInNewTab}
        disabled={!dest.trim()}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        Abrir en {PROVIDERS.find(p => p.key === provider)?.label}
      </Button>

      {/* Embedded map preview */}
      {dest.trim() && (
        <div className="rounded-xl overflow-hidden border border-slate-200 h-40 sm:h-48 bg-slate-50 flex items-center justify-center">
          <iframe
            title="map-preview"
            className="w-full h-full"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=-65,-40,-55,-30&layer=mapnik&marker=0,0`}
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  )
}
