'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Truck, Navigation, MapPin, CheckCircle, AlertTriangle,
  LogOut, RefreshCw, User, Clock, Camera, Send, XCircle,
} from 'lucide-react'

const MapView = dynamic(() => import('@/components/map-view'), { ssr: false })

type Parada = {
  id: string
  orden: number
  nombre: string
  lat: number
  lng: number
  estado?: string
  demandaTubos?: number | null
  tipoOperacion?: string | null
}

type RutaData = {
  id: string
  nombre: string
  estado: string
  distanciaKm: number
  duracionHoras: number
  paradas: Parada[]
  vehicle: { patente: string; marca: string; modelo: string } | null
}

type ConductorData = {
  id: string
  nombre: string
  usuario: string
}

export default function ChoferPage() {
  const [token, setToken] = useState<string | null>(null)
  const [conductor, setConductor] = useState<ConductorData | null>(null)
  const [ruta, setRuta] = useState<RutaData | null>(null)
  const [posicion, setPosicion] = useState<GeolocationPosition | null>(null)
  const [entregando, setEntregando] = useState<string | null>(null)
  const [gpsActivo, setGpsActivo] = useState(false)
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState('')
  const [logging, setLogging] = useState(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Delivery dialog state
  const [deliverDialog, setDeliverDialog] = useState<{ open: boolean; paradaId: string }>({ open: false, paradaId: '' })
  const [deliverNotas, setDeliverNotas] = useState('')
  const [deliverFoto, setDeliverFoto] = useState<string | null>(null)
  const [deliverPhotoStream, setDeliverPhotoStream] = useState<MediaStream | null>(null)
  const deliverVideoRef = useRef<HTMLVideoElement>(null)
  const deliverCanvasRef = useRef<HTMLCanvasElement>(null)

  // Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    setLoginError('')
    try {
      const res = await fetch('/api/chofer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: loginUser,
          password: loginPass,
          navegadorInfo: navigator.userAgent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')
      setToken(data.token)
      setConductor(data.conductor)
      if (data.ruta) setRuta(data.ruta)
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'Error de conexión')
    }
    setLogging(false)
  }

  // Logout
  async function handleLogout() {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    setToken(null)
    setConductor(null)
    setRuta(null)
    setPosicion(null)
    setGpsActivo(false)
  }

  // GPS + Heartbeat loop
  useEffect(() => {
    if (!token) return

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setPosicion(pos),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
      setGpsActivo(true)

      heartbeatRef.current = setInterval(async () => {
        const pos = posicionRef.current
        try {
          const res = await fetch('/api/chofer/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              lat: pos?.coords.latitude,
              lng: pos?.coords.longitude,
              velocidad: pos?.coords.speed ? Math.round(pos.coords.speed) : undefined,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.ruta) {
              setRuta((prev) => {
                if (!prev || data.ruta.id !== prev.id) return prev
                return {
                  ...prev,
                  estado: data.ruta.estado,
                  paradas: data.ruta.paradasPendientes,
                }
              })
            }
          }
        } catch { /* ignore */ }
      }, 15000)

      return () => {
        navigator.geolocation.clearWatch(watchId)
        if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      }
    }
  }, [token])

  const posicionRef = useRef(posicion)
  posicionRef.current = posicion

  // Camera handling
  const startDeliverCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setDeliverPhotoStream(stream)
      if (deliverVideoRef.current) {
        deliverVideoRef.current.srcObject = stream
      }
    } catch { /* camera not available */ }
  }, [])

  const stopDeliverCamera = useCallback(() => {
    if (deliverPhotoStream) {
      deliverPhotoStream.getTracks().forEach(t => t.stop())
    }
    setDeliverPhotoStream(null)
  }, [deliverPhotoStream])

  const captureDeliverPhoto = useCallback(() => {
    const video = deliverVideoRef.current
    const canvas = deliverCanvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setDeliverFoto(dataUrl)
    stopDeliverCamera()
  }, [stopDeliverCamera])

  async function submitDelivery(paradaId: string) {
    if (!ruta) return
    setEntregando(paradaId)
    try {
      let fotoUrl: string | null = null
      if (deliverFoto) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: deliverFoto }),
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          fotoUrl = uploadData.url
        }
      }
      await fetch(`/api/routes/${ruta.id}/paradas/${paradaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'ENTREGADO',
          llegada: true,
          salida: true,
          fotoUrl,
          notasConductor: deliverNotas.trim() || undefined,
        }),
      })
      setRuta((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          paradas: prev.paradas.filter((p) => p.id !== paradaId),
        }
      })
      setDeliverDialog({ open: false, paradaId: '' })
      setDeliverNotas('')
      setDeliverFoto(null)
    } catch { /* ignore */ }
    setEntregando(null)
  }

  // Pantalla de login
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Truck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">GasTrack AR</h1>
            <p className="text-slate-400 text-sm">App de reparto — Chofer</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Usuario</label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ej: chofer01"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Contraseña</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={logging}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-3 transition"
            >
              {logging ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const pendientes = ruta?.paradas?.filter((p) => p.estado !== 'ENTREGADO') ?? []
  const actual = pendientes[0]
  const completadas = (ruta?.paradas?.length ?? 0) - pendientes.length

  const markers = [
    ...(posicion ? [{
      id: 'gps', lat: posicion.coords.latitude, lng: posicion.coords.longitude,
      color: '#f97316', label: '📍', isBase: false, count: 0,
      popup: '<strong>Mi ubicación</strong>',
    }] : []),
    ...pendientes.map((p) => ({
      id: p.id, lat: p.lat, lng: p.lng,
      color: actual?.id === p.id ? '#22c55e' : '#3b82f6',
      label: `${p.orden}`, isBase: false, count: p.demandaTubos || 0,
      popup: `<strong>${p.nombre}</strong>${p.demandaTubos ? `<br/>🛢️ ${p.demandaTubos} tubos` : ''}`,
    })),
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-sm font-medium">{conductor?.nombre}</p>
              {ruta && (
                <p className="text-[10px] text-slate-400">{ruta.nombre}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gpsActivo && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                GPS
              </span>
            )}
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {!ruta ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Truck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sin ruta asignada</h2>
            <p className="text-slate-400 text-sm">
              Esperá a que te asignen una ruta desde el panel de administración
            </p>
            <button
              onClick={async () => {
                const res = await fetch(`/api/chofer/mi-ruta?token=${token}`)
                const data = await res.json()
                if (data.ruta) setRuta(data.ruta)
              }}
              className="mt-4 px-4 py-2 bg-slate-700 rounded-lg text-sm"
            >
              <RefreshCw className="w-4 h-4 inline mr-1" /> Verificar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 py-2 bg-slate-800/50">
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>{completadas} entregadas</span>
                <span>{pendientes.length} pendientes</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${ruta.paradas.length > 0 ? (completadas / ruta.paradas.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-800/30">
            <div className="max-w-lg mx-auto">
              {actual ? (
                <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-lg font-bold shrink-0">
                      {actual.orden}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-400 font-medium">PRÓXIMA PARADA</p>
                      <h2 className="text-xl font-bold">{actual.nombre}</h2>
                      {actual.demandaTubos && (
                        <p className="text-sm text-emerald-300 mt-1">
                          🛢️ {actual.demandaTubos} tubos · {actual.tipoOperacion || 'ENTREGA'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-300 font-medium">Ruta completada</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 relative">
            <MapView markers={markers as any} routes={[]} geocercas={[]} height="100%" />
          </div>

          {posicion && (
            <div className="bg-slate-800 border-t border-slate-700 px-4 py-2">
              <div className="max-w-lg mx-auto flex items-center gap-4 text-[10px] text-slate-400">
                <span>📍 {posicion.coords.latitude.toFixed(4)}, {posicion.coords.longitude.toFixed(4)}</span>
                <span>⚡ {Math.round(posicion.coords.speed || 0)} km/h</span>
                <span>🎯 ±{Math.round(posicion.coords.accuracy || 0)}m</span>
              </div>
            </div>
          )}

          <div className="bg-slate-800 border-t border-slate-700 max-h-44 overflow-y-auto">
            <div className="max-w-lg mx-auto p-4 space-y-2">
              {ruta.paradas.map((p) => {
                const done = p.estado === 'ENTREGADO'
                const isCurrent = actual?.id === p.id
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      done
                        ? 'bg-slate-700/30 border-slate-600'
                        : isCurrent
                        ? 'bg-emerald-900/20 border-emerald-700'
                        : 'bg-slate-700/10 border-slate-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      done ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                    }`}>
                      {done ? '✓' : p.orden}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-slate-500' : ''}`}>
                        {p.nombre}
                      </p>
                      {p.demandaTubos && (
                        <p className="text-[10px] text-slate-400">🛢️ {p.demandaTubos} tubos</p>
                      )}
                    </div>
                    {isCurrent && !done && (
                      <button
                        onClick={() => setDeliverDialog({ open: true, paradaId: p.id })}
                        disabled={entregando === p.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium"
                      >
                        {entregando === p.id ? '...' : 'Entregado'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Delivery dialog */}
      {deliverDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 border border-slate-600">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Completar entrega
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Notas del conductor</label>
              <textarea
                value={deliverNotas}
                onChange={(e) => setDeliverNotas(e.target.value)}
                placeholder="Observaciones de la entrega..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Foto de entrega</label>
              {deliverFoto ? (
                <div className="relative">
                  <img src={deliverFoto} alt="Foto entrega" className="w-full max-h-40 object-cover rounded-lg border border-slate-600" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setDeliverFoto(null); startDeliverCamera() }} className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs">Retomar foto</button>
                    <button onClick={() => setDeliverFoto(null)} className="px-3 py-1.5 bg-red-700 rounded-lg text-xs">Quitar</button>
                  </div>
                </div>
              ) : deliverPhotoStream ? (
                <div className="relative">
                  <video ref={deliverVideoRef} autoPlay playsInline className="w-full max-h-40 rounded-lg bg-black" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={captureDeliverPhoto} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Tomar foto
                    </button>
                    <button onClick={stopDeliverCamera} className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={startDeliverCamera} className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg text-sm text-slate-400 hover:border-emerald-500 hover:text-emerald-400 transition flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Tomar foto
                </button>
              )}
              <canvas ref={deliverCanvasRef} className="hidden" />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => { setDeliverDialog({ open: false, paradaId: '' }); setDeliverNotas(''); setDeliverFoto(null); stopDeliverCamera() }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => submitDelivery(deliverDialog.paradaId)}
                disabled={entregando === deliverDialog.paradaId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
              >
                {entregando === deliverDialog.paradaId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Confirmar entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
