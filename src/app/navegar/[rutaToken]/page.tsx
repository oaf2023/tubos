'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { Truck, Navigation, CheckCircle, AlertTriangle, RefreshCw, Camera, XCircle, Send } from 'lucide-react'

const MapView = dynamic(() => import('@/components/map-view'), { ssr: false })

type ParadaNavegacion = {
  id: string
  orden: number
  nombre: string
  lat: number
  lng: number
  demandaTubos?: number | null
  tipoOperacion?: string | null
  fotoUrl?: string | null
  notasConductor?: string | null
}

type RutaNavegacion = {
  id: string
  nombre: string
  paradas: ParadaNavegacion[]
  vehicle: { patente: string; marca: string; modelo: string } | null
}

export default function NavegarPage() {
  const { rutaToken } = useParams<{ rutaToken: string }>()
  const [ruta, setRuta] = useState<RutaNavegacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gpsActivo, setGpsActivo] = useState(false)
  const [posicion, setPosicion] = useState<GeolocationPosition | null>(null)
  const [entregadas, setEntregadas] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState<string | null>(null)

  // Delivery dialog state
  const [deliverDialog, setDeliverDialog] = useState<{ open: boolean; paradaId: string }>({ open: false, paradaId: '' })
  const [deliverNotas, setDeliverNotas] = useState('')
  const [deliverFoto, setDeliverFoto] = useState<string | null>(null)
  const [deliverPhotoStream, setDeliverPhotoStream] = useState<MediaStream | null>(null)
  const deliverVideoRef = useRef<HTMLVideoElement>(null)
  const deliverCanvasRef = useRef<HTMLCanvasElement>(null)

  // Load route by token
  useEffect(() => {
    async function loadRuta() {
      try {
        const res = await fetch(`/api/routes?token=${rutaToken}`)
        if (!res.ok) throw new Error('Ruta no encontrada')
        const rutas = await res.json()
        const rutasArr = Array.isArray(rutas) ? rutas : []
        const encontrada = rutasArr[0]
        if (!encontrada) throw new Error('Token de navegación inválido')
        setRuta({
          id: encontrada.id,
          nombre: encontrada.nombre,
          paradas: (encontrada.paradas || []).filter(
            (p: any) => p.estado !== 'ENTREGADO'
          ).map((p: any) => ({
            id: p.id,
            orden: p.orden,
            nombre: p.nombre,
            lat: p.lat,
            lng: p.lng,
            demandaTubos: p.demandaTubos,
            tipoOperacion: p.tipoOperacion,
          })),
          vehicle: encontrada.vehicle || null,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar ruta')
      } finally {
        setLoading(false)
      }
    }
    loadRuta()
  }, [rutaToken])

  // GPS real del chofer
  useEffect(() => {
    if (!ruta || !gpsActivo || !navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        setPosicion(pos)
        try {
          await fetch('/api/gps/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rutaId: ruta.id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              velocidad: Math.round(pos.coords.speed || 0),
              rumbo: Math.round(pos.coords.heading || 0),
              precision: Math.round(pos.coords.accuracy || 0),
              fuente: 'GPS',
            }),
          })
        } catch { /* ignore */ }
      },
      () => setGpsActivo(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [ruta, gpsActivo])

  // Camera handling for delivery photo
  const startDeliverCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setDeliverPhotoStream(stream)
      if (deliverVideoRef.current) {
        deliverVideoRef.current.srcObject = stream
      }
    } catch {
      // camera not available
    }
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
    setEnviando(paradaId)
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
      const res = await fetch(`/api/routes/${ruta.id}/paradas/${paradaId}`, {
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
      if (res.ok) {
        setEntregadas((prev) => new Set(prev).add(paradaId))
        setDeliverDialog({ open: false, paradaId: '' })
        setDeliverNotas('')
        setDeliverFoto(null)
      }
    } catch { /* ignore */ }
    setEnviando(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (error || !ruta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Error de navegación</h1>
          <p className="text-slate-400">{error || 'Ruta no encontrada'}</p>
        </div>
      </div>
    )
  }

  const pendientes = ruta.paradas.filter((p) => !entregadas.has(p.id))
  const actual = pendientes[0]
  const markers = [
    ...(posicion ? [{
      id: 'gps',
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      color: '#f97316',
      label: '📍',
      isBase: false,
      count: 0,
      popup: '<strong>Ubicación actual</strong>',
    }] : []),
    ...ruta.paradas.filter(p => !entregadas.has(p.id)).map(p => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      color: pendientes[0]?.id === p.id ? '#22c55e' : '#3b82f6',
      label: `${p.orden}`,
      isBase: false,
      count: p.demandaTubos || 0,
      popup: `<strong>${p.nombre}</strong>${p.demandaTubos ? `<br/>🛢️ ${p.demandaTubos} tubos` : ''}`,
    })),
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-bold text-lg">{ruta.nombre}</h1>
            {ruta.vehicle && (
              <p className="text-xs text-slate-400">
                <Truck className="w-3 h-3 inline mr-1" />
                {ruta.vehicle.patente} — {ruta.vehicle.marca} {ruta.vehicle.modelo}
              </p>
            )}
          </div>
          <button
            onClick={() => setGpsActivo(!gpsActivo)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              gpsActivo
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            <Navigation className="w-3 h-3 inline mr-1" />
            {gpsActivo ? 'GPS Activo' : 'Activar GPS'}
          </button>
        </div>
      </header>

      <div className="px-4 py-3 bg-slate-800/50">
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

      <div className="bg-slate-800 border-t border-slate-700 max-h-48 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4 space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            {pendientes.length} parada(s) restante(s)
          </p>
          {ruta.paradas.map((p) => {
            const done = entregadas.has(p.id)
            const isCurrent = actual?.id === p.id && !done
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
                    disabled={enviando === p.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium"
                  >
                    {enviando === p.id ? '...' : 'Entregado'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
                disabled={enviando === deliverDialog.paradaId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
              >
                {enviando === deliverDialog.paradaId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Confirmar entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
