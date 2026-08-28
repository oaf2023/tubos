'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCheck, Bell, MessageCircle } from 'lucide-react'

type Item =
  | { tipo: 'aviso'; id: string; mensaje: string }
  | { tipo: 'mensaje'; id: string; mensaje: string; emisorNombre: string; chatKey: string; esGeneral: boolean }

type AvisoLoginBannerProps = {
  usuario: string
  tipoLogin: 'usuario' | 'gerencia' | 'cliente'
}

export default function AvisoLoginBanner({ usuario, tipoLogin }: AvisoLoginBannerProps) {
  const [items, setItems] = useState<Item[]>([])
  const [index, setIndex] = useState(0)
  const [cargando, setCargando] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  const usuarioTrim = usuario.trim()

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!usuarioTrim) {
      seqRef.current += 1
      setItems([])
      setIndex(0)
      return
    }

    const seq = ++seqRef.current
    timerRef.current = setTimeout(async () => {
      setCargando(true)
      try {
        const qs = `usuario=${encodeURIComponent(usuarioTrim)}&tipoLogin=${tipoLogin}`
        const [resA, resM] = await Promise.all([
          fetch(`/api/avisos/consulta?${qs}`),
          fetch(`/api/mensajes/consulta-login?${qs}`),
        ])
        const [dataA, dataM] = await Promise.all([resA.json().catch(() => ({})), resM.json().catch(() => ({}))])
        if (seqRef.current !== seq) return
        const avisos: Item[] = (dataA.avisos || []).map((a: { id: string; mensaje: string }) => ({ tipo: 'aviso', ...a }))
        const mensajes: Item[] = (dataM.mensajes || []).map((m: { id: string; contenido: string; emisorNombre: string; chatKey: string; directo: boolean }) => ({
          tipo: 'mensaje',
          id: m.id,
          mensaje: m.contenido || (m.directo ? 'Te envió un adjunto' : 'Adjunto en el chat general'),
          emisorNombre: m.emisorNombre,
          chatKey: m.chatKey,
          esGeneral: !m.directo,
        }))
        setItems([...avisos, ...mensajes])
        setIndex(0)
      } catch { /* sin red */ } finally {
        if (seqRef.current === seq) setCargando(false)
      }
    }, 600)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [usuarioTrim, tipoLogin])

  const descartar = useCallback(async (item: Item) => {
    try {
      const body = item.tipo === 'aviso'
        ? { usuario: usuarioTrim, tipoLogin, avisoId: item.id }
        : { usuario: usuarioTrim, tipoLogin, chatKey: item.chatKey }
      await fetch(item.tipo === 'aviso' ? '/api/avisos/leer' : '/api/mensajes/leer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch { /* ignore */ }
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== item.id)
      setIndex((i) => Math.min(i, Math.max(0, next.length - 1)))
      return next
    })
  }, [usuarioTrim, tipoLogin])

  if (!usuarioTrim || items.length === 0 || cargando) return null

  const item = items[index]

  return (
    <div className="fixed top-16 left-3 right-3 sm:left-auto sm:right-auto sm:top-20 sm:w-full sm:max-w-xl sm:mx-auto z-50 flex justify-center animate-in slide-in-from-top-4 fade-in duration-200">
      <div className={`w-full rounded-xl shadow-lg shadow-black/30 px-3 py-2 flex items-center gap-2 ${item.tipo === 'aviso' ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950' : 'bg-gradient-to-r from-emerald-400 to-teal-400 text-emerald-950'}`}>
        {item.tipo === 'aviso' ? (
          <Bell className="w-4 h-4 shrink-0" />
        ) : (
          <MessageCircle className="w-4 h-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide truncate">
            {item.tipo === 'aviso'
              ? `Mensaje para: ${usuarioTrim}`
              : item.esGeneral
                ? `Chat general · ${item.emisorNombre}`
                : `Mensaje de ${item.emisorNombre}`}
          </p>
          <p className="text-xs sm:text-sm truncate" title={item.mensaje}>
            {item.mensaje}
          </p>
        </div>

        {items.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-semibold">{index + 1}/{items.length}</span>
            <button
              onClick={() => setIndex((i) => (i + 1) % items.length)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={() => descartar(item)}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold bg-black/10 hover:bg-black/20 rounded-lg px-2 py-1.5 transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Entendido
        </button>
      </div>
    </div>
  )
}
