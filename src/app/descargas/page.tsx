'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Camera, CheckCircle2, ClipboardList, FileText, Link2,
  LogOut, PackageCheck, PenLine, RefreshCw, ScanLine, Truck, User, XCircle,
} from 'lucide-react'
import ScannerInput from '@/components/scanner-input'
import FirmaCanvas from '@/components/firma-canvas'

const NOVEDADES = [
  { valor: 'TUBO_OTRO_REMITO', label: 'Tubo de otro remito' },
  { valor: 'TUBO_OTRO_CLIENTE', label: 'Tubo de otro cliente' },
  { valor: 'GAS_INCORRECTO', label: 'Gas incorrecto' },
  { valor: 'TUBO_DANIADO', label: 'Tubo dañado' },
  { valor: 'PH_VENCIDA', label: 'PH vencida' },
  { valor: 'FALTANTE', label: 'Tubo faltante' },
  { valor: 'SOBRANTE', label: 'Tubo sobrante' },
  { valor: 'OTRO', label: 'Otro' },
]

const RESOLUCIONES = [
  { valor: 'DESCARGAR_CON_NOVEDAD', label: 'Descargar igualmente (con novedad)' },
  { valor: 'NO_DESCARGAR', label: 'No descargar (devolver al depósito)' },
  { valor: 'REASIGNAR', label: 'Reasignar a otro remito/cliente' },
  { valor: 'DEVOLVER_A_DEPOSITO', label: 'Devolver al depósito' },
]

interface ResumenRemito {
  id: string
  numero: number
  cliente: string | null
  tecnico: string | null
  estado: string
  createdAt: string
  firmaToken: string | null
  firmaCliente: string | null
  firmaNombreCliente: string | null
  firmaMetodo: string | null
  items: {
    id: string
    cylinderId: string | null
    numeroSerie: string | null
    gasCodigo: string
    cantidad: number
    descargado: boolean
    descargadoPor: string | null
    novedad: string | null
    novedadDetalle: string | null
    metodoResolucion: string | null
  }[]
}

interface ResultadoVerificacion {
  valido: boolean
  remitoItemId: string | null
  yaDescargado: boolean
  cylinder: { id: string; numeroSerie: string; gasCodigo: string; gasNombre: string; estado: string; cliente: string | null } | null
  novedades: { tipo: string; detalle: string; auto: boolean }[]
  motivo: string | null
}

export default function DescargasPage() {
  const [token, setToken] = useState<string | null>(null)
  const [conductor, setConductor] = useState<{ id: string; nombre: string; usuario: string } | null>(null)
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState('')
  const [logging, setLogging] = useState(false)

  const [remitos, setRemitos] = useState<ResumenRemito[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [remito, setRemito] = useState<ResumenRemito | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [verificando, setVerificando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null)
  const [ultimoValor, setUltimoValor] = useState('')
  const [novedadSel, setNovedadSel] = useState('')
  const [novedadDetalle, setNovedadDetalle] = useState('')
  const [metodoSel, setMetodoSel] = useState('')
  const [descargando, setDescargando] = useState(false)

  const [firmaDialog, setFirmaDialog] = useState(false)
  const [firmaTab, setFirmaTab] = useState<'pantalla' | 'papel'>('pantalla')
  const [firmaData, setFirmaData] = useState<string | null>(null)
  const [firmaNombre, setFirmaNombre] = useState('')
  const [firmaSubiendo, setFirmaSubiendo] = useState(false)
  const [firmaOk, setFirmaOk] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  const [papelFoto, setPapelFoto] = useState<string | null>(null)
  const [papelStream, setPapelStream] = useState<MediaStream | null>(null)
  const papelVideoRef = useRef<HTMLVideoElement>(null)
  const papelCanvasRef = useRef<HTMLCanvasElement>(null)

  const loadRemitos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/remitos?paraDescarga=1')
      const json = await res.json()
      const list = Array.isArray(json) ? json : json?.data || []
      setRemitos(list.filter((r: ResumenRemito) => r.estado !== 'FIRMADO'))
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/remitos/${id}`)
      const json = await res.json()
      if (res.ok) {
        setRemito(json)
        setSelId(id)
        setResultado(null)
        setFirmaOk(null)
        setQrUrl(null)
        if (json.estado === 'FIRMADO' && json.firmaToken) {
          const link = `${window.location.origin}/firmar/${json.firmaToken}`
          setFirmaOk(link)
          const mod = await import('qrcode')
          mod.default.toDataURL(link, { width: 220 }).then(setQrUrl).catch(() => setQrUrl(null))
        }
      }
    } catch { /* ignore */ }
    setLoadingDetail(false)
  }, [])

  useEffect(() => { if (token) loadRemitos() }, [token, loadRemitos])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    setLoginError('')
    try {
      const res = await fetch('/api/chofer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: loginUser, password: loginPass, navegadorInfo: navigator.userAgent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')
      setToken(data.token)
      setConductor(data.conductor)
    } catch (e) { setLoginError(e instanceof Error ? e.message : 'Error de conexión') }
    setLogging(false)
  }

  async function handleVerificar(valor: string) {
    if (!remito) return
    setVerificando(true)
    setResultado(null)
    setUltimoValor(valor)
    setNovedadSel('')
    setNovedadDetalle('')
    setMetodoSel('')
    try {
      const res = await fetch(`/api/remitos/${remito.id}/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor, choferToken: token }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al verificar')
      setResultado(json)
      if (json.novedades && json.novedades.length > 0) {
        setNovedadSel(json.novedades[0].tipo)
        setNovedadDetalle(json.novedades[0].detalle)
        setMetodoSel('DESCARGAR_CON_NOVEDAD')
      }
    } catch { /* ignore */ }
    setVerificando(false)
  }

  async function handleDescargar(remitoItemId: string | null) {
    if (!remito || !remitoItemId) return
    setDescargando(true)
    try {
      const body: Record<string, unknown> = { remitoItemId, choferToken: token }
      if (resultado && resultado.novedades && resultado.novedades.length > 0) {
        body.novedad = novedadSel
        body.novedadDetalle = novedadDetalle.trim() || undefined
        if (novedadSel) body.metodoResolucion = metodoSel || undefined
      }
      const res = await fetch(`/api/remitos/${remito.id}/descargar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al descargar')
      setResultado(null)
      await loadDetail(remito.id)
      await loadRemitos()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al descargar')
    }
    setDescargando(false)
  }

  async function handleNovedadGeneral() {
    if (!remito) return
    setDescargando(true)
    try {
      const res = await fetch(`/api/remitos/${remito.id}/novedades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: novedadSel || 'OTRO',
          detalle: novedadDetalle.trim() || undefined,
          metodoResolucion: metodoSel || undefined,
          choferToken: token,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al registrar')
      setResultado(null)
      alert('Novedad registrada')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al registrar novedad')
    }
    setDescargando(false)
  }

  const descargados = remito?.items.filter((i) => i.descargado).length ?? 0
  const totalItems = remito?.items.length ?? 0
  const completo = totalItems > 0 && descargados === totalItems
  const firmado = remito?.estado === 'FIRMADO'

  async function startPapelCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setPapelStream(stream)
      if (papelVideoRef.current) papelVideoRef.current.srcObject = stream
    } catch { /* camera not available */ }
  }

  function stopPapelCamera() {
    if (papelStream) papelStream.getTracks().forEach((t) => t.stop())
    setPapelStream(null)
  }

  function capturarPapel() {
    const video = papelVideoRef.current
    const canvas = papelCanvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setPapelFoto(canvas.toDataURL('image/jpeg', 0.8))
    stopPapelCamera()
  }

  async function enviarFirma() {
    if (!remito) return
    setFirmaSubiendo(true)
    try {
      let firma: string | null = null
      let tipoFirma: string = 'PANTALLA_CHOFER'
      if (firmaTab === 'pantalla') {
        firma = firmaData
      } else {
        if (!papelFoto) throw new Error('Tomá la foto de la firma en papel')
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: papelFoto }),
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error('No se pudo subir la foto de la firma')
        firma = uploadData.url
        tipoFirma = 'PAPEL_FOTO'
      }
      if (!firma) throw new Error('Faltó la firma')
      if (!firmaNombre.trim()) throw new Error('Falta el nombre del firmante')
      const res = await fetch(`/api/remitos/${remito.id}/firma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firma, nombre: firmaNombre.trim(), tipoFirma, choferToken: token }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar la firma')
      setFirmaOk(`${window.location.origin}/firmar/${json.firmaToken}`)
      setFirmaDialog(false)
      setFirmaData(null)
      setPapelFoto(null)
      setFirmaNombre('')
      const mod = await import('qrcode')
      mod.default.toDataURL(`${window.location.origin}/firmar/${json.firmaToken}`, { width: 220 }).then(setQrUrl).catch(() => setQrUrl(null))
      await loadDetail(remito.id)
      await loadRemitos()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar la firma')
    }
    setFirmaSubiendo(false)
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Truck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">GasTrack AR</h1>
            <p className="text-slate-400 text-sm">Descarga verificada — Chofer</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Usuario</label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="ej: chofer01"
                autoComplete="username"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Contraseña</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {loginError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {loginError}
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

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-sm font-medium">{conductor?.nombre}</p>
              <p className="text-[10px] text-slate-400">Descarga verificada</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selId && (
              <button onClick={() => { setSelId(null); setRemito(null); setResultado(null); loadRemitos() }} className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Remitos
              </button>
            )}
            <button onClick={() => { setToken(null); setConductor(null); setSelId(null); setRemito(null) }} className="p-2 text-slate-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {!selId && (
        <div className="max-w-lg mx-auto w-full p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" /> Remitos para descargar
            </h2>
            <button onClick={loadRemitos} className="p-2 text-slate-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {remitos.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-sm py-10">
              No hay remitos para descargar.
            </div>
          )}
          {remitos.map((r) => {
            const d = r.items.filter((i) => i.descargado).length
            return (
              <button
                key={r.id}
                onClick={() => loadDetail(r.id)}
                className="w-full text-left bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-emerald-600 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.estado === 'COMPLETADO' ? 'bg-amber-600/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Remito N°{r.numero}</p>
                    <p className="text-xs text-slate-400 truncate">{r.cliente || 'Sin cliente'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${d === r.items.length && r.items.length > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
                        {d}/{r.items.length} descargados
                      </span>
                      {r.estado === 'COMPLETADO' && <span className="text-[10px] text-amber-400">Esperando firma</span>}
                      {r.estado === 'PARCIAL' && <span className="text-[10px] text-slate-500">Parcial</span>}
                    </div>
                  </div>
                  <ScanLine className="w-5 h-5 text-slate-500 shrink-0" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selId && remito && (
        <div className="max-w-lg mx-auto w-full p-4 space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Remito N°{remito.numero}</h2>
              {firmado ? (
                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">FIRMADO</span>
              ) : completo ? (
                <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 font-medium">COMPLETADO — FALTA FIRMA</span>
              ) : (
                <span className="text-[10px] px-2 py-1 rounded-full bg-slate-700 text-slate-400">{remito.estado}</span>
              )}
            </div>
            <p className="text-sm text-slate-300">Cliente: <b>{remito.cliente || '—'}</b></p>
            {remito.tecnico && <p className="text-xs text-slate-400">Conductor: {remito.tecnico}</p>}
            <p className="text-[10px] text-slate-500">{new Date(remito.createdAt).toLocaleString('es-AR')}</p>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalItems > 0 ? (descargados / totalItems) * 100 : 0}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{descargados}/{totalItems} tubos descargados</p>
          </div>

          {firmado ? (
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-4 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm text-emerald-300">
                Remito firmado por <b>{remito.firmaNombreCliente}</b>
              </p>
              {remito.firmaCliente && <img src={remito.firmaCliente} alt="Firma" className="mx-auto max-h-24 bg-white rounded-lg p-2" />}
            </div>
          ) : (
            <>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-emerald-400" /> Verificar tubo antes de descargar
                </p>
                <ScannerInput onScan={handleVerificar} disabled={verificando} placeholder="Escanear o ingresar serie/código del tubo..." />
                {verificando && (
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
                  </p>
                )}
              </div>

              {resultado && (
                <div className={`rounded-xl border p-4 space-y-3 ${resultado.valido ? 'border-emerald-700 bg-emerald-900/20' : 'border-amber-700 bg-amber-900/20'}`}>
                  <div className="flex items-center gap-2">
                    {resultado.valido ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <div className="text-sm">
                      {resultado.cylinder && (
                        <p className="font-semibold">
                          {resultado.cylinder.numeroSerie}
                          <span className="text-slate-400 font-normal"> · {resultado.cylinder.gasCodigo} · {resultado.cylinder.estado}</span>
                        </p>
                      )}
                      {resultado.valido && <p className="text-xs text-emerald-300">Apto para descargar</p>}
                      {resultado.motivo && <p className="text-xs text-amber-300">{resultado.motivo}</p>}
                    </div>
                  </div>

                  {resultado.novedades.length > 0 && (
                    <div className="space-y-3 border-t border-slate-700 pt-3">
                      <p className="text-xs text-amber-300">{resultado.novedades.length} novedad(es) detectada(s)</p>
                      {resultado.novedades.map((n, i) => (
                        <p key={i} className="text-[11px] text-slate-300 bg-slate-800/60 rounded-lg p-2">
                          <b className="text-amber-400">{NOVEDADES.find((x) => x.valor === n.tipo)?.label || n.tipo}</b>: {n.detalle}
                        </p>
                      ))}
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Tipo de novedad*</label>
                        <select value={novedadSel} onChange={(e) => setNovedadSel(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white">
                          {NOVEDADES.map((n) => (
                            <option key={n.valor} value={n.valor}>{n.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Aclaración (opcional)</label>
                        <textarea
                          value={novedadDetalle}
                          onChange={(e) => setNovedadDetalle(e.target.value)}
                          rows={2}
                          placeholder="Detalle de la novedad..."
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Método de resolución*</label>
                        <select value={metodoSel} onChange={(e) => setMetodoSel(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white">
                          <option value="">Seleccionar...</option>
                          {RESOLUCIONES.map((r) => (
                            <option key={r.valor} value={r.valor}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {resultado.remitoItemId && !resultado.yaDescargado && (
                    <button
                      onClick={() => handleDescargar(resultado.remitoItemId)}
                      disabled={descargando || (resultado.novedades.length > 0 && (!novedadSel || !metodoSel))}
                      className="w-full py-3 rounded-lg font-medium text-sm transition disabled:opacity-50"
                      style={{ backgroundColor: resultado.novedades.length > 0 ? '#d97706' : '#059669', color: '#fff' }}
                    >
                      {resultado.novedades.length > 0 ? 'Descargar con novedad' : 'Descargar tubo'}
                    </button>
                  )}
                  {resultado.remitoItemId && resultado.yaDescargado && (
                    <button onClick={() => setResultado(null)} className="w-full py-2 rounded-lg bg-slate-700 text-xs">
                      Entendido
                    </button>
                  )}
                  {!resultado.remitoItemId && (
                    <button
                      onClick={handleNovedadGeneral}
                      disabled={descargando || !novedadSel || !metodoSel}
                      className="w-full py-3 rounded-lg bg-amber-600 text-sm font-medium disabled:opacity-50"
                    >
                      Registrar novedad (no descargar este tubo)
                    </button>
                  )}
                </div>
              )}

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
                <p className="text-xs text-slate-400 font-medium">Tubos del remito</p>
                {remito.items.map((it) => (
                  <div key={it.id} className={`flex items-center gap-3 p-2 rounded-lg ${it.descargado ? 'bg-emerald-900/20' : 'bg-slate-800/40'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${it.descargado ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                      {it.descargado ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{it.cantidad}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{it.numeroSerie || `Gas ${it.gasCodigo} (x${it.cantidad})`}</p>
                      {it.novedad && (
                        <p className="text-[10px] text-amber-400">
                          {NOVEDADES.find((n) => n.valor === it.novedad)?.label || it.novedad} · {RESOLUCIONES.find((r) => r.valor === it.metodoResolucion)?.label || it.metodoResolucion}
                        </p>
                      )}
                      {it.descargado && it.descargadoPor && <p className="text-[10px] text-slate-500">por {it.descargadoPor}</p>}
                    </div>
                    {!it.cylinderId && !it.descargado && (
                      <button
                        onClick={() => { setResultado(null); handleDescargar(it.id) }}
                        disabled={descargando}
                        className="px-3 py-1.5 bg-slate-700 rounded-lg text-[10px] disabled:opacity-50"
                      >
                        Marcar descargado
                      </button>
                    )}
                    {it.descargado && it.novedad && (
                      <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setFirmaDialog(true); setFirmaTab('pantalla'); setFirmaData(null); setPapelFoto(null); setFirmaNombre('') }}
                disabled={!completo}
                className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition ${completo ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 text-slate-500'}`}
              >
                <PenLine className="w-4 h-4" />
                {completo ? 'Registrar firma del cliente' : `Firma disponible cuando se descarguen los ${totalItems} tubos`}
              </button>
            </>
          )}

          {firmaOk && !firmado && (
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-4 space-y-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm text-emerald-300 font-medium">¡Firma guardada! Remito completado.</p>
              <p className="text-[10px] text-slate-400">Enviá este enlace al cliente para que firme en su celular (o imprimí el QR):</p>
              <a href={firmaOk} className="text-xs text-emerald-400 underline break-all">{firmaOk}</a>
              {qrUrl && <img src={qrUrl} alt="QR de firma" className="mx-auto bg-white rounded-lg p-2 w-40 h-40" />}
            </div>
          )}
        </div>
      )}

      {firmaDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 border border-slate-600 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <PenLine className="w-5 h-5 text-emerald-400" />
              Firma del cliente — Remito N°{remito?.numero}
            </h3>

            <div className="flex gap-2">
              <button
                onClick={() => { setFirmaTab('pantalla'); setPapelFoto(null) }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${firmaTab === 'pantalla' ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                En pantalla
              </button>
              <button
                onClick={() => { setFirmaTab('papel'); setFirmaData(null) }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${firmaTab === 'papel' ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                Firma en papel (foto)
              </button>
            </div>

            {firmaTab === 'pantalla' ? (
              <div>
                <p className="text-[10px] text-slate-400 mb-2">El cliente firma con el dedo en este recuadro:</p>
                <FirmaCanvas onChange={setFirmaData} height={170} />
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-slate-400 mb-2">Sacá una foto a la firma firmada en papel:</p>
                {papelFoto ? (
                  <div className="space-y-2">
                    <img src={papelFoto} alt="Firma en papel" className="w-full max-h-44 object-cover rounded-lg border border-slate-600" />
                    <div className="flex gap-2">
                      <button onClick={() => { setPapelFoto(null); startPapelCamera() }} className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs">
                        Retomar
                      </button>
                      <button onClick={() => setPapelFoto(null)} className="px-3 py-1.5 bg-red-700 rounded-lg text-xs">
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : papelStream ? (
                  <div className="space-y-2">
                    <video ref={papelVideoRef} autoPlay playsInline className="w-full max-h-44 rounded-lg bg-black" />
                    <div className="flex gap-2">
                      <button onClick={capturarPapel} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Tomar foto
                      </button>
                      <button onClick={stopPapelCamera} className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={startPapelCamera} className="w-full py-4 border-2 border-dashed border-slate-600 rounded-lg text-sm text-slate-400 flex items-center justify-center gap-2">
                    <Camera className="w-4 h-4" /> Tomar foto de la firma
                  </button>
                )}
                <canvas ref={papelCanvasRef} className="hidden" />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre y apellido del firmante</label>
              <input
                type="text"
                value={firmaNombre}
                onChange={(e) => setFirmaNombre(e.target.value)}
                placeholder="ej: Juan Pérez"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => { setFirmaDialog(false); stopPapelCamera() }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={enviarFirma}
                disabled={firmaSubiendo || !firmaNombre.trim() || (firmaTab === 'pantalla' ? !firmaData : !papelFoto)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
              >
                {firmaSubiendo ? <RefreshCw className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                Guardar firma
              </button>
            </div>
          </div>
        </div>
      )}
      {loadingDetail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      )}
      <div className="max-w-lg mx-auto w-full text-center pb-6">
        <Link2 className="hidden" />
      </div>
    </div>
  )
}