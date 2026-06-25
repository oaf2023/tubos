'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Truck, Package, Search, X, Check, Loader2, AlertTriangle, Printer, Download, History, Eye, ClipboardList } from 'lucide-react'

const CAPACIDADES_LITROS = ['TODAS', '5', '10', '20', '40', '50']
const SVG_MARGIN = 40
const CIRCLE_GAP = 12

export default function LogisticaTab() {
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [selectedVeh, setSelectedVeh] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [gases, setGases] = useState<any[]>([])
  const [mode, setMode] = useState<'cargar' | 'consultar' | 'historial'>('cargar')

  // Carga session state
  const [sesionActiva, setSesionActiva] = useState<any | null>(null)
  const [occupied, setOccupied] = useState<Record<number, any>>({})
  const [occupiedIds, setOccupiedIds] = useState<Set<string>>(new Set())
  const [selectedPos, setSelectedPos] = useState<number | null>(null)

  // Tube search
  const [tubosDisponibles, setTubosDisponibles] = useState<any[]>([])
  const [searchSerie, setSearchSerie] = useState('')
  const [searchGas, setSearchGas] = useState('TODAS')
  const [searchCap, setSearchCap] = useState('TODAS')
  const [searchLoading, setSearchLoading] = useState(false)

  // Completed sessions
  const [completedSessions, setCompletedSessions] = useState<any[]>([])
  const [selectedCompleted, setSelectedCompleted] = useState<any | null>(null)

  // Pedidos
  const [pedidos, setPedidos] = useState<any[]>([])
  const [pedidosLoading, setPedidosLoading] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<string>('')

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  async function loadVehiculos() {
    setLoading(true)
    try {
      const res = await fetch('/api/vehiculos')
      if (!res.ok) { console.error('Error vehiculos', res.status); setLoading(false); return }
      const data = await res.json()
      setVehiculos(Array.isArray(data) ? data : [])
    } catch (e) { console.error('Error loadVehiculos', e) }
    setLoading(false)
  }

  async function loadGases() {
    try {
      const res = await fetch('/api/gases')
      const data = await res.json()
      setGases(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  useEffect(() => { loadVehiculos(); loadGases() }, [])

  const maxTubos = selectedVeh?.maxTubos || 12
  const orientacion = selectedVeh?.orientacionTubos || 'PARADOS'

  function calcLayout() {
    const cols = Math.ceil(Math.sqrt(maxTubos * ((selectedVeh?.anchoCajaCm || 200) / (selectedVeh?.largoCajaCm || 480))))
    const rows = Math.ceil(maxTubos / cols)
    const width = 600
    const height = width * ((selectedVeh?.anchoCajaCm || 200) / (selectedVeh?.largoCajaCm || 480)) * 0.8 + SVG_MARGIN * 2
    const cellW = (width - SVG_MARGIN * 2) / cols
    const cellH = (height - SVG_MARGIN * 2) / rows
    const circleR = Math.min(cellW, cellH) * 0.35 - CIRCLE_GAP / 2
    return { cols, rows, width, height, cellW, cellH, circleR }
  }

  const layout = calcLayout()

  // Start a new session
  async function startSession() {
    if (!selectedVeh) return
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'ACTIVA' }),
      })
      if (!res.ok) throw new Error()
      const sesion = await res.json()
      setSesionActiva(sesion)
      setOccupied({})
      setOccupiedIds(new Set())
      setSelectedPos(null)
      setMode('cargar')
      toast({ title: 'Sesión de carga iniciada' })
    } catch { toast({ title: 'Error al iniciar sesión', variant: 'destructive' }) }
  }

  // Load active session
  async function loadActiveSession() {
    if (!selectedVeh) { setSesionActiva(null); setOccupied({}); setOccupiedIds(new Set()); return }
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos`)
      const sesiones = await res.json()
      const active = Array.isArray(sesiones) ? sesiones.find((s: any) => s.estado === 'ACTIVA') : null
      if (active) {
        const detailRes = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${active.id}`)
        const detail = await detailRes.json()
        setSesionActiva(detail)
        const occ: Record<number, any> = {}
        const ids = new Set<string>()
        ;(detail.items || []).forEach((item: any) => { occ[item.posicion] = item; ids.add(item.cylinderId) })
        setOccupied(occ)
        setOccupiedIds(ids)
      } else {
        setSesionActiva(null)
        setOccupied({})
        setOccupiedIds(new Set())
      }
    } catch { setSesionActiva(null); setOccupied({}); setOccupiedIds(new Set()) }
  }

  useEffect(() => { if (selectedVeh) loadActiveSession() }, [selectedVeh])

  // Search available cylinders — pass occupiedIds directly to avoid stale closure
  const doSearch = useCallback(async (ids: Set<string>) => {
    if (!sesionActiva && mode === 'cargar') return
    setSearchLoading(true)
    try {
      let url = `/api/cylinders?estado=LLENO`
      if (searchSerie) url += `&serie=${encodeURIComponent(searchSerie)}`
      if (searchGas !== 'TODAS') url += `&gasId=${searchGas}`
      if (searchCap !== 'TODAS') url += `&capacidad=${searchCap}`
      const res = await fetch(url)
      let data = await res.json()
      data = (Array.isArray(data) ? data : []).filter((c: any) => !ids.has(c.id))
      setTubosDisponibles(data)
    } catch { setTubosDisponibles([]) }
    setSearchLoading(false)
  }, [sesionActiva, searchSerie, searchGas, searchCap, mode])

  // Wrapper that reads current occupiedIds
  function searchTubos() { doSearch(occupiedIds) }

  async function assignTube(cylinderId: string) {
    if (!sesionActiva || selectedPos == null) return
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cylinderId, posicion: selectedPos }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      await loadActiveSession()
      setSelectedPos(null)
      doSearch(new Set([...occupiedIds, cylinderId]))
      toast({ title: 'Tubo asignado a posición ' + selectedPos })
    } catch (e: any) { toast({ title: e.message || 'Error al asignar', variant: 'destructive' }) }
  }

  async function removeTube(posicion: number) {
    if (!sesionActiva) return
    const item = occupied[posicion]
    if (!item) return
    try {
      await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}/items/${item.id}`, { method: 'DELETE' })
      await loadActiveSession()
      toast({ title: 'Tubo retirado de posición ' + posicion })
    } catch { toast({ title: 'Error al retirar', variant: 'destructive' }) }
  }

  // Confirm carga and create movements
  async function confirmarCarga() {
    if (!sesionActiva || !selectedVeh) return
    const totalItems = Object.keys(occupied).length
    if (totalItems === 0) { toast({ title: 'No hay tubos cargados', variant: 'destructive' }); return }
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}/confirmar`, { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      const result = await res.json()
      toast({ title: `Carga confirmada: ${result.total} tubos en ${result.patente || selectedVeh.patente}` })
      setSesionActiva(null)
      setOccupied({})
      setOccupiedIds(new Set())
      setSelectedPos(null)
    } catch { toast({ title: 'Error al confirmar carga', variant: 'destructive' }) }
  }

  // Descargar — unload all tubes (set to VACIO)
  async function descargarSesion(sesionId?: string) {
    const targetId = sesionId || sesionActiva?.id
    if (!targetId || !selectedVeh) return
    if (!confirm('¿Descargar todos los tubos del camión? Se marcarán como VACÍOS.')) return
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${targetId}/descargar`, { method: 'POST' })
      if (!res.ok) throw new Error('Error al descargar')
      const result = await res.json()
      toast({ title: `Descarga completada: ${result.total} tubos marcados como VACÍO` })
      if (sesionId) { loadCompletedSessions(); setSelectedCompleted(null) }
      else { setSesionActiva(null); setOccupied({}); setOccupiedIds(new Set()) }
    } catch { toast({ title: 'Error al descargar', variant: 'destructive' }) }
  }

  async function cancelarSesion() {
    if (!sesionActiva || !selectedVeh) return
    await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}`, { method: 'DELETE' })
    setSesionActiva(null); setOccupied({}); setOccupiedIds(new Set()); setSelectedPos(null)
    toast({ title: 'Sesión cancelada' })
  }

  // Load completed sessions for consultar mode
  async function loadCompletedSessions() {
    if (!selectedVeh) return
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos`)
      const data = await res.json()
      setCompletedSessions(Array.isArray(data) ? data.filter((s: any) => s.estado !== 'ACTIVA') : [])
    } catch { setCompletedSessions([]) }
  }

  async function selectCompletedSession(s: any) {
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${s.id}`)
      const detail = await res.json()
      setSelectedCompleted(detail)
    } catch { setSelectedCompleted(null) }
  }

  useEffect(() => { if (selectedVeh && mode === 'consultar') loadCompletedSessions() }, [selectedVeh, mode])

  // Load from Pedido
  async function loadPedidos() {
    setPedidosLoading(true)
    try {
      const res = await fetch('/api/pedidos')
      const data = await res.json()
      setPedidos(Array.isArray(data) ? data.filter((p: any) => p.estado === 'PENDIENTE') : [])
    } catch { setPedidos([]) }
    setPedidosLoading(false)
  }

  async function cargarDesdePedido() {
    if (!selectedPedido || !sesionActiva || !selectedVeh) return
    try {
      const res = await fetch(`/api/pedidos/${selectedPedido}/cilindros`)
      const cilindros = await res.json()
      let asignados = 0
      for (const pc of cilindros) {
        if (!pc.cylinder || !pc.cylinder.id) continue
        if (occupiedIds.has(pc.cylinder.id)) continue
        // Find first empty position
        let pos = 1
        while (occupied[pos]) pos++
        if (pos > maxTubos) break
        const itemRes = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cylinderId: pc.cylinder.id, posicion: pos }),
        })
        if (itemRes.ok) asignados++
      }
      if (asignados > 0) {
        await loadActiveSession()
        toast({ title: `${asignados} tubos cargados desde pedido` })
      } else toast({ title: 'No se pudieron cargar tubos', variant: 'destructive' })
    } catch { toast({ title: 'Error al cargar desde pedido', variant: 'destructive' }) }
  }

  // Imprimir orden de despacho
  function imprimirManifest() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const sesion = selectedCompleted || sesionActiva
    if (!sesion || !selectedVeh) return
    const items = sesion.items || []
    const now = new Date().toLocaleString()
    const totalPeso = items.reduce((sum: number, i: any) => sum + (i.cylinder?.pesoVacioKg || 0), 0)

    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Orden de Despacho - ${selectedVeh.patente}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 14px; text-align: center; color: #444; margin-top: 0; }
        .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
        .info { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #ddd; border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 10px; }
        td { border: 1px solid #999; padding: 3px 6px; font-size: 10px; }
        .right { text-align: right; }
        .center { text-align: center; }
        .footer { position: fixed; bottom: 15mm; width: 100%; text-align: center; font-size: 9px; border-top: 1px solid #999; padding-top: 4px; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="header">
        <h1>CONTROL DIGITAL MANEJADATOS DISTRICON</h1>
        <h2>ORDEN DE DESPACHO / REMITO</h2>
        <div class="info">
          <span><b>Vehículo:</b> ${selectedVeh.patente} — ${selectedVeh.marca} ${selectedVeh.modelo}</span>
          <span><b>Fecha:</b> ${now}</span>
        </div>
        <div class="info">
          <span><b>Conductor:</b> ${selectedVeh.conductorAsignado || '—'}</span>
          <span><b>Sesión:</b> ${sesion.id?.slice(0,8) || '—'}</span>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>N° Serie</th><th>Gas</th><th>Cap. (L)</th><th>Presión (bar)</th><th>Peso (kg)</th><th>Diám. (mm)</th>
        </tr></thead>
        <tbody>
          ${items.sort((a: any, b: any) => a.posicion - b.posicion).map((i: any) => `
            <tr>
              <td class="center">${i.posicion}</td>
              <td>${i.cylinder?.numeroSerie || '—'}</td>
              <td>${i.cylinder?.gas?.nombre || '—'}</td>
              <td class="right">${i.cylinder?.capacidadLitros || '—'}</td>
              <td class="right">${i.cylinder?.presionActualBar || '—'}</td>
              <td class="right">${i.cylinder?.pesoVacioKg || '—'}</td>
              <td class="right">${i.cylinder?.diametroMm || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p><b>Total tubos:</b> ${items.length} &nbsp;|&nbsp; <b>Peso total aprox:</b> ${totalPeso.toFixed(1)} kg</p>
      <div class="footer">
        <p>Documento generado el ${now} — Control Digital ManejaDatos Districon</p>
        <p style="font-size:8px">Original: Cliente &nbsp;|&nbsp; Copia: Archivo</p>
      </div>
      <script>window.print()</script>
    </body></html>`)
    printWindow.document.close()
  }

  const totalCargados = Object.keys(occupied).length

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Truck className="w-5 h-5 text-blue-600" />
        Logística — Carga de Tubos
      </h2>

      {/* Mode tabs */}
      <div className="flex gap-1 border-b pb-1">
        {[
          { k: 'cargar' as const, l: 'Cargar', i: Package },
          { k: 'consultar' as const, l: 'Consultar', i: Eye },
          { k: 'historial' as const, l: 'Historial', i: History },
        ].map(t => (
          <button key={t.k} onClick={() => setMode(t.k)}
            className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${mode === t.k ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-800'}`}>
            <t.i className="w-3.5 h-3.5 inline mr-1" />{t.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* LEFT: Vehicle selector + capacity info */}
        <Card className="lg:col-span-1 p-3 space-y-3">
          <p className="text-sm font-semibold text-slate-600">Vehículo</p>
          {loading ? <p className="text-xs text-slate-400 text-center py-4">Cargando...</p> : (
            <select
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={selectedVeh?.id || ''}
              onChange={e => {
                const v = vehiculos.find(v => v.id === e.target.value)
                setSelectedVeh(v || null)
                setSelectedPos(null)
                setSelectedCompleted(null)
              }}
            >
              <option value="">Seleccionar vehículo...</option>
              {vehiculos.length === 0 && <option disabled>Sin vehículos disponibles</option>}
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo} [{v.estado}]</option>
              ))}
            </select>
          )}
          {selectedVeh && (
            <div className="text-xs space-y-1 bg-slate-50 rounded p-2">
              <p><span className="font-semibold">Patente:</span> {selectedVeh.patente}</p>
              <p><span className="font-semibold">Caja:</span> {selectedVeh.largoCajaCm || '?'}×{selectedVeh.anchoCajaCm || '?'} cm</p>
              <p><span className="font-semibold">Capacidad:</span> {selectedVeh.maxTubos || '—'} tubos</p>
              <p><span className="font-semibold">Orientación:</span> {orientacion === 'PARADOS' ? 'Parados' : 'Acostados'}</p>
              {mode === 'cargar' && sesionActiva && (
                <><hr className="my-1" />
                <p><span className="font-semibold">Cargados:</span> {totalCargados}/{maxTubos}</p>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(totalCargados / maxTubos) * 100}%` }} />
                </div></>
              )}
              {mode === 'consultar' && selectedCompleted && (
                <><hr className="my-1" />
                <p><span className="font-semibold">Tubos:</span> {selectedCompleted.items?.length || 0}</p></>
              )}
            </div>
          )}

          {/* Cargar mode buttons */}
          {mode === 'cargar' && !sesionActiva && selectedVeh && (
            <Button onClick={startSession} className="w-full bg-blue-600 hover:bg-blue-700 gap-1" size="sm">
              <Package className="w-4 h-4" />Nueva Carga
            </Button>
          )}
          {mode === 'cargar' && sesionActiva && (
            <div className="space-y-2">
              <Button onClick={confirmarCarga} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1" size="sm">
                <Check className="w-4 h-4" />Confirmar Carga
              </Button>
              <Button onClick={() => descargarSesion()} className="w-full bg-orange-600 hover:bg-orange-700 gap-1" size="sm">
                <Download className="w-4 h-4" />Descargar Todo
              </Button>
              <Button onClick={cancelarSesion} variant="outline" className="w-full gap-1 text-red-600" size="sm">
                <X className="w-4 h-4" />Cancelar
              </Button>
            </div>
          )}

          {/* Consultar mode */}
          {mode === 'consultar' && selectedVeh && (
            <div className="space-y-2">
              {selectedCompleted && (
                <>
                  <Button onClick={imprimirManifest} className="w-full bg-slate-700 hover:bg-slate-800 gap-1" size="sm">
                    <Printer className="w-4 h-4" />Imprimir Orden
                  </Button>
                  <Button onClick={() => descargarSesion(selectedCompleted.id)} className="w-full bg-orange-600 hover:bg-orange-700 gap-1" size="sm">
                    <Download className="w-4 h-4" />Descargar
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>

        {/* CENTER: SVG truck bed */}
        <Card className="lg:col-span-2 p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-600">
              {mode === 'cargar' ? 'Vista Superior — Carga de Tubos' :
               mode === 'consultar' ? 'Vista Superior — Consultar Carga' :
               'Historial de Cargas'}
            </p>
            {(sesionActiva || selectedCompleted) && (
              <div className="flex gap-1">
                <button onClick={() => setViewMode('grid')} className={`px-2 py-1 rounded text-[10px] ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>Grilla</button>
                <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded text-[10px] ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>Lista</button>
              </div>
            )}
          </div>

          {/* Historial mode */}
          {mode === 'historial' && (
            selectedVeh ? (
              <CompletedSessionsView
                vehiculoId={selectedVeh.id}
                onSelect={selectCompletedSession}
                selectedId={selectedCompleted?.id}
                onPrint={imprimirManifest}
                onDescargar={descargarSesion}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-slate-400 text-sm">Seleccioná un vehículo</div>
            )
          )}

          {/* No vehicle selected */}
          {mode !== 'historial' && !selectedVeh && (
            <div className="flex items-center justify-center h-[400px] text-slate-400 text-sm">Seleccioná un vehículo</div>
          )}

          {/* View truck SVG */}
          {mode !== 'historial' && selectedVeh && (
            mode === 'cargar' && !sesionActiva ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-2">
                <Truck className="w-12 h-12 text-slate-300" />
                <p className="text-sm">Iniciá una sesión de carga para comenzar</p>
              </div>
            ) : (
              <>
                {/* Truck bed SVG */}
                <div className="flex justify-center mb-3" ref={printRef}>
                  <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full max-w-[600px]" style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <rect x={SVG_MARGIN - 5} y={SVG_MARGIN - 5} width={layout.width - SVG_MARGIN * 2 + 10} height={layout.height - SVG_MARGIN * 2 + 10}
                      fill="none" stroke="#94a3b8" strokeWidth={2} rx={8} strokeDasharray="6,3" />
                    {Array.from({ length: maxTubos }, (_, i) => {
                      const pos = i + 1; const col = i % layout.cols; const row = Math.floor(i / layout.cols)
                      const cx = SVG_MARGIN + layout.cellW * col + layout.cellW / 2
                      const cy = SVG_MARGIN + layout.cellH * row + layout.cellH / 2
                      const currentOccupied = mode === 'consultar' && selectedCompleted
                        ? Object.fromEntries((selectedCompleted.items || []).map((it: any) => [it.posicion, it]))
                        : occupied
                      const item = currentOccupied[pos]
                      const gas = item?.cylinder?.gas
                      const isSelected = selectedPos === pos && mode === 'cargar'
                      const isOccupied = !!item

                      return (
                        <g key={pos} onClick={() => { if (mode === 'cargar' && sesionActiva) setSelectedPos(isOccupied && !selectedCompleted ? null : pos) }}
                          className={mode === 'cargar' ? 'cursor-pointer' : ''}>
                          <circle cx={cx} cy={cy} r={Math.max(layout.circleR, 15)}
                            fill={gas ? gas.colorHex : isSelected ? '#dbeafe' : '#f1f5f9'}
                            stroke={isSelected ? '#2563eb' : isOccupied ? gas?.colorHex || '#94a3b8' : '#cbd5e1'}
                            strokeWidth={isSelected ? 3 : 2} opacity={isOccupied ? 1 : 0.6} />
                          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                            fill={isOccupied ? '#fff' : '#94a3b8'} fontSize={Math.min(layout.circleR * 0.7, 14)}
                            fontWeight="bold" style={{ pointerEvents: 'none' }}>
                            {isOccupied ? '' : pos}
                          </text>
                          {isOccupied && (
                            <g>
                              <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
                              <line x1={cx + 6} y1={cy - 6} x2={cx - 6} y2={cy + 6} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
                            </g>
                          )}
                          {isOccupied && (
                            <title>
                              {`${item.cylinder.numeroSerie}\nGas: ${gas?.nombre || '—'}\nPresión: ${item.cylinder.presionActualBar} bar\nPeso: ${item.cylinder.pesoVacioKg || '—'} kg\nPos: ${pos}`}
                            </title>
                          )}
                        </g>
                      )
                    })}
                    <text x={SVG_MARGIN} y={layout.height - 10} fill="#94a3b8" fontSize={10}>
                      {mode === 'cargar' ? `${totalCargados}/${maxTubos} tubos — Click en posición vacía para asignar` : `${selectedCompleted?.items?.length || 0} tubos cargados`}
                    </text>
                  </svg>
                </div>

                {/* List view */}
                {viewMode === 'list' && (
                  <div className="overflow-y-auto max-h-[250px] space-y-1">
                    {Array.from({ length: maxTubos }, (_, i) => {
                      const pos = i + 1
                      const currentOccupied = mode === 'consultar' && selectedCompleted
                        ? Object.fromEntries((selectedCompleted.items || []).map((it: any) => [it.posicion, it]))
                        : occupied
                      const item = currentOccupied[pos]
                      const cyl = item?.cylinder; const gas = cyl?.gas
                      return (
                        <div key={pos} className={`flex items-center gap-2 p-1.5 rounded text-xs border ${selectedPos === pos && mode === 'cargar' ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}
                          onClick={() => { if (mode === 'cargar' && sesionActiva) setSelectedPos(selectedPos === pos ? null : pos) }}>
                          <span className="font-mono font-bold w-5 text-slate-400">#{pos}</span>
                          {cyl ? (
                            <><span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: gas?.colorHex || '#94a3b8' }} />
                              <span className="flex-1 font-semibold truncate">{cyl.numeroSerie}</span>
                              <span className="text-slate-500 hidden sm:inline">{gas?.nombre || '—'}</span>
                              {mode === 'cargar' && <button onClick={(e) => { e.stopPropagation(); removeTube(pos) }} className="text-red-500 hover:text-red-700 flex-shrink-0"><X className="w-3 h-3" /></button>}
                            </>
                          ) : <span className="text-slate-300 italic">Vacío</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )
          )}
        </Card>

        {/* RIGHT: Panel (varies by mode) */}
        {mode === 'cargar' && (
          <Card className="lg:col-span-1 p-3 space-y-3">
            <p className="text-sm font-semibold text-slate-600">Asignar Tubo</p>
            {!sesionActiva ? (
              <p className="text-xs text-slate-400 text-center py-8">Iniciá una carga para asignar tubos</p>
            ) : (
              <>
                {selectedPos ? (
                  <div className="bg-blue-50 rounded p-2 text-xs">
                    <p className="font-semibold text-blue-700">Posición seleccionada: #{selectedPos}</p>
                    {occupied[selectedPos] ? (
                      <p className="text-blue-600 mt-1">Ya ocupada — click en &quot;X&quot; para liberar</p>
                    ) : (
                      <p className="text-blue-600 mt-1">Buscá un tubo para asignarlo</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Hacé click en una posición vacía del camión</p>
                )}

                {/* Load from Pedido */}
                <div className="border rounded p-2 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500">CARGAR DESDE PEDIDO</p>
                  <select className="w-full border rounded px-1 py-1 text-xs" value={selectedPedido}
                    onChange={e => setSelectedPedido(e.target.value)} onClick={() => { if (pedidos.length === 0) loadPedidos() }}>
                    <option value="">Seleccionar pedido...</option>
                    {pedidos.map(p => <option key={p.id} value={p.id}>#{p.numero || p.id.slice(0,8)} — {p.cliente}</option>)}
                  </select>
                  <Button size="sm" className="w-full h-6 text-[10px]" onClick={cargarDesdePedido} disabled={!selectedPedido || !sesionActiva}>
                    <ClipboardList className="w-3 h-3 mr-1" />Cargar Tubos del Pedido
                  </Button>
                </div>

                {/* Search tubes */}
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px]">Buscar por serie</Label>
                    <Input value={searchSerie} onChange={e => setSearchSerie(e.target.value)} placeholder="N° serie..." className="h-7 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Gas</Label>
                      <Select value={searchGas} onValueChange={setSearchGas}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODAS">Todos</SelectItem>
                          {gases.map((g: any) => (
                            <SelectItem key={g.id} value={g.id}>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: g.colorHex }} />{g.nombre}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Capacidad</Label>
                      <Select value={searchCap} onValueChange={setSearchCap}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CAPACIDADES_LITROS.map(c => <SelectItem key={c} value={c}>{c === 'TODAS' ? 'Todas' : `${c} L`}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={searchTubos} size="sm" className="w-full gap-1" disabled={searchLoading}>
                    {searchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    Buscar Tubos
                  </Button>
                </div>

                <div className="overflow-y-auto max-h-[220px] space-y-1 border-t pt-2">
                  {tubosDisponibles.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Sin resultados. Usá los filtros y buscá.</p>
                  ) : tubosDisponibles.map((t: any) => (
                    <div key={t.id}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs border cursor-pointer transition-colors ${selectedPos && !occupied[selectedPos] ? 'hover:bg-blue-50 border-transparent' : 'opacity-60'}`}
                      onClick={() => { if (selectedPos && !occupied[selectedPos]) assignTube(t.id) }}>
                      <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: t.gas?.colorHex || '#94a3b8' }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{t.numeroSerie}</p>
                        <p className="text-slate-400 truncate">{t.gas?.nombre} · {t.capacidadLitros}L · {t.presionActualBar} bar</p>
                      </div>
                      {selectedPos && !occupied[selectedPos] && (
                        <button className="text-blue-600 hover:text-blue-800 flex-shrink-0" title="Asignar"><Check className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Consultar mode right panel */}
        {mode === 'consultar' && (
          <Card className="lg:col-span-1 p-3 space-y-3">
            <p className="text-sm font-semibold text-slate-600">Sesiones Completadas</p>
            {!selectedVeh ? (
              <p className="text-xs text-slate-400 text-center py-8">Seleccioná un vehículo</p>
            ) : (
              <CompletedSessionsList
                vehiculoId={selectedVeh.id}
                onSelect={selectCompletedSession}
                selectedId={selectedCompleted?.id}
              />
            )}
          </Card>
        )}

        {/* Historial mode right panel */}
        {mode === 'historial' && (
          <Card className="lg:col-span-1 p-3 space-y-3">
            <p className="text-sm font-semibold text-slate-600">Acciones</p>
            {selectedCompleted ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">Sesión: {selectedCompleted.id?.slice(0,12)}...</p>
                <p className="text-xs text-slate-500">Tubos: {selectedCompleted.items?.length || 0}</p>
                <Button onClick={imprimirManifest} className="w-full bg-slate-700 hover:bg-slate-800 gap-1" size="sm">
                  <Printer className="w-4 h-4" />Imprimir
                </Button>
                <Button onClick={() => descargarSesion(selectedCompleted.id)} className="w-full bg-orange-600 hover:bg-orange-700 gap-1" size="sm">
                  <Download className="w-4 h-4" />Descargar Tubos
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">Seleccioná una sesión del listado</p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

function CompletedSessionsList({ vehiculoId, onSelect, selectedId }: { vehiculoId: string; onSelect: (s: any) => void; selectedId?: string }) {
  const [sessions, setSessions] = useState<any[]>([])
  useEffect(() => {
    fetch(`/api/vehiculos/${vehiculoId}/carga-tubos`).then(r => r.json()).then(data => {
      setSessions(Array.isArray(data) ? data.filter((s: any) => s.estado !== 'ACTIVA') : [])
    }).catch(() => setSessions([]))
  }, [vehiculoId])

  if (sessions.length === 0) return <p className="text-xs text-slate-400 text-center py-8">Sin sesiones completadas</p>
  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {sessions.map((s: any) => (
        <div key={s.id} onClick={() => onSelect(s)}
          className={`p-2 rounded cursor-pointer text-xs border transition-colors ${selectedId === s.id ? 'bg-blue-50 border-blue-300' : 'border-transparent hover:bg-slate-50'}`}>
          <div className="flex justify-between items-center">
            <span className="font-semibold">{new Date(s.fecha).toLocaleDateString()}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {s.estado.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-slate-500">{s._count?.items || s.items?.length || 0} tubos</p>
        </div>
      ))}
    </div>
  )
}

function CompletedSessionsView({ vehiculoId, onSelect, selectedId, onPrint, onDescargar }: {
  vehiculoId: string; onSelect: (s: any) => void; selectedId?: string;
  onPrint: () => void; onDescargar: (id: string) => void;
}) {
  const [sessions, setSessions] = useState<any[]>([])
  useEffect(() => {
    fetch(`/api/vehiculos/${vehiculoId}/carga-tubos`).then(r => r.json()).then(data => {
      setSessions(Array.isArray(data) ? data.filter((s: any) => s.estado !== 'ACTIVA') : [])
    }).catch(() => setSessions([]))
  }, [vehiculoId])

  if (sessions.length === 0) return (
    <div className="flex items-center justify-center h-[400px] text-slate-400 text-sm">Sin cargas registradas</div>
  )

  return (
    <div className="overflow-y-auto max-h-[450px] space-y-2">
      {sessions.map((s: any) => (
        <div key={s.id} onClick={() => onSelect(s)}
          className={`p-3 rounded border text-xs cursor-pointer transition-colors ${selectedId === s.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-50'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{new Date(s.fecha).toLocaleDateString()} {new Date(s.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-slate-500">{s._count?.items || 0} tubos</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${s.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {s.estado.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={(e) => { e.stopPropagation(); onPrint() }} className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-1">
              <Printer className="w-3 h-3" />Imprimir
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDescargar(s.id) }} className="text-orange-600 hover:text-orange-800 text-[10px] flex items-center gap-1">
              <Download className="w-3 h-3" />Descargar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
