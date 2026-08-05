'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCheck, Bell } from 'lucide-react'

type Aviso = { id: string; mensaje: string }

type AvisoLoginBannerProps = {
  usuario: string
  tipoLogin: 'usuario' | 'gerencia' | 'cliente'
}

export default function AvisoLoginBanner({ usuario, tipoLogin }: AvisoLoginBannerProps) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [index, setIndex] = useState(0)
  const [cargando, setCargando] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  const usuarioTrim = usuario.trim()

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!usuarioTrim) {
      seqRef.current += 1
      setAvisos([])
      setIndex(0)
      return
    }

    const seq = ++seqRef.current
    timerRef.current = setTimeout(async () => {
      setCargando(true)
      try {
        const res = await fetch(`/api/avisos/consulta?usuario=${encodeURIComponent(usuarioTrim)}&tipoLogin=${tipoLogin}`)
        if (!res.ok) return
        const data = await res.json()
        if (seqRef.current !== seq) return
        setAvisos(data.avisos || [])
        setIndex(0)
      } catch { /* sin red */ } finally {
        if (seqRef.current === seq) setCargando(false)
      }
    }, 600)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [usuarioTrim, tipoLogin])

  const marcarLeido = useCallback(async (id: string) => {
    try {
      await fetch('/api/avisos/leer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioTrim, tipoLogin, avisoId: id }),
      })
    } catch { /* ignore */ }
    setAvisos((prev) => {
      const next = prev.filter((a) => a.id !== id)
      setIndex((i) => Math.min(i, Math.max(0, next.length - 1)))
      return next
    })
  }, [usuarioTrim, tipoLogin])

  if (!usuarioTrim || avisos.length === 0 || cargando) return null

  const aviso = avisos[index]

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-auto sm:bottom-6 sm:w-full sm:max-w-xl sm:mx-auto z-50 flex justify-center animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="w-full bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 rounded-xl shadow-lg shadow-black/30 px-3 py-2 flex items-center gap-2">
        <Bell className="w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide truncate">
            Mensaje para: {usuarioTrim}
          </p>
          <p className="text-xs sm:text-sm truncate" title={aviso.mensaje}>
            {aviso.mensaje}
          </p>
        </div>

        {avisos.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIndex((i) => (i - 1 + avisos.length) % avisos.length)}
              className="p-1 rounded-lg hover:bg-amber-500/30 transition-colors"
              aria-label="Aviso anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-semibold">{index + 1}/{avisos.length}</span>
            <button
              onClick={() => setIndex((i) => (i + 1) % avisos.length)}
              className="p-1 rounded-lg hover:bg-amber-500/30 transition-colors"
              aria-label="Aviso siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={() => marcarLeido(aviso.id)}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold bg-amber-900/20 hover:bg-amber-900/30 rounded-lg px-2 py-1.5 transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Entendido
        </button>
      </div>
    </div>
  )
}
