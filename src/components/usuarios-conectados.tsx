'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

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
  const [conectados, setConectados] = useState<Conectado[]>([])
  const [showList, setShowList] = useState(false)
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
    if (!showList) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowList(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showList])

  if (!visible) return null

  const personal = conectados.filter((c) => c.tipo === 'PERSONAL')
  const choferes = conectados.filter((c) => c.tipo === 'CHOFER')
  const total = conectados.length

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setShowList((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors text-xs text-slate-600"
        aria-label="Usuarios conectados"
      >
        <div className="relative">
          <Users className="w-4 h-4" />
          {total > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold px-0.5">
              {total}
            </span>
          )}
        </div>
        <span className="hidden lg:inline">{total} online</span>
      </button>

      {showList && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-400 px-2 py-1">
              {total} usuario{total !== 1 ? 's' : ''} conectado{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="p-2 max-h-60 overflow-y-auto space-y-1">
            {conectados.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No hay usuarios conectados</p>
            )}
            {personal.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 py-1">Personal</p>
                {personal.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px]">{initials(c.nombre)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{c.nombre}</p>
                      <p className="text-[10px] text-slate-400">{c.rol}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
            {choferes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 py-1">Choferes</p>
                {choferes.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-orange-100 text-orange-700 text-[10px]">{initials(c.nombre)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{c.nombre}</p>
                      <p className="text-[10px] text-slate-400">{c.rol}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
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
