'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Package, GitBranch, Edit3, Trash2, Plus, RefreshCw, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Cylinder, Gas, Location } from '@/lib/tab-types'
import { SgaBadge, ESTADO_COLORS, ESTADO_LABELS, formatDate, daysUntil, NODE_COLORS } from '@/lib/tab-constants'
import { ESTADOS, CAPACIDADES_LITROS } from '@/lib/catalogo'

function SimpleGraph({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const W = 700, H = 400, CX = W / 2, CY = H / 2, R = 140

  const cylNode = nodes.find(n => n.type === 'Cylinder')
  const others = nodes.filter(n => n.type !== 'Cylinder')
  const positioned = new Map<string, { x: number; y: number }>()
  if (cylNode) positioned.set(cylNode.id, { x: CX, y: CY })
  others.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2
    positioned.set(n.id, { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) })
  })

  function miniLabel(n: any): string {
    if (n.type === 'Cylinder') return `#${n.label}`
    return n.label || n.id
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 250 }}>
        {edges.map((e, i) => {
          const s = positioned.get(e.source)
          const t = positioned.get(e.target)
          if (!s || !t) return null
          return (
            <g key={i}>
              <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="#94a3b8" strokeWidth={1.5} />
              <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 4}
                textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
                {e.type}
              </text>
            </g>
          )
        })}
        {nodes.map(n => {
          const p = positioned.get(n.id)
          if (!p) return null
          const c = NODE_COLORS[n.type] || NODE_COLORS.Cylinder
          const isCyl = n.type === 'Cylinder'
          const w = isCyl ? 120 : 100
          return (
            <g key={n.id}>
              <title>{miniLabel(n)}</title>
              <rect x={p.x - w / 2} y={p.y - 14} width={w} height={28} rx={14}
                fill={c.fill} stroke={c.stroke} strokeWidth={2} />
              <text x={p.x} y={p.y + 4.5} textAnchor="middle"
                fill={c.text} fontSize="10" fontFamily="monospace" fontWeight="600">
                {isCyl ? `#${n.label}` : n.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function InventarioTab() {
  const { toast } = useToast()
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroGas, setFiltroGas] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroCapacidad, setFiltroCapacidad] = useState('all')
  const [filtroUbicacion, setFiltroUbicacion] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [graphCylinder, setGraphCylinder] = useState<Cylinder | null>(null)
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[]; source: string } | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)

  async function loadGraph(cyl: Cylinder) {
    setGraphLoading(true)
    setGraphCylinder(cyl)
    setGraphData(null)
    try {
      const res = await fetch(`/api/cylinders/${cyl.id}/graph`)
      if (!res.ok) throw new Error()
      setGraphData(await res.json())
    } catch { setGraphData(null) }
    finally { setGraphLoading(false) }
  }

  const emptyForm = {
    numeroSerie: '',
    gasId: '',
    propietario: '',
    fabricante: '',
    paisFabricacion: '',
    marcaUN: 'false',
    normaFabricacion: '',
    presionTrabajoBar: '',
    roscacilindro: '',
    espesorMinParedMm: '',
    materialAleacion: '',
    capacidadLitros: '40',
    diametroMm: '',
    pesoVacioKg: '',
    pesoTaraKg: '',
    pesoMaxLlenadoKg: '',
    presionEnsayoBar: '',
    fechaEnsayoInicial: '',
    fechaUltimoRetest: '',
    fechaProximoRetest: '',
    resultadoInspeccion: 'APROBADO',
    inspectorId: '',
    laboratorio: '',
    metodoPrueba: '',
    presionActualBar: '200',
    masaPorosaId: '',
    tipoSolvente: '',
    solventeMasaKg: '',
    vidaUtilLimite: '',
    reparaciones: '',
    observaciones: '',
    compatibleH2: 'false',
    estado: 'LLENO',
    ubicacionNombre: 'San Nicolás de los Arroyos',
    provincia: 'Buenos Aires',
    ubicacionLat: '-33.3293',
    ubicacionLng: '-60.2244',
    cliente: '',
  }
  const [form, setForm] = useState({ ...emptyForm })

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroSerie) params.set('serie', filtroSerie)
      if (filtroGas !== 'all') params.set('gasId', filtroGas)
      if (filtroEstado !== 'all') params.set('estado', filtroEstado)
      if (filtroCapacidad !== 'all') params.set('capacidad', filtroCapacidad)
      if (filtroUbicacion !== 'all') params.set('ubicacion', filtroUbicacion)
      const [cylRes, gasRes, locRes] = await Promise.all([
        fetch(`/api/cylinders?${params}`),
        fetch('/api/gases'),
        fetch('/api/locations'),
      ])
      const [cylData, gasData, locData] = await Promise.all([
        cylRes.json(),
        gasRes.json(),
        locRes.json(),
      ])
      setCylinders(Array.isArray(cylData) ? cylData : [])
      setGases(Array.isArray(gasData) ? gasData : [])
      setLocations(Array.isArray(locData) ? locData : [])
    } finally {
      setLoading(false)
    }
  }, [filtroSerie, filtroGas, filtroEstado, filtroCapacidad, filtroUbicacion])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  function openCreate() {
    setEditId(null)
    setForm({
      ...emptyForm,
      numeroSerie: `SN-2026-${String(cylinders.length + 1).padStart(4, '0')}`,
      gasId: gases[0]?.id || '',
      capacidadLitros: '40',
      presionActualBar: gases[0] ? String(gases[0].presionBar) : '200',
      ubicacionNombre: 'San Nicolás de los Arroyos',
      provincia: 'Buenos Aires',
      ubicacionLat: '-33.3293',
      ubicacionLng: '-60.2244',
      resultadoInspeccion: 'APROBADO',
      estado: 'LLENO',
    })
    setDialogOpen(true)
  }

  function openEdit(c: Cylinder) {
    setEditId(c.id)
    setForm({
      numeroSerie: c.numeroSerie,
      gasId: c.gasId,
      propietario: c.propietario || '',
      fabricante: c.fabricante || '',
      paisFabricacion: c.paisFabricacion || '',
      marcaUN: c.marcaUN ? 'true' : 'false',
      normaFabricacion: c.normaFabricacion || '',
      presionTrabajoBar: c.presionTrabajoBar != null ? String(c.presionTrabajoBar) : '',
      roscacilindro: c.roscacilindro || '',
      espesorMinParedMm: c.espesorMinParedMm != null ? String(c.espesorMinParedMm) : '',
      materialAleacion: c.materialAleacion || '',
      capacidadLitros: String(c.capacidadLitros),
      diametroMm: c.diametroMm != null ? String(c.diametroMm) : '',
      pesoVacioKg: c.pesoVacioKg != null ? String(c.pesoVacioKg) : '',
      pesoTaraKg: c.pesoTaraKg != null ? String(c.pesoTaraKg) : '',
      pesoMaxLlenadoKg: c.pesoMaxLlenadoKg != null ? String(c.pesoMaxLlenadoKg) : '',
      presionEnsayoBar: c.presionEnsayoBar != null ? String(c.presionEnsayoBar) : '',
      fechaEnsayoInicial: c.fechaEnsayoInicial || '',
      fechaUltimoRetest: c.fechaUltimoRetest ? c.fechaUltimoRetest.split('T')[0] : '',
      fechaProximoRetest: c.fechaProximoRetest ? c.fechaProximoRetest.split('T')[0] : '',
      resultadoInspeccion: c.resultadoInspeccion || 'APROBADO',
      inspectorId: c.inspectorId || '',
      laboratorio: c.laboratorio || '',
      metodoPrueba: c.metodoPrueba || '',
      presionActualBar: String(c.presionActualBar),
      masaPorosaId: c.masaPorosaId || '',
      tipoSolvente: c.tipoSolvente || '',
      solventeMasaKg: c.solventeMasaKg != null ? String(c.solventeMasaKg) : '',
      vidaUtilLimite: c.vidaUtilLimite ? c.vidaUtilLimite.split('T')[0] : '',
      reparaciones: c.reparaciones || '',
      observaciones: c.observaciones || '',
      compatibleH2: c.compatibleH2 ? 'true' : 'false',
      estado: c.estado,
      ubicacionNombre: c.ubicacionNombre,
      provincia: c.provincia,
      ubicacionLat: String(c.ubicacionLat),
      ubicacionLng: String(c.ubicacionLng),
      cliente: c.cliente || '',
    })
    setDialogOpen(true)
  }

  async function save() {
    try {
      const url = editId ? `/api/cylinders/${editId}` : '/api/cylinders'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      toast({
        title: editId ? 'Tubo actualizado' : 'Tubo creado',
        description: `Serie ${form.numeroSerie} guardada correctamente`,
      })
      setDialogOpen(false)
      load()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  async function remove(c: Cylinder) {
    if (!confirm(`¿Eliminar el tubo ${c.numeroSerie}?`)) return
    await fetch(`/api/cylinders/${c.id}`, { method: 'DELETE' })
    toast({ title: 'Tubo eliminado', description: c.numeroSerie })
    load()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs flex items-center gap-1">
                <Search className="w-3 h-3" /> Número de serie
              </Label>
              <Input
                placeholder="Ej: SN-2024-0001"
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
              />
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs">Gas</Label>
              <Select value={filtroGas} onValueChange={setFiltroGas}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los gases</SelectItem>
                  {gases.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre} ({g.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs">Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[120px]">
              <Label className="text-xs">Capacidad</Label>
              <Select value={filtroCapacidad} onValueChange={setFiltroCapacidad}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CAPACIDADES_LITROS.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      {c} L
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <Label className="text-xs">Ubicación</Label>
              <Select value={filtroUbicacion} onValueChange={setFiltroUbicacion}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.nombre}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 ml-auto"
            >
              <Plus className="w-4 h-4 mr-1" /> Nuevo Tubo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Inventario de Tubos
              </CardTitle>
              <CardDescription>
                {loading
                  ? 'Cargando...'
                  : `${cylinders.length} tubo(s) encontrado(s)`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : cylinders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No se encontraron tubos con los filtros aplicados
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-32">N° de Serie</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead className="text-center">Cap.</TableHead>
                    <TableHead className="text-center">Presión</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Vence</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cylinders.map((c) => {
                    const diasVenc = daysUntil(c.fechaProximoRetest)
                    const vencido = diasVenc < 0
                    const proximoVencer = diasVenc >= 0 && diasVenc <= 30
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs font-semibold">
                          {c.numeroSerie}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-300"
                              style={{ background: c.gas.colorHex }}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {c.gas.nombre}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-slate-400">{c.gas.codigo}</span>
                                <SgaBadge peligro={c.gas.peligro} />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium tabular-nums">
                          {c.capacidadLitros}L
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-xs">
                          {c.presionActualBar} bar
                          <div className="text-slate-400">/ {c.gas.presionBar}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${ESTADO_COLORS[c.estado]} text-white hover:opacity-90 text-xs`}
                          >
                            {ESTADO_LABELS[c.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {c.ubicacionNombre}
                          </div>
                          <div className="text-xs text-slate-500">{c.provincia}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {c.cliente || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`text-xs ${
                              vencido
                                ? 'text-red-600 font-bold'
                                : proximoVencer
                                ? 'text-amber-600 font-medium'
                                : 'text-slate-600'
                            }`}
                          >
                            {formatDate(c.fechaProximoRetest)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-purple-600"
                              onClick={() => loadGraph(c)}
                              title="Ver grafo de relaciones"
                            >
                              <GitBranch className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(c)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => remove(c)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Editar Tubo' : 'Nuevo Tubo de Gas'}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? `Modificando ${form.numeroSerie}`
                : 'Complete los datos del nuevo tubo para soldadura'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Identificación General</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Número de serie *</Label>
                  <Input value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} placeholder="SN-2026-0001" />
                </div>
                <div>
                  <Label className="text-xs">Tipo de gas *</Label>
                  <Select value={form.gasId} onValueChange={(v) => { const g = gases.find((x) => x.id === v); setForm({ ...form, gasId: v, presionActualBar: g ? String(g.presionBar) : form.presionActualBar }) }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar gas" /></SelectTrigger>
                    <SelectContent>
                      {gases.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: g.colorHex }} />
                            {g.nombre} ({g.codigo})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Propietario</Label>
                  <Input value={form.propietario} onChange={(e) => setForm({ ...form, propietario: e.target.value })} placeholder="ManejaDatos Districon" />
                </div>
                <div>
                  <Label className="text-xs">Estado actual</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (<SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Especificaciones de Diseño</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Fabricante</Label>
                  <Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} placeholder="Ej: FAE, Luxfer" />
                </div>
                <div>
                  <Label className="text-xs">País de fabricación</Label>
                  <Input value={form.paisFabricacion} onChange={(e) => setForm({ ...form, paisFabricacion: e.target.value })} placeholder="Argentina" />
                </div>
                <div>
                  <Label className="text-xs">Marca UN</Label>
                  <Select value={form.marcaUN} onValueChange={(v) => setForm({ ...form, marcaUN: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Norma de fabricación</Label>
                  <Input value={form.normaFabricacion} onChange={(e) => setForm({ ...form, normaFabricacion: e.target.value })} placeholder="NTC 5719 / ISO 18119" />
                </div>
                <div>
                  <Label className="text-xs">Presión de trabajo (bar)</Label>
                  <Input type="number" value={form.presionTrabajoBar} onChange={(e) => setForm({ ...form, presionTrabajoBar: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Roscacilindro / Conexión</Label>
                  <Input value={form.roscacilindro} onChange={(e) => setForm({ ...form, roscacilindro: e.target.value })} placeholder="25E / G5/8" />
                </div>
                <div>
                  <Label className="text-xs">Espesor mínimo pared (mm)</Label>
                  <Input type="number" step="0.1" value={form.espesorMinParedMm} onChange={(e) => setForm({ ...form, espesorMinParedMm: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Material / Aleación</Label>
                  <Input value={form.materialAleacion} onChange={(e) => setForm({ ...form, materialAleacion: e.target.value })} placeholder="Acero / Aluminio" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Pesos y Capacidades</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Capacidad (litros) *</Label>
                  <Select value={form.capacidadLitros} onValueChange={(v) => setForm({ ...form, capacidadLitros: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAPACIDADES_LITROS.map((c) => (<SelectItem key={c} value={String(c)}>{c} L</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Peso vacío (kg)</Label>
                  <Input type="number" step="0.1" value={form.pesoVacioKg} onChange={(e) => setForm({ ...form, pesoVacioKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Diámetro (mm)</Label>
                  <Input type="number" step="1" value={form.diametroMm} onChange={(e) => setForm({ ...form, diametroMm: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Peso tara (kg)</Label>
                  <Input type="number" step="0.1" value={form.pesoTaraKg} onChange={(e) => setForm({ ...form, pesoTaraKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Peso máximo llenado (kg)</Label>
                  <Input type="number" step="0.1" value={form.pesoMaxLlenadoKg} onChange={(e) => setForm({ ...form, pesoMaxLlenadoKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Presión de ensayo (bar)</Label>
                  <Input type="number" value={form.presionEnsayoBar} onChange={(e) => setForm({ ...form, presionEnsayoBar: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Presión actual (bar)</Label>
                  <Input type="number" value={form.presionActualBar} onChange={(e) => setForm({ ...form, presionActualBar: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Inspección y Recalificación</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Fecha ensayo inicial</Label>
                  <Input type="date" value={form.fechaEnsayoInicial} onChange={(e) => setForm({ ...form, fechaEnsayoInicial: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Fecha último retest</Label>
                  <Input type="date" value={form.fechaUltimoRetest} onChange={(e) => setForm({ ...form, fechaUltimoRetest: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Próximo retest *</Label>
                  <Input type="date" value={form.fechaProximoRetest} onChange={(e) => setForm({ ...form, fechaProximoRetest: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Resultado inspección</Label>
                  <Select value={form.resultadoInspeccion} onValueChange={(v) => setForm({ ...form, resultadoInspeccion: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APROBADO">Aprobado</SelectItem>
                      <SelectItem value="CONDICIONAL">Condicional</SelectItem>
                      <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Inspector ID</Label>
                  <Input value={form.inspectorId} onChange={(e) => setForm({ ...form, inspectorId: e.target.value })} placeholder="N.º habilitación" />
                </div>
                <div>
                  <Label className="text-xs">Laboratorio</Label>
                  <Input value={form.laboratorio} onChange={(e) => setForm({ ...form, laboratorio: e.target.value })} placeholder="Laboratorio habilitado" />
                </div>
                <div>
                  <Label className="text-xs">Método de prueba</Label>
                  <Input value={form.metodoPrueba} onChange={(e) => setForm({ ...form, metodoPrueba: e.target.value })} placeholder="PH / Ultrasonido" />
                </div>
                <div>
                  <Label className="text-xs">Vida útil límite</Label>
                  <Input type="date" value={form.vidaUtilLimite} onChange={(e) => setForm({ ...form, vidaUtilLimite: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Campos Específicos (Disolución / Masa Porosa)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Masa porosa ID / tipo</Label>
                  <Input value={form.masaPorosaId} onChange={(e) => setForm({ ...form, masaPorosaId: e.target.value })} placeholder="AEC / ACM" />
                </div>
                <div>
                  <Label className="text-xs">Tipo de solvente</Label>
                  <Input value={form.tipoSolvente} onChange={(e) => setForm({ ...form, tipoSolvente: e.target.value })} placeholder="Acetona / DMF" />
                </div>
                <div>
                  <Label className="text-xs">Solvente — masa (kg)</Label>
                  <Input type="number" step="0.1" value={form.solventeMasaKg} onChange={(e) => setForm({ ...form, solventeMasaKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Compatible H₂</Label>
                  <Select value={form.compatibleH2} onValueChange={(v) => setForm({ ...form, compatibleH2: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Observaciones</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs">Reparaciones</Label>
                  <Input value={form.reparaciones} onChange={(e) => setForm({ ...form, reparaciones: e.target.value })} placeholder="Historial de reparaciones si aplica" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Observaciones</Label>
                  <Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Notas adicionales" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Ubicación y Cliente</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">Ubicación (ciudad) *</Label>
                  <Select value={form.ubicacionNombre} onValueChange={(v) => { const loc = locations.find((l) => l.nombre === v); if (loc) { setForm({ ...form, ubicacionNombre: loc.nombre, provincia: loc.provincia, ubicacionLat: String(loc.lat), ubicacionLng: String(loc.lng) }) } }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (<SelectItem key={l.id} value={l.nombre}>{l.esBase && '🏭 '} {l.nombre} ({l.provincia})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">Cliente / Destino</Label>
                  <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Nombre del cliente" />
                </div>
                <div className="hidden">
                  <Input value={form.ubicacionLat} readOnly />
                  <Input value={form.ubicacionLng} readOnly />
                  <Input value={form.provincia} readOnly />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={save} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!graphCylinder} onOpenChange={(o) => { if (!o) setGraphCylinder(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-600" />
              Grafo de relaciones — {graphCylinder?.numeroSerie}
            </DialogTitle>
            <DialogDescription>
              Nodos: {graphData?.nodes.length ?? 0} | Aristas: {graphData?.edges.length ?? 0}
              {graphData?.source === 'neo4j' ? <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-[10px]">Neo4j</Badge> : <Badge className="ml-2 bg-amber-100 text-amber-700 text-[10px]">SQLite</Badge>}
            </DialogDescription>
          </DialogHeader>

          {graphLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : !graphData || graphData.nodes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Sin datos de grafo para este tubo</div>
          ) : (
            <div className="space-y-4">
              <SimpleGraph nodes={graphData.nodes} edges={graphData.edges} />

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {graphData.nodes.map(n => (
                      <TableRow key={n.id}>
                        <TableCell>
                          <Badge variant="outline" style={{ background: NODE_COLORS[n.type]?.fill || '#f1f5f9', color: NODE_COLORS[n.type]?.text || '#475569', borderColor: NODE_COLORS[n.type]?.stroke || '#cbd5e1' }} className="text-[10px]">
                            {n.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{n.label}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-64 truncate">
                          {n.type === 'Cylinder' && `${n.properties.estado || ''} | ${n.properties.capacidad || ''}L | ${n.properties.presion || ''}bar`}
                          {n.type === 'Gas' && `${n.properties.codigo || ''}`}
                          {n.type === 'Cliente' && ''}
                          {n.type === 'Location' && `${n.properties.provincia || ''}`}
                          {n.type === 'Movimiento' && `${n.properties.tipo || ''} @ ${n.properties.ubicacion || ''}`}
                          {n.type === 'Mantenimiento' && `${n.properties.tipo || ''}${n.properties.tecnico ? ` por ${n.properties.tecnico}` : ''}`}
                          {!['Cylinder', 'Gas', 'Cliente', 'Location', 'Movimiento', 'Mantenimiento'].includes(n.type) && JSON.stringify(n.properties).slice(0, 60)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <details>
                <summary className="text-sm font-medium text-slate-500 cursor-pointer">Aristas ({graphData.edges.length})</summary>
                <div className="overflow-x-auto rounded-lg border mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origen</TableHead>
                        <TableHead>Relación</TableHead>
                        <TableHead>Destino</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {graphData.edges.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{e.source}</TableCell>
                          <TableCell><Badge className="bg-purple-100 text-purple-700 text-[10px]">{e.type}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{e.target}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
