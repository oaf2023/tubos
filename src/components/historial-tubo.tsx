'use client'

import { useEffect, useState } from 'react'
import { History, X, ExternalLink, Loader2, Flag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

const FUENTE_ESTILO: Record<string, { badge: string; dot: string }> = {
  MOVIMIENTO: { badge: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
  EVENTO: { badge: 'bg-indigo-100 text-indigo-700 border-indigo-300', dot: 'bg-indigo-500' },
  MANTENIMIENTO: { badge: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' },
  REMITO: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
  DEVOLUCION: { badge: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  DOCUMENTO: { badge: 'bg-violet-100 text-violet-700 border-violet-300', dot: 'bg-violet-500' },
  PEDIDO: { badge: 'bg-sky-100 text-sky-700 border-sky-300', dot: 'bg-sky-500' },
  LECTURA: { badge: 'bg-teal-100 text-teal-700 border-teal-300', dot: 'bg-teal-500' },
  REPARTO: { badge: 'bg-zinc-100 text-zinc-700 border-zinc-300', dot: 'bg-zinc-500' },
  CONSULTA: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
}

function estiloFuente(fuente: string) {
  return FUENTE_ESTILO[fuente] || { badge: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' }
}

interface EventoHistorial {
  id: string
  fecha: string
  fuente: string
  titulo: string
  detalle?: string
  cliente?: string
  ubicacion?: string
  usuario?: string
  estadoAnterior?: string
  estadoNuevo?: string
  fotoUrl?: string
  autorizadoPor?: string
  enlace?: { tab: string } | null
}

interface HistorialTuboProps {
  tubeId: string | null
  open: boolean
  onClose: () => void
  nombre?: string
}

function navegarATab(tab?: string) {
  if (!tab) return
  document.querySelector<HTMLElement>(`button[data-value="${tab}"]`)?.click()
}

export default function HistorialTubo({ tubeId, open, onClose, nombre }: HistorialTuboProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ numeroSerie: string; gas?: any; eventos: EventoHistorial[] } | null>(null)

  useEffect(() => {
    if (!open || !tubeId) return
    setLoading(true)
    setError(null)
    fetch(`/api/cylinders/${tubeId}/historial`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setError('No se pudo cargar el historial'))
      .finally(() => setLoading(false))
  }, [open, tubeId])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-500" />
            Historial de tubo {nombre || (data?.numeroSerie ? `#${data.numeroSerie}` : '')}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 text-sm">{error}</div>
          ) : data && data.eventos.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Sin registros para este tubo</div>
          ) : (
            <div className="space-y-0 py-2">
              {data?.eventos.map((e, idx) => {
                const est = estiloFuente(e.fuente)
                const esUltimo = idx === data.eventos.length - 1
                return (
                  <div key={e.id} className="relative flex gap-3 pb-5">
                    {!esUltimo && <span className="absolute left-[5px] top-6 bottom-0 w-px bg-slate-200" />}
                    <span className={`mt-1.5 h-[11px] w-[11px] flex-shrink-0 rounded-full ring-2 ring-white ${est.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${est.badge}`}>{e.fuente}</Badge>
                        <span className="text-[11px] text-slate-400">
                          {new Date(e.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        {e.enlace?.tab && (
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-slate-500" onClick={() => navegarATab(e.enlace?.tab)}>
                            <ExternalLink className="w-3 h-3 mr-0.5" /> ver
                          </Button>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-800 mt-0.5">{e.titulo}</div>
                      {e.estadoAnterior && (e.estadoNuevo || e.estadoAnterior) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {e.estadoAnterior && <Badge variant="outline" className="text-[10px]">{e.estadoAnterior}</Badge>}
                          {e.estadoNuevo && (<><span className="text-[10px] text-slate-400">→</span><Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700">{e.estadoNuevo}</Badge></>)}
                        </div>
                      )}
                      {e.detalle && <p className="text-xs text-slate-600 mt-0.5">{e.detalle}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                        {e.cliente && <span>Cliente: <strong>{e.cliente}</strong></span>}
                        {e.usuario && <span>Operador: <strong>{e.usuario}</strong></span>}
                        {e.ubicacion && <span>Ubicación: <strong>{e.ubicacion}</strong></span>}
                        {e.autorizadoPor && (
                          <span className="text-amber-600 flex items-center gap-0.5">
                            <Flag className="w-3 h-3" /> Autorizado por {e.autorizadoPor}
                          </span>
                        )}
                      </div>
                      {e.fotoUrl && (
                        <a href={e.fotoUrl} target="_blank" rel="noreferrer" className="inline-block mt-1.5 group">
                          <img src={e.fotoUrl} alt="Evidencia" className="w-20 h-20 object-cover rounded-lg border group-hover:opacity-80" />
                        </a>
                      )}
                    </div>
                    <div className="ml-auto self-start mt-1.5">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-slate-500" onClick={onClose} title="Cerrar">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <Loader2 className="w-3 h-3" /> {data?.eventos.length} registro(s) · ordenados por fecha
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
