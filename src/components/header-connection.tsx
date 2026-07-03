'use client'

import { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff, Cable, Smartphone, Signal, ChevronDown } from 'lucide-react'

type ConnType = 'wifi' | 'ethernet' | 'cellular' | 'unknown'

function getConnectionInfo(): { type: ConnType; downlink: string } {
  const conn = (navigator as any).connection
  if (!conn) return { type: 'unknown', downlink: '' }

  let type: ConnType = 'unknown'
  switch (conn.type) {
    case 'wifi': type = 'wifi'; break
    case 'ethernet': type = 'ethernet'; break
    case 'cellular': type = 'cellular'; break
    default: type = 'unknown'
  }

  const downlink = conn.downlink ? `${conn.downlink} Mbps` : ''
  return { type, downlink }
}

function getConnLabel(type: ConnType): string {
  switch (type) {
    case 'wifi': return 'WiFi'
    case 'ethernet': return 'Cable'
    case 'cellular': return 'Móvil'
    default: return 'Red'
  }
}

function ConnIcon({ type, online }: { type: ConnType; online: boolean }) {
  if (!online) return <WifiOff className="w-3.5 h-3.5 text-red-400" />

  switch (type) {
    case 'wifi': return <Wifi className="w-3.5 h-3.5 text-green-500" />
    case 'ethernet': return <Cable className="w-3.5 h-3.5 text-blue-500" />
    case 'cellular': return <Signal className="w-3.5 h-3.5 text-amber-500" />
    default: return <Wifi className="w-3.5 h-3.5 text-slate-400" />
  }
}

export default function HeaderConnection() {
  const [online, setOnline] = useState(true)
  const [connType, setConnType] = useState<ConnType>('unknown')
  const [downlink, setDownlink] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const updateConnection = () => {
    setOnline(navigator.onLine)
    const info = getConnectionInfo()
    setConnType(info.type)
    setDownlink(info.downlink)
  }

  useEffect(() => {
    updateConnection()

    const handleOnline = () => { setOnline(true); updateConnection() }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const conn = (navigator as any).connection
    if (conn) {
      conn.addEventListener('change', updateConnection)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (conn) conn.removeEventListener('change', updateConnection)
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-xs transition-colors ${
          online ? 'text-slate-500 hover:text-slate-700' : 'text-red-500 hover:text-red-600'
        }`}
        title={online ? `${getConnLabel(connType)} · Conectado` : 'Sin conexión'}
      >
        <ConnIcon type={connType} online={online} />
        <span className="hidden sm:inline font-medium">{online ? getConnLabel(connType) : 'Sin conexión'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
          <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-orange-500" />
            Estado de conexión
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Estado</span>
              <span className={`flex items-center gap-1 font-medium ${online ? 'text-green-600' : 'text-red-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
                {online ? 'En línea' : 'Sin conexión'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tipo</span>
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <ConnIcon type={connType} online={online} />
                {online ? getConnLabel(connType) : '—'}
              </span>
            </div>
            {downlink && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Velocidad</span>
                <span className="font-medium text-slate-700">{downlink}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
