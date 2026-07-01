import { useMemo } from 'react'

const TILE_SIZE = 256
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'

function lonToTileX(lng: number, zoom: number) {
  return Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
}

function latToTileY(lat: number, zoom: number) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
}

function lonToPixelX(lng: number, zoom: number) {
  return (lng + 180) / 360 * Math.pow(2, zoom) * TILE_SIZE
}

function latToPixelY(lat: number, zoom: number) {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom) * TILE_SIZE
}

interface StaticMapProps {
  lat: number
  lng: number
  zoom?: number
  className?: string
  height?: number
}

export default function StaticMap({ lat, lng, zoom = 14, className = '', height = 256 }: StaticMapProps) {
  const tiles = useMemo(() => {
    const xtile = lonToTileX(lng, zoom)
    const ytile = latToTileY(lat, zoom)
    const centerX = lonToPixelX(lng, zoom)
    const centerY = latToPixelY(lat, zoom)

    // Work out how many tiles needed to fill the viewport
    const cols = Math.ceil(height / TILE_SIZE) + 2
    const rows = Math.ceil(height / TILE_SIZE) + 2

    const result: { url: string; x: number; y: number }[] = []
    const startX = xtile - Math.floor(cols / 2)
    const startY = ytile - Math.floor(rows / 2)

    for (let dx = 0; dx < cols; dx++) {
      for (let dy = 0; dy < rows; dy++) {
        const tx = startX + dx
        const ty = startY + dy
        result.push({
          url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
          x: tx * TILE_SIZE - centerX + height / 2,
          y: ty * TILE_SIZE - centerY + height / 2,
        })
      }
    }
    return result
  }, [lat, lng, zoom, height])

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`} style={{ height }}>
      {tiles.map((t, i) => (
        <img
          key={i}
          src={t.url}
          alt=""
          className="absolute pointer-events-none"
          style={{ left: t.x, top: t.y, width: TILE_SIZE, height: TILE_SIZE }}
          loading="lazy"
          draggable={false}
        />
      ))}
      {/* Marker pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none drop-shadow-md">
        <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
          <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0zm0 19a5 5 0 110-10 5 5 0 010 10z" fill="#dc2626" stroke="#fff" strokeWidth="2" />
          <circle cx="14" cy="14" r="3" fill="#fff" />
        </svg>
      </div>
      {/* Attribution */}
      <div className="absolute bottom-1 left-1 bg-white/80 text-[9px] px-1.5 py-0.5 rounded leading-tight text-slate-500 pointer-events-none" dangerouslySetInnerHTML={{ __html: OSM_ATTRIBUTION }} />
      {/* Coordinates */}
      <div className="absolute top-1 right-1 bg-white/80 text-[9px] px-1.5 py-0.5 rounded font-mono text-slate-600 pointer-events-none leading-tight">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>
    </div>
  )
}
