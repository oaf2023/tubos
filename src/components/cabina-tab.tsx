'use client'

import { useEffect, useState } from 'react'
import {
  ScanLine, Plus, Pencil, Trash2, RefreshCw, Camera, Weight,
  AlertTriangle, CheckCircle, XCircle, Scale, FileImage,
  ListTodo, Gauge, Cpu,
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

const API_CABINA = '/api/cabina'
const DIAGNOSTICOS: Record<string, { label: string, color: string }> = {
  OK: { label: 'OK', color: 'text-green-600 bg-green-50 border-green-200' },
  INCONSISTENCIA: { label: 'Inconsistencia', color: 'text-red-600 bg-red-50 border-red-200' },
  NO_REGISTRADO: { label: 'No Registrado', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  SOSPECHOSO: { label: 'Sospechoso', color: 'text-orange-600 bg-orange-50 border-orange-200' },
}

export default function CabinaTab() {
  const [cabinas, setCabinas] = useState<any[]>([])
  const [validaciones, setValidaciones] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [reglas, setReglas] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [sensores, setSensores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [c, v, a, r, e, s] = await Promise.all([
        fetch(API_CABINA).then(r => r.json()),
        fetch(`${API_CABINA}/validacion`).then(r => r.json()),
        fetch(`${API_CABINA}/alertas`).then(r => r.json()),
        fetch(`${API_CABINA}/reglas-peso`).then(r => r.json()),
        fetch(`${API_CABINA}/eventos-trazabilidad`).then(r => r.json()),
        fetch(`${API_CABINA}/sensores`).then(r => r.json()),
      ])
      setCabinas(c)
      setValidaciones(v)
      setAlertas(a)
      setReglas(r)
      setEventos(e)
      setSensores(s)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const alertasActivas = alertas.filter((a: any) => !a.resuelta)
  const stats = {
    totalValidaciones: validaciones.length,
    ok: validaciones.filter((v: any) => v.diagnostico === 'OK').length,
    inconsistencias: validaciones.filter((v: any) => v.diagnostico === 'INCONSISTENCIA').length,
    noRegistrados: validaciones.filter((v: any) => v.diagnostico === 'NO_REGISTRADO').length,
  }

  const statCards = [
    { label: 'Validaciones', value: stats.totalValidaciones, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'OK', value: stats.ok, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Inconsistencias', value: stats.inconsistencias, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'No Registrados', value: stats.noRegistrados, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold">Cabina Inteligente — Control Físico</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {alertasActivas.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700"><strong>{alertasActivas.length} alerta(s) activa(s)</strong> — Revisar pestaña Alertas</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto gap-1 mb-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-1"><Gauge className="w-4 h-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="cabinas" className="flex items-center gap-1"><ScanLine className="w-4 h-4" />Cabinas</TabsTrigger>
          <TabsTrigger value="validacion" className="flex items-center gap-1"><ListTodo className="w-4 h-4" />Validaciones</TabsTrigger>
          <TabsTrigger value="reglas" className="flex items-center gap-1"><Scale className="w-4 h-4" />Reglas de Peso</TabsTrigger>
          <TabsTrigger value="alertas" className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Alertas</TabsTrigger>
          <TabsTrigger value="sensores" className="flex items-center gap-1"><Cpu className="w-4 h-4" />Sensores</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCards.map(c => {
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

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Últimas Validaciones</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {validaciones.slice(0, 10).map(v => {
                  const d = DIAGNOSTICOS[v.diagnostico] || { label: v.diagnostico, color: 'text-slate-600' }
                  return (
                    <Card key={v.id} className={`border ${d.color}`}>
                      <CardContent className="py-2 text-sm flex items-center justify-between">
                        <div>
                          <span className="font-medium">{v.cylinder?.numeroSerie || '—'}</span>
                          <span className="text-slate-400 text-xs ml-2">{v.cylinder?.gas?.codigo || ''}</span>
                        </div>
                        <Badge variant="outline" className={d.color}>{d.label}</Badge>
                      </CardContent>
                    </Card>
                  )
                })}
                {validaciones.length === 0 && <p className="text-center text-slate-400 py-8">Sin validaciones aún</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Alertas Recientes</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {alertas.slice(0, 10).map(a => (
                  <Card key={a.id} className={`border ${a.nivel === 'CRITICAL' ? 'border-red-200 bg-red-50' : a.nivel === 'WARNING' ? 'border-amber-200 bg-amber-50' : ''}`}>
                    <CardContent className="py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{a.tipo.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className={`text-[10px] ${a.nivel === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>{a.nivel}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{a.mensaje}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(a.fecha).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))}
                {alertas.length === 0 && <p className="text-center text-slate-400 py-8">Sin alertas</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cabinas">
          <CabinasPanel cabinas={cabinas} sensores={sensores} onUpdate={fetchData} />
        </TabsContent>

        <TabsContent value="validacion">
          <ValidacionesPanel validaciones={validaciones} />
        </TabsContent>

        <TabsContent value="reglas">
          <ReglasPanel reglas={reglas} onUpdate={fetchData} />
        </TabsContent>

        <TabsContent value="alertas">
          <AlertasPanel alertas={alertas} />
        </TabsContent>

        <TabsContent value="sensores">
          <SensoresPanel sensores={sensores} cabinas={cabinas} onUpdate={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CabinasPanel({ cabinas, sensores, onUpdate }: { cabinas: any[], sensores: any[], onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<any | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', ubicacion: '' })

  const resetForm = () => setForm({ codigo: '', nombre: '', ubicacion: '' })

  const handleSave = async () => {
    const url = edit ? `${API_CABINA}/${edit.id}` : API_CABINA
    const method = edit ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setOpen(false)
    setEdit(null)
    resetForm()
    onUpdate()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{cabinas.length} cabina(s)</p>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEdit(null); resetForm() }}}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nueva Cabina</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? 'Editar Cabina' : 'Nueva Cabina de Control'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} /></div>
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
              <div><Label>Ubicación</Label><Input value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full">{edit ? 'Guardar' : 'Crear Cabina'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3">
        {cabinas.map(c => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <ScanLine className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium">{c.nombre} <span className="text-xs text-slate-400">({c.codigo})</span></p>
                  <p className="text-xs text-slate-500">{c.ubicacion || 'Sin ubicación'} · {(c as any)._count?.sensores || 0} sensores · {(c as any)._count?.validaciones || 0} validaciones</p>
                </div>
              </div>
              <Badge variant="outline" className={c.activo ? 'text-green-600' : 'text-slate-400'}>
                {c.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {cabinas.length === 0 && <div className="text-center py-12 text-slate-400"><ScanLine className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No hay cabinas configuradas</p></div>}
      </div>
    </div>
  )
}

function ValidacionesPanel({ validaciones }: { validaciones: any[] }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Últimas {validaciones.length} validaciones</p>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {validaciones.map(v => {
          const d = DIAGNOSTICOS[v.diagnostico] || { label: v.diagnostico, color: 'text-slate-600' }
          return (
            <Card key={v.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{v.cylinder?.numeroSerie || '—'}</span>
                    <Badge variant="outline" className={d.color}>{d.label}</Badge>
                    {v.alertaGenerada && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-slate-500 mt-2">
                  <div><span className="text-slate-400">Peso real:</span> {v.pesoRealKg ?? '—'} kg</div>
                  <div><span className="text-slate-400">Peso esperado:</span> {v.pesoEsperadoKg ?? '—'} kg</div>
                  <div><span className="text-slate-400">Estado final:</span> {v.estadoFinal || '—'}</div>
                </div>
                {v.evidenciaFoto && (
                  <div className="mt-2">
                    <img src={v.evidenciaFoto.imagen} alt="Evidencia" className="h-20 rounded border" />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {validaciones.length === 0 && <div className="text-center py-12 text-slate-400"><ListTodo className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Sin validaciones aún</p></div>}
      </div>
    </div>
  )
}

function ReglasPanel({ reglas, onUpdate }: { reglas: any[], onUpdate: () => void }) {
  const [gases, setGases] = useState<any[]>([])
  const [form, setForm] = useState({ gasId: '', pesoMinKg: '', pesoMaxKg: '', pesoTaraKg: '', pesoLlenoKg: '' })

  useEffect(() => {
    fetch('/api/gases').then(r => r.json()).then(setGases).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!form.gasId) return
    await fetch(`${API_CABINA}/reglas-peso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gasId: form.gasId,
        pesoMinKg: form.pesoMinKg ? parseFloat(form.pesoMinKg) : null,
        pesoMaxKg: form.pesoMaxKg ? parseFloat(form.pesoMaxKg) : null,
        pesoTaraKg: form.pesoTaraKg ? parseFloat(form.pesoTaraKg) : null,
        pesoLlenoKg: form.pesoLlenoKg ? parseFloat(form.pesoLlenoKg) : null,
      }),
    })
    setForm({ gasId: '', pesoMinKg: '', pesoMaxKg: '', pesoTaraKg: '', pesoLlenoKg: '' })
    onUpdate()
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Reglas de Peso por Gas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {reglas.map(r => (
            <Card key={r.id} className="bg-slate-50">
              <CardContent className="py-2.5 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: r.gas.colorHex }} />
                  <span className="font-medium">{r.gas.codigo} — {r.gas.nombre}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Tara: {r.pesoTaraKg ?? '—'} kg</span>
                  <span>Lleno: {r.pesoLlenoKg ?? '—'} kg</span>
                  <span>Mín: {r.pesoMinKg ?? '—'} kg</span>
                  <span>Máx: {r.pesoMaxKg ?? '—'} kg</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {reglas.length === 0 && <p className="text-center text-slate-400 py-6">Sin reglas de peso configuradas</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Agregar / Editar Regla</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Gas</Label>
            <Select value={form.gasId} onValueChange={v => setForm(f => ({ ...f, gasId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar gas..." /></SelectTrigger>
              <SelectContent>
                {gases.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.codigo} — {g.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Peso Tara (kg)</Label><Input type="number" value={form.pesoTaraKg} onChange={e => setForm(f => ({ ...f, pesoTaraKg: e.target.value }))} /></div>
            <div><Label>Peso Lleno (kg)</Label><Input type="number" value={form.pesoLlenoKg} onChange={e => setForm(f => ({ ...f, pesoLlenoKg: e.target.value }))} /></div>
            <div><Label>Peso Mín (kg)</Label><Input type="number" value={form.pesoMinKg} onChange={e => setForm(f => ({ ...f, pesoMinKg: e.target.value }))} /></div>
            <div><Label>Peso Máx (kg)</Label><Input type="number" value={form.pesoMaxKg} onChange={e => setForm(f => ({ ...f, pesoMaxKg: e.target.value }))} /></div>
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!form.gasId}>Guardar Regla</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AlertasPanel({ alertas }: { alertas: any[] }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        {alertas.filter(a => !a.resuelta).length} activas · {alertas.length} totales
      </p>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {alertas.map(a => (
          <Card key={a.id} className={`border ${a.nivel === 'CRITICAL' ? 'border-red-200' : a.nivel === 'WARNING' ? 'border-amber-200' : ''}`}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${a.nivel === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className="font-medium text-sm">{a.tipo.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className={`text-[10px] ${a.nivel === 'CRITICAL' ? 'text-red-600 border-red-300' : 'text-amber-600 border-amber-300'}`}>{a.nivel}</Badge>
                  {a.resuelta && <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">Resuelta</Badge>}
                </div>
                <span className="text-[10px] text-slate-400">{new Date(a.fecha).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{a.mensaje}</p>
              <div className="text-xs text-slate-400 mt-1">
                {a.cabina && `Cabina: ${a.cabina.nombre}`}
                {a.cylinder && ` · Cilindro: ${a.cylinder.numeroSerie}`}
              </div>
            </CardContent>
          </Card>
        ))}
        {alertas.length === 0 && <div className="text-center py-12 text-slate-400"><AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Sin alertas</p></div>}
      </div>
    </div>
  )
}

function SensoresPanel({ sensores, cabinas, onUpdate }: { sensores: any[], cabinas: any[], onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ cabinaId: '', tipo: 'RFID', codigo: '', activo: true })

  const handleSave = async () => {
    if (!form.cabinaId || !form.codigo) return
    await fetch(`${API_CABINA}/sensores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    setForm({ cabinaId: '', tipo: 'RFID', codigo: '', activo: true })
    onUpdate()
  }

  const TIPOS_SENSOR = ['RFID', 'BALANZA', 'CAMARA', 'UPS']

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{sensores.length} sensores</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nuevo Sensor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Sensor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Cabina</Label>
                <Select value={form.cabinaId} onValueChange={v => setForm(f => ({ ...f, cabinaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cabina..." /></SelectTrigger>
                  <SelectContent>{cabinas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_SENSOR.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full">Crear Sensor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3">
        {sensores.map(s => {
          const Icon = s.tipo === 'RFID' ? ScanLine : s.tipo === 'BALANZA' ? Weight : s.tipo === 'CAMARA' ? Camera : Cpu
          return (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium">{s.codigo} <span className="text-xs text-slate-400">({s.tipo})</span></p>
                    <p className="text-xs text-slate-500">Cabina: {s.cabina?.nombre || '-'}</p>
                  </div>
                </div>
                <Badge variant="outline" className={s.activo ? 'text-green-600' : 'text-slate-400'}>{s.activo ? 'Activo' : 'Inactivo'}</Badge>
              </CardContent>
            </Card>
          )
        })}
        {sensores.length === 0 && <div className="text-center py-12 text-slate-400"><Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No hay sensores configurados</p></div>}
      </div>
    </div>
  )
}
