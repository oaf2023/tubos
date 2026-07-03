'use client'

import { useState, useEffect, useRef } from 'react'
import { Monitor, Smartphone, Tablet, Globe, Maximize2, User, Clock, Cpu, ChevronDown } from 'lucide-react'

function getOS(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Desconocido'
}

function getBrowser(): string {
  const ua = navigator.userAgent
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  return 'Otro'
}

function getDeviceIcon() {
  const ua = navigator.userAgent
  if (ua.includes('Android') || ua.includes('iPhone') || ua.includes('iPad')) {
    return ua.includes('iPad') ? Tablet : Smartphone
  }
  return Monitor
}

export default function HeaderDeviceInfo({ user }: { user?: any }) {
  const [open, setOpen] = useState(false)
  const [ip, setIp] = useState('')
  const [uptime, setUptime] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const start = Date.now()
    const update = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      setUptime(`${h}h ${m}m ${s}s`)
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => setIp(d.ip || ''))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const DeviceIcon = getDeviceIcon()
  const screenRes = typeof window !== 'undefined' ? `${screen.width}x${screen.height}` : ''
  const lang = typeof navigator !== 'undefined' ? navigator.language : ''

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        title="Información del equipo"
      >
        <DeviceIcon className="w-3.5 h-3.5 text-slate-400" />
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
          <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-orange-500" />
            Información del equipo
          </h4>

          {user && (
            <div className="mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user.nombre?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user.nombre || 'Usuario'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.rol || user.email || ''}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Sistema
              </span>
              <span className="font-medium text-slate-700">{getOS()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Navegador
              </span>
              <span className="font-medium text-slate-700">{getBrowser()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Maximize2 className="w-3 h-3" /> Resolución
              </span>
              <span className="font-medium text-slate-700">{screenRes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Idioma
              </span>
              <span className="font-medium text-slate-700">{lang}</span>
            </div>
            {ip && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> IP
                </span>
                <span className="font-medium text-slate-700 font-mono text-[10px]">{ip}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Sesión
              </span>
              <span className="font-medium text-slate-700">{uptime}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
