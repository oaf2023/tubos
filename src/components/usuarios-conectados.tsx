'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Users, X } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type Conectado = {
  id: string
  nombre: string
  rol: string
  usuario: string
  tipo: 'PERSONAL' | 'CHOFER'
}

function initials(nombre: string) {
  return nombre.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function UsuariosConectados() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [conectados, setConectados] = useState<Conectado[]>([])
  const [cargando, setCargando] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    const check = () => {
      const saved = sessionStorage.getItem('opencode_user')
      if (!saved) { setVisible(false); return }
      try {
        const u = JSON.parse(saved)
        setVisible(!!u.id && u.tipo !== 'cliente')
      } catch { setVisible(false) }
    }
    check()
    const interval = setInterval(check, 500)
    window.addEventListener('storage', check)
    return () => { clearInterval(interval); window.removeEventListener('storage', check) }
  }, [])

  const fetchConectados = useCallback(async () => {
    if (!activeRef.current) return
    try {
      const res = await fetch('/api/presencia/usuarios')
      if (!res.ok) return
      const data = await res.json()
      setConectados(data.conectados || [])
    } catch { /* sin red */ }
  }, [])

  const heartbeat = useCallback(async () => {
    if (!activeRef.current) return
    try {
      await fetch('/api/presencia/heartbeat', { method: 'POST' })
    } catch { /* sin red */ }
  }, [])

  useEffect(() => {
    if (!visible) return
    const onVis = () => { activeRef.current = document.visibilityState === 'visible' }
    document.addEventListener('visibilitychange', onVis)

    heartbeat()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        heartbeat()
        fetchConectados()
      }
    }, 4000)
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(interval) }
  }, [visible, heartbeat, fetchConectados])

  useEffect(() => {
    if (!open) return
    setCargando(true)
    fetchConectados().finally(() => setCargando(false))
  }, [open, fetchConectados])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!visible) return null

  const personal = conectados.filter((c) => c.tipo === 'PERSONAL')
  const choferes = conectados.filter((c) => c.tipo === 'CHOFER')

  return (
    <div className="fixed bottom-40 right-4 sm:bottom-44 sm:right-6 z-50" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          relative flex items-center gap-2 px-4 py-3
          rounded-2xl shadow-lg border border-amber-200
          bg-amber-50 text-amber-800
          hover:bg-amber-100 hover:shadow-xl
          active:scale-95
          transition-all duration-200
          text-sm font-medium
          touch-manipulation select-none
          ${open ? 'bg-amber-100 shadow-xl ring-2 ring-amber-300' : ''}
        `}
        aria-label="Usuarios conectados"
      >
        {open ? <X className="w-5 h-5" /> : <Users className="w-5 h-5" />}
        <span className="hidden sm:inline">Usuarios</span>
        <span className="inline sm:hidden text-xs">Users</span>
        {conectados.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
            {conectados.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-3 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-150">
          <div className="p-2 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 px-2 py-1">Usuarios conectados ({conectados.length})</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {cargando && conectados.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-3 text-center">Cargando…</p>
            )}
            {!cargando && conectados.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-3 text-center">Sin usuarios conectados</p>
            )}

            {personal.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase text-slate-400 px-2 pb-1">Personal</p>
                {personal.map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-amber-50">
                    <div className="relative">
                      <Avatar className="size-8 bg-amber-100 text-amber-800">
                        <AvatarFallback className="text-[10px]">{initials(u.nombre)}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{u.nombre}</p>
                      <p className="text-[10px] text-slate-400 capitalize truncate">{u.rol}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {choferes.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase text-slate-400 px-2 pb-1">Choferes</p>
                {choferes.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-emerald-50">
                    <div className="relative">
                      <Avatar className="size-8 bg-emerald-100 text-emerald-700">
                        <AvatarFallback className="text-[10px]">{initials(c.nombre)}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{c.nombre}</p>
                      <p className="text-[10px] text-emerald-600">En línea</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
