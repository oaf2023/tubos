'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageCircle, Send, Smile, Paperclip, ArrowLeft, CheckCheck, FileText,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export type ChatWidgetProps = {
  modo?: 'usuario' | 'chofer'
  token?: string | null
}

type Yo = { emisorId: string; emisorNombre: string; emisorTipo: 'USUARIO' | 'CHOFER' }

type Mensaje = {
  id: string
  emisorId: string
  emisorNombre: string
  emisorTipo: string
  receptorId: string | null
  contenido: string
  tipo: string
  adjuntoUrl: string | null
  adjuntoNombre: string | null
  adjuntoMime: string | null
  leido: boolean
  createdAt: string
}

type Contacto = { id: string; nombre: string; usuario: string; online?: boolean }

type Conversacion =
  | { key: 'general'; titulo: string; subtitulo: string; online: boolean }
  | { key: string; titulo: string; subtitulo: string; online: boolean }

const EMOJIS = ['😀', '😄', '😂', '🙂', '😉', '😊', '😍', '🤔', '😅', '🙃', '😴', '👍', '👌', '🙌', '👏', '🤝', '💪', '❤️', '🔥', '⭐', '🎉', '✅', '📦', '🚚', '🏭', '📋', '☎️', '❗', '❓', '🕐', '☀️', '🌧️']

function initials(nombre: string) {
  return nombre.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function fmtHora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function ChatWidget({ modo = 'usuario', token = null }: ChatWidgetProps) {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [yo, setYo] = useState<Yo | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [usuarios, setUsuarios] = useState<Contacto[]>([])
  const [choferes, setChoferes] = useState<Contacto[]>([])
  const [generalNoLeidos, setGeneralNoLeidos] = useState(0)
  const [porChat, setPorChat] = useState<Record<string, number>>({})
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [escribiendo, setEscribiendo] = useState<{ emisorNombre: string; chatKey: string }[]>([])
  const [conversacion, setConversacion] = useState<Conversacion | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [previews, setPreviews] = useState<Mensaje[]>([])
  const [ultimoTs, setUltimoTs] = useState<string | null>(null)
  const [carganInicial, setCarganInicial] = useState(true)

  const lastPollRef = useRef(0)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const poolRef = useRef<Mensaje[]>([])
  const yoRef = useRef<Yo | null>(null)
  const abiertaRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  yoRef.current = yo

  useEffect(() => {
    if (modo === 'chofer') {
      setVisible(!!token)
      return
    }
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
  }, [modo, token])

  const fetchBase = useCallback(() => {
    const headers: Record<string, string> = {}
    if (modo === 'chofer' && token) headers['x-chat-token'] = token
    return headers
  }, [modo, token])

  const fetchContactos = useCallback(async () => {
    try {
      const res = await fetch('/api/mensajes/contactos', { headers: fetchBase() })
      if (!res.ok) return
      const data = await res.json()
      setYo(data.yo || null)
      setUsuarios(data.usuarios || [])
      setChoferes(data.choferes || [])
      setOnlineIds(new Set(data.onlineIds || []))
      setGeneralNoLeidos(data.generalNoLeidos || 0)
      setPorChat(data.porChat || {})
      setEscribiendo((data.escribiendo || []).filter(
        (e: { emisorNombre: string; chatKey: string }) =>
          (e.chatKey === 'general' || (conversacion && e.chatKey === conversacion.key)) && e.emisorNombre !== yoRef.current?.emisorNombre,
      ))
    } catch { /* sin red */ }
  }, [fetchBase, conversacion])

  const marcarLeido = useCallback(async (chatKey: string) => {
    try {
      await fetch('/api/mensajes/leer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...fetchBase() },
        body: JSON.stringify({ chatKey }),
      })
      if (chatKey === 'general') setGeneralNoLeidos(0)
      setPorChat((prev) => {
        if (!(chatKey in prev)) return prev
        const next = { ...prev }
        delete next[chatKey]
        return next
      })
      setMensajes((prev) => prev.map((m) =>
        (m.receptorId === chatKey || (chatKey === 'general' && m.receptorId === null)) && !m.leido && m.emisorId !== yoRef.current?.emisorId
          ? { ...m, leido: true }
          : m,
      ))
    } catch { /* ignore */ }
  }, [fetchBase])

  const poll = useCallback(async () => {
    try {
      const since = ultimoTs ? `&since=${encodeURIComponent(ultimoTs)}` : ''
      const res = await fetch(`/api/mensajes${since}`, { headers: fetchBase() })
      if (!res.ok) return
      const data = await res.json()
      setYo(data.yo || null)
      if (data.mensajes && data.mensajes.length > 0) {
        const nuevos = data.mensajes as Mensaje[]
        poolRef.current = mergeMensajes(poolRef.current, nuevos)
        setMensajes(poolRef.current)
        const ts = nuevos[nuevos.length - 1].createdAt
        if (!ultimoTs || ts > ultimoTs) setUltimoTs(ts)
        const mios = (yoRef.current?.emisorId) || ''
        const entrantes = nuevos.filter((m) => m.emisorId !== mios)
        if (!abiertaRef.current && entrantes.length > 0) {
          setPreviews(entrantes.slice(-2))
          if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
          previewTimerRef.current = setTimeout(() => setPreviews([]), 6000)
        }
        if (conversacion) {
          const chat = conversacion.key
          const delChat = entrantes.some((m) =>
            chat === 'general' ? m.receptorId === null : (m.receptorId === chat || m.emisorId === chat),
          )
          if (delChat) marcarLeido(chat)
        }
      }
    } catch { /* sin red */ }
  }, [ultimoTs, fetchBase, conversacion, marcarLeido])

  useEffect(() => {
    if (!visible) return
    const init = async () => {
      try {
        const res = await fetch('/api/mensajes', { headers: fetchBase() })
        if (res.ok) {
          const data = await res.json()
          setYo(data.yo || null)
          poolRef.current = data.mensajes || []
          setMensajes(poolRef.current)
          const ms = (data.mensajes || []) as Mensaje[]
          if (ms.length > 0) setUltimoTs(ms[ms.length - 1].createdAt)
        }
      } finally {
        setCarganInicial(false)
      }
      fetchContactos()
    }
    init()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        poll()
        fetchContactos()
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [visible, fetchBase, poll, fetchContactos])

  const cargarAnteriores = useCallback(async () => {
    if (!conversacion || cargandoMas) return
    const viejos = mensajes.filter((m) =>
      conversacion.key === 'general'
        ? m.receptorId === null
        : (m.receptorId === conversacion.key || m.emisorId === conversacion.key),
    )
    if (viejos.length === 0) return
    setCargandoMas(true)
    try {
      const before = viejos[0].createdAt
      const res = await fetch(`/api/mensajes?chatKey=${encodeURIComponent(conversacion.key)}&before=${encodeURIComponent(before)}`, {
        headers: fetchBase(),
      })
      if (res.ok) {
        const data = await res.json()
        poolRef.current = mergeMensajes(poolRef.current, data.mensajes || [])
        setMensajes(poolRef.current)
      }
    } catch { /* ignore */ }
    setCargandoMas(false)
  }, [conversacion, cargandoMas, mensajes, fetchBase])

  const abrirConversacion = useCallback((c: Conversacion) => {
    setConversacion(c)
    setShowEmojis(false)
    marcarLeido(c.key)
  }, [marcarLeido])

  useEffect(() => {
    abiertaRef.current = open
    if (open) setPreviews([])
  }, [open])

  const enviar = useCallback(async (contenido?: string) => {
    const cuerpo = (contenido ?? texto).trim()
    if (!cuerpo || enviando || !conversacion) return
    setEnviando(true)
    try {
      const res = await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...fetchBase() },
        body: JSON.stringify({
          receptorId: conversacion.key === 'general' ? null : conversacion.key,
          contenido: cuerpo,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        poolRef.current = mergeMensajes(poolRef.current, [data.mensaje])
        setMensajes(poolRef.current)
        setTexto('')
        setUltimoTs(data.mensaje.createdAt)
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        fetch('/api/mensajes/escribiendo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...fetchBase() },
          body: JSON.stringify({ chatKey: conversacion.key, activo: false }),
        }).catch(() => {})
      }
    } catch { /* ignore */ }
    setEnviando(false)
  }, [texto, enviando, conversacion, fetchBase])

  const onTyping = useCallback(() => {
    if (!conversacion) return
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      fetch('/api/mensajes/escribiendo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...fetchBase() },
        body: JSON.stringify({ chatKey: conversacion.key, activo: true }),
      }).catch(() => {})
    }, 800)
  }, [conversacion, fetchBase])

  const adjuntar = useCallback(async (file: File) => {
    if (!conversacion || file.size > 2 * 1024 * 1024) return
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) return
      const { url } = await res.json()
      const esImagen = file.type.startsWith('image/')
      const res2 = await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...fetchBase() },
        body: JSON.stringify({
          receptorId: conversacion.key === 'general' ? null : conversacion.key,
          contenido: esImagen ? '' : file.name,
          tipo: esImagen ? 'IMAGEN' : 'ARCHIVO',
          adjuntoUrl: url,
          adjuntoNombre: file.name,
          adjuntoMime: file.type,
        }),
      })
      if (res2.ok) {
        const data = await res2.json()
        poolRef.current = mergeMensajes(poolRef.current, [data.mensaje])
        setMensajes(poolRef.current)
        setUltimoTs(data.mensaje.createdAt)
      }
    } catch { /* ignore */ }
    if (fileRef.current) fileRef.current.value = ''
  }, [conversacion, fetchBase])

  const totalNoLeidos = useMemo(() => {
    const suma = Object.values(porChat).reduce((a, b) => a + b, 0)
    return generalNoLeidos + suma
  }, [porChat, generalNoLeidos])

  const mensajesChat = useMemo(() => {
    if (!conversacion) return []
    return mensajes.filter((m) =>
      conversacion.key === 'general'
        ? m.receptorId === null
        : (m.receptorId === conversacion.key || m.emisorId === conversacion.key),
    )
  }, [conversacion, mensajes])

  const escribiendoEnChat = useMemo(() => {
    if (!conversacion) return []
    return escribiendo.filter((e) => e.chatKey === conversacion.key).map((e) => e.emisorNombre)
  }, [escribiendo, conversacion])

  if (!visible) return null

  return (
    <>
      <div className="fixed bottom-32 right-4 sm:bottom-24 sm:right-6 z-[60] flex flex-col items-end gap-2">
        {previews.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(true)}
            className="max-w-[240px] text-left bg-white rounded-xl shadow-lg border border-amber-200 p-2.5 flex items-start gap-2 animate-in slide-in-from-bottom-2 fade-in"
          >
            <Avatar className="size-7 bg-amber-100 text-amber-800">
              <AvatarFallback className="text-[10px]">{initials(p.emisorNombre)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold text-amber-800">{p.emisorNombre}</span>
              <span className="block text-xs text-slate-600 truncate">{p.tipo === 'IMAGEN' ? '📷 Imagen' : p.tipo === 'ARCHIVO' ? `📎 ${p.adjuntoNombre || 'Archivo'}` : p.contenido}</span>
            </span>
          </button>
        ))}
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:shadow-xl active:scale-95 transition-all duration-200 text-sm font-medium touch-manipulation select-none"
          aria-label="Mensajes"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Mensajes</span>
          {totalNoLeidos > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
              {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
            </span>
          )}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0">
          <SheetTitle className="sr-only">Mensajes</SheetTitle>

          <div className="h-full flex flex-col bg-slate-50">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white">
              {conversacion && (
                <button
                  onClick={() => setConversacion(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                  aria-label="Volver"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{conversacion ? conversacion.titulo : 'Mensajes'}</p>
                {conversacion && (
                  <p className="text-[11px] text-slate-400">
                    {escribiendoEnChat.length > 0 ? (
                      <span className="text-emerald-600">{escribiendoEnChat.join(', ')} escribiendo…</span>
                    ) : conversacion.subtitulo}
                  </p>
                )}
              </div>
            </div>

            {!conversacion ? (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  <button
                    onClick={() => abrirConversacion({ key: 'general', titulo: 'Canal General', subtitulo: 'Todos los usuarios', online: true })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all text-left"
                  >
                    <Avatar className="bg-amber-100 text-amber-800">
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">Canal General</p>
                      <p className="text-[11px] text-slate-400">Todos los usuarios y choferes</p>
                    </div>
                    {generalNoLeidos > 0 && (
                      <Badge className="bg-red-500 text-white">{generalNoLeidos}</Badge>
                    )}
                  </button>

                  <div className="pt-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400 px-2 mb-1.5">Personal</p>
                    {usuarios.length === 0 && (
                      <p className="text-xs text-slate-400 px-2">No hay usuarios activos</p>
                    )}
                    {usuarios.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => abrirConversacion({ key: u.id, titulo: u.nombre, subtitulo: u.online ? 'En línea' : 'Desconectado', online: !!u.online })}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white hover:border hover:border-amber-200 hover:shadow-sm transition-all text-left"
                      >
                        <div className="relative">
                          <Avatar className="bg-slate-200 text-slate-600">
                            <AvatarFallback className="text-[10px]">{initials(u.nombre)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${u.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{u.nombre}</p>
                          <p className={`text-[11px] truncate ${u.online ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {u.online ? 'En línea' : 'Desconectado'}
                          </p>
                        </div>
                        {porChat[u.id] > 0 && (
                          <Badge className="bg-red-500 text-white">{porChat[u.id]}</Badge>
                        )}
                      </button>
                    ))}
                  </div>

                  {choferes.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-semibold uppercase text-slate-400 px-2 mb-1.5">Choferes en línea</p>
                      {choferes.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => abrirConversacion({ key: c.id, titulo: c.nombre, subtitulo: 'Chofer · en línea', online: true })}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white hover:border hover:border-amber-200 hover:shadow-sm transition-all text-left"
                        >
                          <div className="relative">
                            <Avatar className="bg-emerald-100 text-emerald-700">
                              <AvatarFallback className="text-[10px]">{initials(c.nombre)}</AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{c.nombre}</p>
                            <p className="text-[11px] text-emerald-600">En línea</p>
                          </div>
                          {porChat[c.id] > 0 && (
                            <Badge className="bg-red-500 text-white">{porChat[c.id]}</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {mensajesChat.length >= 100 && (
                      <div className="text-center">
                        <button
                          onClick={cargarAnteriores}
                          disabled={cargandoMas}
                          className="text-[11px] text-amber-700 hover:underline disabled:opacity-50"
                        >
                          {cargandoMas ? 'Cargando…' : 'Cargar mensajes anteriores'}
                        </button>
                      </div>
                    )}
                    {carganInicial && <div className="text-center text-xs text-slate-400 py-8">Cargando mensajes…</div>}
                    {mensajesChat.map((m) => {
                      const mio = m.emisorId === yo?.emisorId
                      return (
                        <div key={m.id} className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm text-sm ${mio ? 'bg-amber-400 text-amber-950 rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'}`}>
                            {!mio && (
                              <p className="text-[10px] font-semibold text-amber-700 mb-0.5 flex items-center gap-1">
                                {onlineIds.has(m.emisorId) && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" title="En línea" />
                                )}
                                {m.emisorNombre}
                              </p>
                            )}
                            {m.tipo === 'IMAGEN' && m.adjuntoUrl ? (
                              <img src={m.adjuntoUrl} alt={m.adjuntoNombre || 'Imagen'} className="max-w-[220px] rounded-lg" />
                            ) : m.tipo === 'ARCHIVO' && m.adjuntoUrl ? (
                              <a
                                href={m.adjuntoUrl}
                                download={m.adjuntoNombre}
                                className="flex items-center gap-2 text-amber-800 hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="text-xs font-medium">{m.adjuntoNombre || 'Archivo'}</span>
                              </a>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                            )}
                            <p className={`text-[10px] mt-1 flex items-center gap-1 ${mio ? 'text-amber-800/70' : 'text-slate-400'}`}>
                              {fmtHora(m.createdAt)}
                              {mio && <CheckCheck className={`w-3 h-3 ${m.leido ? 'text-blue-600' : 'text-amber-700/60'}`} />}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="relative border-t border-slate-200 bg-white p-2.5">
                  {showEmojis && (
                    <div className="absolute bottom-full left-2 mb-2 w-64 max-h-44 overflow-y-auto grid grid-cols-8 gap-1 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-10">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => { setTexto((t) => t + e); setShowEmojis(false) }}
                          className="text-lg hover:bg-amber-50 rounded-lg p-0.5 transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-1.5">
                    <button
                      onClick={() => setShowEmojis((s) => !s)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                      aria-label="Emojis"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                      aria-label="Adjuntar"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) adjuntar(f) }}
                    />
                    <textarea
                      value={texto}
                      onChange={(e) => { setTexto(e.target.value); onTyping() }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          enviar()
                        }
                      }}
                      placeholder="Escribí un mensaje…"
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none px-3 py-2 text-sm bg-slate-50 max-h-28"
                    />
                    <button
                      onClick={() => enviar()}
                      disabled={!texto.trim() || enviando}
                      className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Enviar"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 px-1">Enter para enviar · Shift+Enter para salto de línea · Adjuntos máx. 2 MB</p>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function mergeMensajes(existentes: Mensaje[], nuevos: Mensaje[]): Mensaje[] {
  const map = new Map<string, Mensaje>()
  for (const m of existentes) map.set(m.id, m)
  for (const m of nuevos) map.set(m.id, m)
  return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
