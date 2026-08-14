'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { CheckCircle2, FileText, Loader2, PenLine, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FirmaCanvas from '@/components/firma-canvas'

interface FirmaData {
  numero: number
  cliente: string | null
  tecnico: string | null
  fecha: string
  estado: string
  firmado: boolean
  totalItems: number
  descargados: number
  items: { numeroSerie: string | null; gasCodigo: string; cantidad: number; descargado: boolean }[]
}

export default function FirmarPage({ params }: { params: Promise<{ firmaToken: string }> }) {
  const { firmaToken } = use(params)
  const [data, setData] = useState<FirmaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [firma, setFirma] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/remitos/firma/${firmaToken}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Remito no encontrado')
      } else {
        setData(json)
      }
    } catch {
      setError('No se pudo cargar el remito. Verificá el enlace.')
    }
    setLoading(false)
  }, [firmaToken])

  useEffect(() => { load() }, [load])

  async function firmar() {
    if (!firma || !nombre.trim()) return
    setEnviando(true)
    try {
      const res = await fetch(`/api/remitos/firma/${firmaToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firma, nombre: nombre.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al firmar')
      setOk(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al firmar')
    }
    setEnviando(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <PenLine className="w-5 h-5 text-slate-300" />
          <h1 className="text-lg font-semibold">Firma del remito</h1>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {ok && data && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div className="text-lg font-semibold">¡Remito firmado!</div>
            <p className="text-sm text-emerald-200">
              Remito N°{data.numero} — {data.cliente || 'Cliente'} — firmado por <b>{nombre}</b>.
            </p>
            <p className="text-xs text-slate-400">La firma quedó guardada junto al remito.</p>
          </div>
        )}

        {!ok && data && !error && (
          <>
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-300" />
                <span className="font-semibold">Remito N°{data.numero}</span>
                <span className="text-xs text-slate-400 ml-auto">{new Date(data.fecha).toLocaleDateString('es-AR')}</span>
              </div>
              <p className="text-sm text-slate-300">Cliente: <b>{data.cliente || '—'}</b></p>
              {data.tecnico && <p className="text-xs text-slate-400">Conductor / técnico: {data.tecnico}</p>}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Tubos entregados:</span>
                <span className={data.descargados === data.totalItems && data.totalItems > 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {data.descargados}/{data.totalItems}
                </span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-700">
                {data.items.map((it, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{it.numeroSerie || `Gas ${it.gasCodigo} (x${it.cantidad})`}</span>
                    <span className={it.descargado ? 'text-emerald-400' : 'text-amber-400'}>{it.descargado ? 'Descargado' : 'Pendiente'}</span>
                  </li>
                ))}
              </ul>
            </div>

            {data.estado === 'FIRMADO' ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-center text-emerald-200">
                Este remito ya fue firmado.
              </div>
            ) : data.descargados !== data.totalItems || data.totalItems === 0 ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                El remito aún no está completo: faltan descargarse{' '}
                <b>{data.totalItems - data.descargados}</b> tubo(s) en destino. Cuando el conductor termine la
                descarga podrá firmar acá.
              </div>
            ) : (
              <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-4">
                <div>
                  <Label className="text-xs text-slate-400">Firme en el recuadro</Label>
                  <div className="mt-2">
                    <FirmaCanvas onChange={setFirma} height={170} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Nombre y apellido</Label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre de quien recibe"
                    className="mt-1 bg-slate-900 border-slate-600 text-slate-100"
                  />
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={!firma || !nombre.trim() || enviando} onClick={firmar}>
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                  Firmar y aceptar entrega
                </Button>
                <p className="text-[10px] text-slate-500 text-center">
                  Al firmar acepta recibir los tubos detallados en este remito.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}