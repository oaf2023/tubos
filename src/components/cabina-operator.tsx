'use client'

import { useState, useEffect, useCallback } from 'react'

type ValidationResult = {
  cylinderId: string | null
  numeroSerie: string | null
  gasCodigo: string | null
  estadoActual: string | null
  estadoSugerido: string | null
  diagnostico: string
  pesoRealKg: number | null
  pesoEsperadoKg: number | null
  phVigente: boolean | null
  phObservacion: string | null
  fotoTomada: boolean
  alertas: string[]
  accion: 'PERMITIR' | 'REVISAR' | 'RECHAZAR'
}

type Cabina = { id: string; codigo: string; nombre: string }

export default function CabinaOperator() {
  const [cabinas, setCabinas] = useState<Cabina[]>([])
  const [cabinaId, setCabinaId] = useState('')
  const [tid, setTid] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [phValido, setPhValido] = useState<boolean | null>(null)
  const [phObs, setPhObs] = useState('')
  const [fotoBase64, setFotoBase64] = useState('')
  const [resultado, setResultado] = useState<ValidationResult | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/cabina')
      .then(r => r.json())
      .then(setCabinas)
      .catch(() => {})
  }, [])

  const tomarFoto = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      setFotoBase64(canvas.toDataURL('image/jpeg', 0.8))
      stream.getTracks().forEach(t => t.stop())
    } catch {
      setError('No se pudo acceder a la cámara')
    }
  }, [])

  const validar = useCallback(async () => {
    if (!cabinaId) { setError('Seleccioná una cabina'); return }
    if (!tid) { setError('Escaneá un tag RFID'); return }
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/cabina/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabinaId,
          tid,
          pesoKg: pesoKg ? Number(pesoKg) : undefined,
          fotoBase64: fotoBase64 || undefined,
          phValido,
          phObservacion: phObs || undefined,
          usuario: 'operador',
          aplicarCambio: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setResultado(data.resultado)
      setHistorial(prev => [data.resultado, ...prev].slice(0, 20))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [cabinaId, tid, pesoKg, fotoBase64, phValido, phObs])

  const resetear = () => {
    setTid('')
    setPesoKg('')
    setPhValido(null)
    setPhObs('')
    setFotoBase64('')
    setResultado(null)
    setError('')
  }

  const colorAccion = (a: string) => {
    if (a === 'PERMITIR') return 'bg-green-100 border-green-400 text-green-800'
    if (a === 'REVISAR') return 'bg-yellow-100 border-yellow-400 text-yellow-800'
    return 'bg-red-100 border-red-400 text-red-800'
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-orange-600">Cabina de Validación</h2>

      {/* Selector de cabina */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Cabina</label>
          <select value={cabinaId} onChange={e => setCabinaId(e.target.value)}
            className="w-full border rounded p-2">
            <option value="">Seleccionar...</option>
            {cabinas.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tag RFID</label>
          <input value={tid} onChange={e => setTid(e.target.value)}
            placeholder="Escanear o escribir TID..."
            className="w-full border rounded p-2 font-mono" />
        </div>
      </div>

      {/* Sensores */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Peso (kg)</label>
          <input type="number" step="0.1" value={pesoKg} onChange={e => setPesoKg(e.target.value)}
            placeholder="0.0"
            className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">PH Vigente</label>
          <select value={phValido === null ? '' : phValido ? 'true' : 'false'}
            onChange={e => {
              if (e.target.value === '') setPhValido(null)
              else setPhValido(e.target.value === 'true')
            }}
            className="w-full border rounded p-2">
            <option value="">No verificado</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Foto</label>
          <div className="flex gap-2">
            <button onClick={tomarFoto}
              className="bg-gray-200 hover:bg-gray-300 rounded px-3 py-2 text-sm">
              {fotoBase64 ? '📷 Retomar' : '📷 Tomar foto'}
            </button>
            {fotoBase64 && <span className="text-xs text-green-600 self-center">✓ Foto</span>}
          </div>
        </div>
      </div>

      {/* Observación PH */}
      {phValido === false && (
        <div>
          <label className="block text-sm font-medium mb-1">Observación PH</label>
          <input value={phObs} onChange={e => setPhObs(e.target.value)}
            placeholder="Motivo de PH no vigente..."
            className="w-full border rounded p-2" />
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-4">
        <button onClick={validar} disabled={cargando}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded px-6 py-2 font-medium disabled:opacity-50">
          {cargando ? 'Validando...' : 'Validar Cilindro'}
        </button>
        <button onClick={resetear}
          className="bg-gray-200 hover:bg-gray-300 rounded px-4 py-2">
          Limpiar
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-300 rounded p-3 text-red-700">{error}</div>}

      {/* Resultado */}
      {resultado && (
        <div className={`border-2 rounded-lg p-4 ${colorAccion(resultado.accion)}`}>
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold">Resultado: {resultado.accion}</h3>
            <span className="text-sm font-mono bg-white/50 rounded px-2 py-1">{resultado.diagnostico}</span>
          </div>
          {resultado.numeroSerie && (
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="font-medium">Cilindro:</span> {resultado.numeroSerie}</div>
              <div><span className="font-medium">Gas:</span> {resultado.gasCodigo}</div>
              <div><span className="font-medium">Estado actual:</span> {resultado.estadoActual}</div>
              <div><span className="font-medium">Estado sugerido:</span> {resultado.estadoSugerido || '—'}</div>
              {resultado.pesoRealKg !== null && (
                <div><span className="font-medium">Peso real:</span> {resultado.pesoRealKg} kg</div>
              )}
              {resultado.pesoEsperadoKg !== null && (
                <div><span className="font-medium">Peso esperado:</span> {resultado.pesoEsperadoKg} kg</div>
              )}
              {resultado.phVigente !== null && (
                <div><span className="font-medium">PH:</span> {resultado.phVigente ? '✅ Vigente' : '❌ Vencido'}</div>
              )}
            </div>
          )}
          {resultado.alertas.length > 0 && (
            <div>
              <span className="font-medium text-sm">Alertas:</span>
              <ul className="list-disc list-inside text-sm mt-1">
                {resultado.alertas.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">Últimas validaciones</h3>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {historial.map((h, i) => (
              <div key={i} className={`text-xs p-2 rounded ${colorAccion(h.accion)}`}>
                {h.numeroSerie || '—'} | {h.gasCodigo || '—'} | {h.diagnostico} | {h.accion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista previa foto */}
      {fotoBase64 && (
        <div>
          <p className="text-sm font-medium mb-1">Foto tomada:</p>
          <img src={fotoBase64} alt="Evidencia" className="max-w-xs rounded border" />
        </div>
      )}
    </div>
  )
}
