'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Truck, Package, Search, X, Check, Loader2, AlertTriangle, CircleOff, Info } from 'lucide-react'

const CAPACIDADES_LITROS = ['TODAS', '5', '10', '20', '40', '50']
const SVG_MARGIN = 40
const CIRCLE_GAP = 12

export default function LogisticaTab() {
  const { toast } = useToast()
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [selectedVeh, setSelectedVeh] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [gases, setGases] = useState<any[]>([])

  // Carga session state
  const [sesionActiva, setSesionActiva] = useState<any | null>(null)
  const [occupied, setOccupied] = useState<Record<number, any>>({})
  const [selectedPos, setSelectedPos] = useState<number | null>(null)

  // Tube search
  const [tubosDisponibles, setTubosDisponibles] = useState<any[]>([])
  const [searchSerie, setSearchSerie] = useState('')
  const [searchGas, setSearchGas] = useState('TODAS')
  const [searchCap, setSearchCap] = useState('TODAS')
  const [searchLoading, setSearchLoading] = useState(false)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  async function loadVehiculos() {
    setLoading(true)
    try {
      const res = await fetch('/api/vehiculos')
      setVehiculos(Array.isArray(await res.json()) ? await res.json() : [])
    } catch { /* ignore */ }
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

  // Calculate grid layout
  const gridCols = Math.ceil(Math.sqrt(maxTubos * ((selectedVeh?.anchoCajaCm || 200) / (selectedVeh?.largoCajaCm || 480))))
  const gridRows = Math.ceil(maxTubos / gridCols)
  const svgWidth = 600
  const svgHeight = svgWidth * ((selectedVeh?.anchoCajaCm || 200) / (selectedVeh?.largoCajaCm || 480)) * 0.8 + SVG_MARGIN * 2

  const cellW = (svgWidth - SVG_MARGIN * 2) / gridCols
  const cellH = (svgHeight - SVG_MARGIN * 2) / gridRows
  const circleR = Math.min(cellW, cellH) * 0.35 - CIRCLE_GAP / 2

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
      setSelectedPos(null)
      toast({ title: 'Sesión de carga iniciada' })
    } catch {
      toast({ title: 'Error al iniciar sesión', variant: 'destructive' })
    }
  }

  // Load active session
  async function loadActiveSession() {
    if (!selectedVeh) { setSesionActiva(null); setOccupied({}); return }
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos`)
      const sesiones = await res.json()
      const active = Array.isArray(sesiones) ? sesiones.find((s: any) => s.estado === 'ACTIVA') : null
      if (active) {
        const detailRes = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${active.id}`)
        const detail = await detailRes.json()
        setSesionActiva(detail)
        const occ: Record<number, any> = {}
        ;(detail.items || []).forEach((item: any) => { occ[item.posicion] = item })
        setOccupied(occ)
      } else {
        setSesionActiva(null)
        setOccupied({})
      }
    } catch { setSesionActiva(null); setOccupied({}) }
  }

  useEffect(() => { if (selectedVeh) loadActiveSession() }, [selectedVeh])

  // Search available cylinders
  async function searchTubos() {
    if (!sesionActiva) return
    setSearchLoading(true)
    try {
      let url = `/api/cylinders?estado=LLENO`
      if (searchSerie) url += `&serie=${encodeURIComponent(searchSerie)}`
      if (searchGas !== 'TODAS') url += `&gasId=${searchGas}`
      if (searchCap !== 'TODAS') url += `&capacidad=${searchCap}`
      const res = await fetch(url)
      let data = await res.json()
      // Filter out already loaded cylinders
      const loadedIds = new Set(Object.values(occupied).map((o: any) => o.cylinderId))
      data = (Array.isArray(data) ? data : []).filter((c: any) => !loadedIds.has(c.id))
      setTubosDisponibles(data)
    } catch { setTubosDisponibles([]) }
    setSearchLoading(false)
  }

  // Assign tube to position
  async function assignTube(cylinderId: string) {
    if (!sesionActiva || selectedPos == null) return
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cylinderId, posicion: selectedPos }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      await loadActiveSession()
      setSelectedPos(null)
      searchTubos()
      toast({ title: 'Tubo asignado a posición ' + selectedPos })
    } catch (e: any) {
      toast({ title: e.message || 'Error al asignar', variant: 'destructive' })
    }
  }

  // Remove tube from position
  async function removeTube(posicion: number) {
    if (!sesionActiva) return
    const item = occupied[posicion]
    if (!item) return
    try {
      await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}/items/${item.id}`, { method: 'DELETE' })
      await loadActiveSession()
      searchTubos()
      toast({ title: 'Tubo retirado de posición ' + posicion })
    } catch {
      toast({ title: 'Error al retirar', variant: 'destructive' })
    }
  }

  // Confirm and create movements
  async function confirmarCarga() {
    if (!sesionActiva || !selectedVeh) return
    const totalItems = Object.keys(occupied).length
    if (totalItems === 0) { toast({ title: 'No hay tubos cargados', variant: 'destructive' }); return }
    try {
      const res = await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}/confirmar`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const result = await res.json()
      toast({ title: `Carga confirmada: ${result.total} tubos` })
      setSesionActiva(null)
      setOccupied({})
      setSelectedPos(null)
    } catch {
      toast({ title: 'Error al confirmar carga', variant: 'destructive' })
    }
  }

  // Cancel session
  async function cancelarSesion() {
    if (!sesionActiva || !selectedVeh) return
    await fetch(`/api/vehiculos/${selectedVeh.id}/carga-tubos/${sesionActiva.id}`, { method: 'DELETE' })
    setSesionActiva(null)
    setOccupied({})
    setSelectedPos(null)
    toast({ title: 'Sesión cancelada' })
  }

  const totalCargados = Object.keys(occupied).length

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Truck className="w-5 h-5 text-blue-600" />
        Logística — Carga de Tubos
      </h2>

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
              }}
            >
              <option value="">Seleccionar vehículo...</option>
              {vehiculos.filter(v => v.estado === 'ACTIVO').map(v => (
                <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}</option>
              ))}
            </select>
          )}
          {selectedVeh && (
            <div className="text-xs space-y-1 bg-slate-50 rounded p-2">
              <p><span className="font-semibold">Patente:</span> {selectedVeh.patente}</p>
              <p><span className="font-semibold">Caja:</span> {selectedVeh.largoCajaCm || '?'}×{selectedVeh.anchoCajaCm || '?'} cm</p>
              <p><span className="font-semibold">Capacidad:</span> {selectedVeh.maxTubos || '—'} tubos</p>
              <p><span className="font-semibold">Orientación:</span> {orientacion === 'PARADOS' ? 'Parados' : 'Acostados'}</p>
              <hr className="my-1" />
              <p><span className="font-semibold">Cargados:</span> {totalCargados}/{maxTubos}</p>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(totalCargados / maxTubos) * 100}%` }} />
              </div>
            </div>
          )}
          {!sesionActiva && selectedVeh && (
            <Button onClick={startSession} className="w-full bg-blue-600 hover:bg-blue-700 gap-1" size="sm">
              <Package className="w-4 h-4" />Nueva Carga
            </Button>
          )}
          {sesionActiva && (
            <div className="space-y-2">
              <Button onClick={confirmarCarga} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1" size="sm">
                <Check className="w-4 h-4" />Confirmar Carga
              </Button>
              <Button onClick={cancelarSesion} variant="outline" className="w-full gap-1 text-red-600" size="sm">
                <X className="w-4 h-4" />Cancelar
              </Button>
            </div>
          )}
        </Card>

        {/* CENTER: SVG truck bed */}
        <Card className="lg:col-span-2 p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-600">Vista Superior — Caja del Camión</p>
            {sesionActiva && (
              <div className="flex gap-1">
                <button onClick={() => setViewMode('grid')} className={`px-2 py-1 rounded text-[10px] ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>Grilla</button>
                <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded text-[10px] ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>Lista</button>
              </div>
            )}
          </div>
          {!selectedVeh ? (
            <div className="flex items-center justify-center h-[400px] text-slate-400 text-sm">Seleccioná un vehículo</div>
          ) : !sesionActiva ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-2">
              <Truck className="w-12 h-12 text-slate-300" />
              <p className="text-sm">Iniciá una sesión de carga para comenzar</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="flex justify-center">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[600px]" style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                {/* Truck bed outline */}
                <rect x={SVG_MARGIN - 5} y={SVG_MARGIN - 5} width={svgWidth - SVG_MARGIN * 2 + 10} height={svgHeight - SVG_MARGIN * 2 + 10}
                  fill="none" stroke="#94a3b8" strokeWidth={2} rx={8} strokeDasharray="6,3" />

                {Array.from({ length: maxTubos }, (_, i) => {
                  const pos = i + 1
                  const col = i % gridCols
                  const row = Math.floor(i / gridCols)
                  const cx = SVG_MARGIN + cellW * col + cellW / 2
                  const cy = SVG_MARGIN + cellH * row + cellH / 2
                  const item = occupied[pos]
                  const gas = item?.cylinder?.gas
                  const isSelected = selectedPos === pos
                  const isOccupied = !!item

                  return (
                    <g key={pos} onClick={() => { if (sesionActiva) setSelectedPos(isOccupied ? null : pos) }}
                      className="cursor-pointer" style={{ cursor: isOccupied ? 'pointer' : 'pointer' }}>
                      {/* Circle */}
                      <circle cx={cx} cy={cy} r={Math.max(circleR, 15)}
                        fill={gas ? gas.colorHex : isSelected ? '#dbeafe' : '#f1f5f9'}
                        stroke={isSelected ? '#2563eb' : isOccupied ? gas?.colorHex || '#94a3b8' : '#cbd5e1'}
                        strokeWidth={isSelected ? 3 : 2}
                        opacity={isOccupied ? 1 : 0.6}
                      />
                      {/* Position number */}
                      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                        fill={isOccupied ? '#fff' : '#94a3b8'} fontSize={Math.min(circleR * 0.7, 14)}
                        fontWeight="bold" style={{ pointerEvents: 'none' }}>
                        {isOccupied ? '' : pos}
                      </text>
                      {/* Red X for occupied */}
                      {isOccupied && (
                        <g>
                          <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
                          <line x1={cx + 6} y1={cy - 6} x2={cx - 6} y2={cy + 6} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
                        </g>
                      )}
                      {/* Tooltip on hover */}
                      {isOccupied && (
                        <title>
                          {`${item.cylinder.numeroSerie}\nGas: ${gas?.nombre || '—'}\nPresión: ${item.cylinder.presionActualBar} bar\nPeso: ${item.cylinder.pesoVacioKg || '—'} kg\nPos: ${pos}`}
                        </title>
                      )}
                    </g>
                  )
                })}

                {/* Legend */}
                <text x={SVG_MARGIN} y={svgHeight - 10} fill="#94a3b8" fontSize={10}>
                  {totalCargados}/{maxTubos} tubos cargados — Click en posición vacía para asignar
                </text>
              </svg>
            </div>
          ) : (
            /* List view */
            <div className="overflow-y-auto max-h-[400px] space-y-1">
              {Array.from({ length: maxTubos }, (_, i) => {
                const pos = i + 1
                const item = occupied[pos]
                const cyl = item?.cylinder
                const gas = cyl?.gas
                return (
                  <div key={pos} className={`flex items-center gap-2 p-2 rounded text-xs border ${selectedPos === pos ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
                    onClick={() => { if (sesionActiva) setSelectedPos(selectedPos === pos ? null : pos) }}>
                    <span className="font-mono font-bold w-6 text-slate-400">#{pos}</span>
                    {cyl ? (
                      <>
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: gas?.colorHex || '#94a3b8' }} />
                        <span className="flex-1 font-semibold">{cyl.numeroSerie}</span>
                        <span className="text-slate-500">{gas?.nombre || '—'}</span>
                        <span className="text-slate-400">{cyl.presionActualBar} bar</span>
                        <span className="text-slate-400">{cyl.pesoVacioKg ? `${cyl.pesoVacioKg} kg` : '—'}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeTube(pos) }} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                      </>
                    ) : (
                      <span className="text-slate-300 italic">Vacío — click para asignar</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* RIGHT: Tube assignment panel */}
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
                    <p className="text-blue-600 mt-1">Ya ocupada — click en "X" para liberar</p>
                  ) : (
                    <p className="text-blue-600 mt-1">Buscá un tubo abajo para asignarlo</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Hacé click en una posición vacía del camión</p>
              )}

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
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: g.colorHex }} />
                              {g.nombre}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Capacidad</Label>
                    <Select value={searchCap} onValueChange={setSearchCap}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CAPACIDADES_LITROS.map(c => <SelectItem key={c} value={c}>{c === 'TODAS' ? 'Todas' : `${c} L`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={searchTubos} size="sm" className="w-full gap-1" disabled={searchLoading}>
                  {searchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  Buscar Tubos
                </Button>
              </div>

              <div className="overflow-y-auto max-h-[320px] space-y-1 border-t pt-2">
                {tubosDisponibles.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin resultados. Usá los filtros y buscá.</p>
                ) : tubosDisponibles.map((t: any) => (
                  <div key={t.id}
                    className={`flex items-center gap-2 p-1.5 rounded text-xs border cursor-pointer transition-colors ${selectedPos && !occupied[selectedPos] ? 'hover:bg-blue-50 border-transparent' : 'opacity-60'}`}
                    onClick={() => { if (selectedPos && !occupied[selectedPos]) assignTube(t.id) }}
                  >
                    <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: t.gas?.colorHex || '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{t.numeroSerie}</p>
                      <p className="text-slate-400 truncate">{t.gas?.nombre} · {t.capacidadLitros}L · {t.presionActualBar} bar</p>
                    </div>
                    {t.pesoVacioKg && <span className="text-slate-400 flex-shrink-0">{t.pesoVacioKg} kg</span>}
                    {selectedPos && !occupied[selectedPos] && (
                      <button className="text-blue-600 hover:text-blue-800 flex-shrink-0" title="Asignar"><Check className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
