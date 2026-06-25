'use client'

import { useEffect, useState } from 'react'
import {
  Warehouse, Plus, Pencil, Trash2, Search, RefreshCw,
  CircleDot, Radio, Tags, History, Truck, AlertTriangle,
  PackageOpen, FlaskConical, Wrench, Skull,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const API = '/api/deposito'

const TIPOS_ZONA = [
  { value: 'VACIOS', label: 'Vacíos', color: 'bg-slate-500' },
  { value: 'LLENOS', label: 'Llenos', color: 'bg-green-500' },
  { value: 'SALIDA_REPARTO', label: 'Salida a Reparto', color: 'bg-blue-500' },
  { value: 'ENVIO_CARGA', label: 'Envío a Carga', color: 'bg-amber-500' },
  { value: 'RECEPCION_CARGA', label: 'Recepción de Carga', color: 'bg-cyan-500' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento', color: 'bg-orange-500' },
  { value: 'BAJA', label: 'Baja', color: 'bg-red-500' },
]

const TIPOS_LECTOR = ['ESP32', 'RPI', 'GATEWAY']

const ICONOS_ESTADO: Record<string, any> = {
  LLENO_DISPONIBLE: PackageOpen,
  VACIO_DEPOSITO: FlaskConical,
  EN_REPARTO: Truck,
  ENVIADO_A_CARGA: AlertTriangle,
  MANTENIMIENTO: Wrench,
  BAJA: Skull,
}

export default function DepositoTab() {
  const [stock, setStock] = useState<any[]>([])
  const [zonas, setZonas] = useState<any[]>([])
  const [lectores, setLectores] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTag, setSearchTag] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [s, z, l, e, t] = await Promise.all([
        fetch(`${API}/stock`).then(r => r.json()),
        fetch(`${API}/zonas`).then(r => r.json()),
        fetch(`${API}/lectores`).then(r => r.json()),
        fetch(`${API}/eventos`).then(r => r.json()),
        fetch(`${API}/tags`).then(r => r.json()),
      ])
      setStock(s.stock || [])
      setZonas(z)
      setLectores(l)
      setEventos(e)
      setTags(t)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const totales = {
    llenos: stock.reduce((s: number, g: any) => s + g.llenos, 0),
    vacios: stock.reduce((s: number, g: any) => s + g.vacios, 0),
    enReparto: stock.reduce((s: number, g: any) => s + g.enReparto, 0),
    enCarga: stock.reduce((s: number, g: any) => s + g.enCarga, 0),
    mantenimiento: stock.reduce((s: number, g: any) => s + g.mantenimiento, 0),
    baja: stock.reduce((s: number, g: any) => s + g.baja, 0),
  }

  const cards = [
    { label: 'Llenos', value: totales.llenos, icon: PackageOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Vacíos', value: totales.vacios, icon: FlaskConical, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'En Reparto', value: totales.enReparto, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'En Carga', value: totales.enCarga, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Mantenimiento', value: totales.mantenimiento, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Baja', value: totales.baja, icon: Skull, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold">Depósito — Control RFID</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto gap-1 mb-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-1"><Warehouse className="w-4 h-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="zonas" className="flex items-center gap-1"><Radio className="w-4 h-4" />Zonas</TabsTrigger>
          <TabsTrigger value="lectores" className="flex items-center gap-1"><CircleDot className="w-4 h-4" />Lectores</TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-1"><Tags className="w-4 h-4" />Tags RFID</TabsTrigger>
          <TabsTrigger value="eventos" className="flex items-center gap-1"><History className="w-4 h-4" />Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {cards.map(c => {
              const Icon = c.icon
              return (
                <Card key={c.label} className={c.bg}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${c.color}`} />
                      <span className="text-2xl font-bold">{c.value}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{c.label}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Stock por Tipo de Gas</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-4">Gas</th>
                    <th className="py-2 pr-4 text-right">Llenos</th>
                    <th className="py-2 pr-4 text-right">Vacíos</th>
                    <th className="py-2 pr-4 text-right">Reparto</th>
                    <th className="py-2 pr-4 text-right">Carga</th>
                    <th className="py-2 pr-4 text-right">Mant.</th>
                    <th className="py-2 pr-4 text-right">Baja</th>
                    <th className="py-2 text-right">Total</th>
                  </tr></thead>
                  <tbody>
                    {stock.map((g: any) => (
                      <tr key={g.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium">
                          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: g.gas.colorHex }} />
                          {g.gas.codigo} — {g.gas.nombre}
                        </td>
                        <td className="py-2 pr-4 text-right">{g.llenos}</td>
                        <td className="py-2 pr-4 text-right">{g.vacios}</td>
                        <td className="py-2 pr-4 text-right">{g.enReparto}</td>
                        <td className="py-2 pr-4 text-right">{g.enCarga}</td>
                        <td className="py-2 pr-4 text-right">{g.mantenimiento}</td>
                        <td className="py-2 pr-4 text-right">{g.baja}</td>
                        <td className="py-2 text-right font-bold">{g.llenos + g.vacios + g.enReparto + g.enCarga + g.mantenimiento + g.baja}</td>
                      </tr>
                    ))}
                    {stock.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-slate-400">Sin datos de stock</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zonas">
          <ZonasPanel zonas={zonas} onUpdate={fetchData} />
        </TabsContent>

        <TabsContent value="lectores">
          <LectoresPanel lectores={lectores} zonas={zonas} onUpdate={fetchData} />
        </TabsContent>

        <TabsContent value="tags">
          <TagsPanel tags={tags} search={searchTag} onSearch={setSearchTag} onUpdate={fetchData} />
        </TabsContent>

        <TabsContent value="eventos">
          <EventosPanel eventos={eventos} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ZonasPanel({ zonas, onUpdate }: { zonas: any[], onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<any | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', descripcion: '', tipo: 'VACIOS' })

  const resetForm = () => setForm({ codigo: '', nombre: '', descripcion: '', tipo: 'VACIOS' })

  const handleSave = async () => {
    const url = edit ? `${API}/zonas/${edit.id}` : `${API}/zonas`
    const method = edit ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setOpen(false)
    setEdit(null)
    resetForm()
    onUpdate()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta zona?')) return
    await fetch(`${API}/zonas/${id}`, { method: 'DELETE' })
    onUpdate()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{zonas.length} zonas configuradas</p>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEdit(null); resetForm() }}}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nueva Zona</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? 'Editar Zona' : 'Nueva Zona de Lectura'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} /></div>
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ZONA.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descripción</Label><Textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full">{edit ? 'Guardar Cambios' : 'Crear Zona'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3">
        {zonas.map(z => {
          const tipoInfo = TIPOS_ZONA.find(t => t.value === z.tipo)
          return (
            <Card key={z.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${tipoInfo?.color || 'bg-slate-400'}`} />
                  <div>
                    <p className="font-medium text-sm">{z.nombre} <span className="text-xs text-slate-400">({z.codigo})</span></p>
                    <p className="text-xs text-slate-500">{tipoInfo?.label} · {(z as any)._count?.lectores || 0} lectores · {(z as any)._count?.eventos || 0} eventos</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(z); setForm({ codigo: z.codigo, nombre: z.nombre, descripcion: z.descripcion || '', tipo: z.tipo }); setOpen(true) }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(z.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {zonas.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Radio className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay zonas configuradas</p>
            <p className="text-xs mt-1">Crea zonas como Vacíos, Llenos, Salida a Reparto, etc.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LectoresPanel({ lectores, zonas, onUpdate }: { lectores: any[], zonas: any[], onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<any | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: 'ESP32', ip: '', zonaLecturaId: '' })

  const resetForm = () => setForm({ codigo: '', nombre: '', tipo: 'ESP32', ip: '', zonaLecturaId: zonas[0]?.id || '' })

  const handleSave = async () => {
    const url = edit ? `${API}/lectores/${edit.id}` : `${API}/lectores`
    const method = edit ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setOpen(false)
    setEdit(null)
    resetForm()
    onUpdate()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este lector?')) return
    await fetch(`${API}/lectores/${id}`, { method: 'DELETE' })
    onUpdate()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{lectores.length} lectores registrados</p>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEdit(null); resetForm() }}}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nuevo Lector</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? 'Editar Lector' : 'Nuevo Lector IoT'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} /></div>
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_LECTOR.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>IP (opcional)</Label><Input value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} /></div>
              <div><Label>Zona</Label>
                <Select value={form.zonaLecturaId} onValueChange={v => setForm(f => ({ ...f, zonaLecturaId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{zonas.map(z => <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{edit ? 'Guardar' : 'Crear Lector'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3">
        {lectores.map(l => (
          <Card key={l.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <CircleDot className={`w-5 h-5 ${l.activo ? 'text-green-500' : 'text-slate-300'}`} />
                <div>
                  <p className="font-medium text-sm">{l.nombre} <span className="text-xs text-slate-400">({l.codigo})</span></p>
                  <p className="text-xs text-slate-500">{l.tipo}{l.ip ? ` · ${l.ip}` : ''} · Zona: {l.zona?.nombre || '-'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEdit(l); setForm({ codigo: l.codigo, nombre: l.nombre, tipo: l.tipo, ip: l.ip || '', zonaLecturaId: l.zonaLecturaId }); setOpen(true) }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {lectores.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <CircleDot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay lectores registrados</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TagsPanel({ tags, search, onSearch, onUpdate }: { tags: any[], search: string, onSearch: (s: string) => void, onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ tid: '', cylinderId: '' })
  const [cylinders, setCylinders] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/cylinders').then(r => r.json()).then(setCylinders).catch(() => {})
  }, [])

  const handleAsociar = async () => {
    if (!form.tid || !form.cylinderId) return
    await fetch(`${API}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'asociar', tid: form.tid.trim(), cylinderId: form.cylinderId }),
    })
    setOpen(false)
    setForm({ tid: '', cylinderId: '' })
    onUpdate()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este tag RFID?')) return
    await fetch(`${API}/tags/${id}`, { method: 'DELETE' })
    onUpdate()
  }

  const filtered = tags.filter(t =>
    t.tid.toLowerCase().includes(search.toLowerCase()) ||
    t.cylinder?.numeroSerie?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar por TID o serie..." value={search} onChange={e => onSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm({ tid: '', cylinderId: '' }) }}>
          <DialogTrigger asChild>
            <Button size="sm"><Tags className="w-4 h-4 mr-1" />Asociar Tag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Asociar Tag RFID a Cilindro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>TID del Tag RFID</Label>
                <Input value={form.tid} onChange={e => setForm(f => ({ ...f, tid: e.target.value }))} placeholder="E.g. E280689520004002" />
              </div>
              <div><Label>Cilindro</Label>
                <Select value={form.cylinderId} onValueChange={v => setForm(f => ({ ...f, cylinderId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cilindro..." /></SelectTrigger>
                  <SelectContent>
                    {cylinders.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numeroSerie} — {c.gas?.codigo || '-'} ({c.estado})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAsociar} className="w-full">Asociar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        {filtered.map(t => (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <Tags className="w-4 h-4 text-blue-500" />
                <div>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{t.tid}</code>
                  <span className="text-xs text-slate-400 ml-2">
                    {t.cylinder ? `→ ${t.cylinder.numeroSerie} (${t.cylinder.gas?.codigo || '-'})` : 'Sin asociar'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.activo ? <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">Activo</Badge> :
                  <Badge variant="outline" className="text-slate-400 text-[10px]">Inactivo</Badge>}
                {t.fechaAsociacion && <span className="text-[10px] text-slate-400">{new Date(t.fechaAsociacion).toLocaleDateString()}</span>}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400"><Tags className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No hay tags RFID</p></div>}
      </div>
    </div>
  )
}

function EventosPanel({ eventos }: { eventos: any[] }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Últimos {eventos.length} eventos RFID</p>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {eventos.map(e => (
          <Card key={e.id}>
            <CardContent className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${e.origen === 'AUTOMATICO' ? 'bg-green-400' : 'bg-amber-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-mono truncate">{e.tid}</p>
                  <p className="text-xs text-slate-500">
                    {e.zona?.nombre || '-'} · {e.lector?.nombre || '-'}
                    {e.estadoAnterior && ` · ${e.estadoAnterior} → ${e.estadoNuevo || '-'}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-400">{new Date(e.timestamp).toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px]">{e.origen}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {eventos.length === 0 && <div className="text-center py-12 text-slate-400"><History className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No hay eventos registrados</p></div>}
      </div>
    </div>
  )
}
