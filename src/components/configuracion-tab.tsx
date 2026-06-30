'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Bell,
  DollarSign,
  Building2,
  Settings2,
  Save,
  MapPin,
  Map as MapIcon,
  FileText,
  ClipboardList,
  Search,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Gas } from '@/lib/tab-types'
import { SgaBadge, formatDate } from '@/lib/tab-constants'

interface AlertConfigData {
  id: string
  gasId: string
  gas: Gas
  diasAlertaRetest: number
  diasMaxCliente: number
  alertaPH: boolean
  activo: boolean
}

function ConfiguracionTab() {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<AlertConfigData[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Record<string, { diasAlertaRetest: string; diasMaxCliente: string; alertaPH: boolean; activo: boolean }>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/config-alertas')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setConfigs(list)
      const ed: Record<string, { diasAlertaRetest: string; diasMaxCliente: string; alertaPH: boolean; activo: boolean }> = {}
      for (const c of list) {
        ed[c.gasId] = {
          diasAlertaRetest: String(c.diasAlertaRetest),
          diasMaxCliente: String(c.diasMaxCliente),
          alertaPH: c.alertaPH,
          activo: c.activo,
        }
      }
      setEditando(ed)
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la configuración', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  async function guardar(config: AlertConfigData) {
    const vals = editando[config.gasId]
    if (!vals) return
    try {
      const res = await fetch('/api/config-alertas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gasId: config.gasId,
          diasAlertaRetest: vals.diasAlertaRetest,
          diasMaxCliente: vals.diasMaxCliente,
          alertaPH: vals.alertaPH,
          activo: vals.activo,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Guardado', description: `Configuración de ${config.gas.nombre} actualizada` })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <Tabs defaultValue="alertas" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="alertas" className="flex items-center gap-1.5">
          <Bell className="w-4 h-4" /><span>Alertas por Gas</span>
        </TabsTrigger>
        <TabsTrigger value="precios" className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4" /><span>Precios de Gases</span>
        </TabsTrigger>
        <TabsTrigger value="empresa" className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4" /><span>Datos de la Empresa</span>
        </TabsTrigger>
        <TabsTrigger value="auditoria" className="flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4" /><span>Bitácora</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="alertas">
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-orange-500" />
            Configuración de Alertas por Gas
          </CardTitle>
          <CardDescription>
            Defina los umbrales de alerta para cada tipo de gas. Las alertas se mostrarán en el Dashboard principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gas</TableHead>
                  <TableHead className="text-center">Alertas activas</TableHead>
                  <TableHead className="text-center">Días antes del retest</TableHead>
                  <TableHead className="text-center">Días máx. cliente</TableHead>
                  <TableHead className="text-center">Alerta PH</TableHead>
                  <TableHead className="text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((cfg) => {
                  const vals = editando[cfg.gasId]
                  if (!vals) return null
                  return (
                    <TableRow key={cfg.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: cfg.gas.colorHex }} />
                          <span className="font-medium text-sm">{cfg.gas.nombre}</span>
                          <span className="text-xs text-slate-400">({cfg.gas.codigo})</span>
                          <SgaBadge peligro={cfg.gas.peligro} />
                        </div>
                      </td>
                      <td className="text-center">
                        <Select value={vals.activo ? 'true' : 'false'} onValueChange={(v) => setEditando({ ...editando, [cfg.gasId]: { ...vals, activo: v === 'true' } })}>
                          <SelectTrigger className="w-24 mx-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sí</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="text-center">
                        <Input
                          type="number"
                          className="w-20 text-center mx-auto"
                          value={vals.diasAlertaRetest}
                          onChange={(e) => setEditando({ ...editando, [cfg.gasId]: { ...vals, diasAlertaRetest: e.target.value } })}
                        />
                      </td>
                      <td className="text-center">
                        <Input
                          type="number"
                          className="w-20 text-center mx-auto"
                          value={vals.diasMaxCliente}
                          onChange={(e) => setEditando({ ...editando, [cfg.gasId]: { ...vals, diasMaxCliente: e.target.value } })}
                        />
                      </td>
                      <td className="text-center">
                        <Select value={vals.alertaPH ? 'true' : 'false'} onValueChange={(v) => setEditando({ ...editando, [cfg.gasId]: { ...vals, alertaPH: v === 'true' } })}>
                          <SelectTrigger className="w-24 mx-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sí</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="text-center">
                        <Button size="sm" onClick={() => guardar(cfg)} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
                          <Save className="w-3 h-3 mr-1" /> Guardar
                        </Button>
                      </td>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Vista previa de alertas actuales
          </CardTitle>
          <CardDescription>
            Resumen de alertas activas según la configuración actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No hay configuraciones</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {configs.filter((c) => c.activo).map((cfg) => (
                <div key={cfg.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                  <span className="w-3 h-3 rounded-full" style={{ background: cfg.gas.colorHex }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{cfg.gas.nombre}</span>
                      <SgaBadge peligro={cfg.gas.peligro} />
                    </div>
                    <div className="text-xs text-slate-500">
                      Alerta retest: {cfg.diasAlertaRetest}d · Cliente máx: {cfg.diasMaxCliente}d
                    </div>
                  </div>
                  <Badge className={cfg.alertaPH ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                    PH {cfg.alertaPH ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </TabsContent>

      <TabsContent value="precios">
        <GasPricingForm />
      </TabsContent>

      <TabsContent value="empresa">
        <ConfigEmpresaForm />
      </TabsContent>

      <TabsContent value="auditoria">
        <AuditoriaView />
      </TabsContent>
    </Tabs>
  )
}

function GasPricingForm() {
  const { toast } = useToast()
  const [gases, setGases] = useState<Gas[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Record<string, { diario: string; mensual: string; venta: string }>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/gases')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setGases(list)
      const ed: Record<string, { diario: string; mensual: string; venta: string }> = {}
      for (const g of list) {
        ed[g.id] = {
          diario: g.precioAlquilerDiario?.toString() || '',
          mensual: g.precioAlquilerMensual?.toString() || '',
          venta: g.precioVenta?.toString() || '',
        }
      }
      setEditando(ed)
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los gases', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  async function guardar(gasId: string) {
    const vals = editando[gasId]
    if (!vals) return
    try {
      const res = await fetch(`/api/gases/${gasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precioAlquilerDiario: vals.diario,
          precioAlquilerMensual: vals.mensual,
          precioVenta: vals.venta,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Guardado', description: 'Precios actualizados correctamente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar los precios', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            Precios de Alquiler y Venta de Gases
          </CardTitle>
          <CardDescription>
            Configure las tarifas de alquiler diario, mensual y precio de venta de gas para cada tipo.
            Estos precios se usan al calcular automáticamente los conceptos de una factura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gas</TableHead>
                  <TableHead className="text-right">Alquiler diario ($)</TableHead>
                  <TableHead className="text-right">Alquiler mensual ($)</TableHead>
                  <TableHead className="text-right">Precio venta gas ($)</TableHead>
                  <TableHead className="text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {gases.map((g) => {
                  const vals = editando[g.id]
                  if (!vals) return null
                  return (
                    <TableRow key={g.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: g.colorHex }} />
                          <span className="font-medium text-sm">{g.nombre}</span>
                          <span className="text-xs text-slate-400">({g.codigo})</span>
                        </div>
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 text-right ml-auto"
                          value={vals.diario}
                          onChange={(e) => setEditando({ ...editando, [g.id]: { ...vals, diario: e.target.value } })}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 text-right ml-auto"
                          value={vals.mensual}
                          onChange={(e) => setEditando({ ...editando, [g.id]: { ...vals, mensual: e.target.value } })}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 text-right ml-auto"
                          value={vals.venta}
                          onChange={(e) => setEditando({ ...editando, [g.id]: { ...vals, venta: e.target.value } })}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="text-center">
                        <Button size="sm" onClick={() => guardar(g.id)} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
                          <Save className="w-3 h-3 mr-1" /> Guardar
                        </Button>
                      </td>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ConfigEmpresaForm() {
  const { toast } = useToast()
  const [form, setForm] = useState({
    company: { name: '', tagline: '', country: '', locale: '' },
    base: { name: '', province: '', lat: '', lng: '', tipo: '', address: '', phone: '' },
    map: { defaultCenterLat: '', defaultCenterLng: '', defaultZoom: '' },
    meta: { title: '', description: '', keywords: '', author: '' },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/config-empresa')
        const data = await res.json()
        setForm({
          company: { name: data.company?.name || '', tagline: data.company?.tagline || '', country: data.company?.country || '', locale: data.company?.locale || '' },
          base: { name: data.base?.name || '', province: data.base?.province || '', lat: String(data.base?.lat ?? ''), lng: String(data.base?.lng ?? ''), tipo: data.base?.tipo || '', address: data.base?.address || '', phone: data.base?.phone || '' },
          map: { defaultCenterLat: String(data.map?.defaultCenter?.[0] ?? ''), defaultCenterLng: String(data.map?.defaultCenter?.[1] ?? ''), defaultZoom: String(data.map?.defaultZoom ?? '') },
          meta: { title: data.meta?.title || '', description: data.meta?.description || '', keywords: Array.isArray(data.meta?.keywords) ? data.meta.keywords.join(', ') : (data.meta?.keywords || ''), author: data.meta?.author || '' },
        })
      } catch { /* use defaults */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    try {
      const body = {
        company: form.company,
        base: { ...form.base, lat: parseFloat(form.base.lat) || 0, lng: parseFloat(form.base.lng) || 0 },
        map: { defaultCenter: [parseFloat(form.map.defaultCenterLat) || 0, parseFloat(form.map.defaultCenterLng) || 0], defaultZoom: parseInt(form.map.defaultZoom) || 6 },
        meta: { ...form.meta, keywords: form.meta.keywords.split(',').map(s => s.trim()).filter(Boolean) },
      }
      const res = await fetch('/api/config-empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Configuración guardada', description: 'Los datos de la empresa se actualizaron correctamente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' })
    }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-500" />
            Datos de la Empresa
          </CardTitle>
          <CardDescription>Información corporativa que se muestra en la aplicación. Los cambios se guardan en <code>config.json</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Compañía</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Nombre</Label><Input value={form.company.name} onChange={e => setForm(f => ({ ...f, company: { ...f.company, name: e.target.value } }))} /></div>
              <div><Label>Tagline / Lema</Label><Input value={form.company.tagline} onChange={e => setForm(f => ({ ...f, company: { ...f.company, tagline: e.target.value } }))} /></div>
              <div><Label>País</Label><Input value={form.company.country} onChange={e => setForm(f => ({ ...f, company: { ...f.company, country: e.target.value } }))} /></div>
              <div><Label>Locale</Label><Input value={form.company.locale} onChange={e => setForm(f => ({ ...f, company: { ...f.company, locale: e.target.value } }))} /></div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Base Operativa</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Nombre</Label><Input value={form.base.name} onChange={e => setForm(f => ({ ...f, base: { ...f.base, name: e.target.value } }))} /></div>
              <div><Label>Provincia</Label><Input value={form.base.province} onChange={e => setForm(f => ({ ...f, base: { ...f.base, province: e.target.value } }))} /></div>
              <div><Label>Tipo</Label><Input value={form.base.tipo} onChange={e => setForm(f => ({ ...f, base: { ...f.base, tipo: e.target.value } }))} /></div>
              <div><Label>Latitud</Label><Input type="number" step="any" value={form.base.lat} onChange={e => setForm(f => ({ ...f, base: { ...f.base, lat: e.target.value } }))} /></div>
              <div><Label>Longitud</Label><Input type="number" step="any" value={form.base.lng} onChange={e => setForm(f => ({ ...f, base: { ...f.base, lng: e.target.value } }))} /></div>
              <div><Label>Teléfono</Label><Input value={form.base.phone} onChange={e => setForm(f => ({ ...f, base: { ...f.base, phone: e.target.value } }))} /></div>
              <div className="sm:col-span-3"><Label>Dirección</Label><Input value={form.base.address} onChange={e => setForm(f => ({ ...f, base: { ...f.base, address: e.target.value } }))} /></div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><MapIcon className="w-3.5 h-3.5" /> Mapa</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Centro Lat</Label><Input type="number" step="any" value={form.map.defaultCenterLat} onChange={e => setForm(f => ({ ...f, map: { ...f.map, defaultCenterLat: e.target.value } }))} /></div>
              <div><Label>Centro Lng</Label><Input type="number" step="any" value={form.map.defaultCenterLng} onChange={e => setForm(f => ({ ...f, map: { ...f.map, defaultCenterLng: e.target.value } }))} /></div>
              <div><Label>Zoom</Label><Input type="number" value={form.map.defaultZoom} onChange={e => setForm(f => ({ ...f, map: { ...f.map, defaultZoom: e.target.value } }))} /></div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Meta / SEO</h4>
            <div className="grid grid-cols-1 gap-3">
              <div><Label>Título</Label><Input value={form.meta.title} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, title: e.target.value } }))} /></div>
              <div><Label>Descripción</Label><Input value={form.meta.description} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, description: e.target.value } }))} /></div>
              <div><Label>Keywords (separadas por coma)</Label><Input value={form.meta.keywords} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, keywords: e.target.value } }))} /></div>
              <div><Label>Autor</Label><Input value={form.meta.author} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, author: e.target.value } }))} /></div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-orange-500 to-red-600 gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AuditoriaView() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtroAccion, setFiltroAccion] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroEntidad, setFiltroEntidad] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(pageSize))
      params.set('offset', String(page * pageSize))
      if (filtroAccion) params.set('accion', filtroAccion)
      if (filtroUsuario) params.set('usuario', filtroUsuario)
      if (filtroEntidad) params.set('entidad', filtroEntidad)
      const res = await fetch(`/api/audit?${params}`)
      const data = await res.json()
      setLogs(Array.isArray(data.logs) ? data.logs : [])
      setTotal(data.total || 0)
    } catch { setLogs([]) }
    finally { setLoading(false) }
  }, [filtroAccion, filtroUsuario, filtroEntidad, page])

  useEffect(() => { load() }, [load])

  const accionBadge = (accion: string) => {
    const colors: Record<string, string> = {
      LOGIN: 'bg-emerald-100 text-emerald-700',
      LOGOUT: 'bg-slate-100 text-slate-600',
      CREATE: 'bg-blue-100 text-blue-700',
      UPDATE: 'bg-amber-100 text-amber-700',
      DELETE: 'bg-red-100 text-red-700',
      CAMBIO_ESTADO: 'bg-violet-100 text-violet-700',
    }
    return <Badge className={`text-[10px] ${colors[accion] || 'bg-slate-100 text-slate-600'}`}>{accion}</Badge>
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-orange-500" />
            Bitácora del Sistema
          </CardTitle>
          <CardDescription>
            Historial de ingresos, egresos y acciones de auditoría ({total} registros)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              <select
                value={filtroAccion}
                onChange={(e) => { setFiltroAccion(e.target.value); setPage(0) }}
                className="text-xs border rounded px-2 py-1 bg-white"
              >
                <option value="">Todas las acciones</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="CAMBIO_ESTADO">CAMBIO_ESTADO</option>
              </select>
            </div>
            <Input
              placeholder="Filtrar por usuario..."
              value={filtroUsuario}
              onChange={(e) => { setFiltroUsuario(e.target.value); setPage(0) }}
              className="max-w-[180px] h-8 text-xs"
            />
            <Input
              placeholder="Filtrar por entidad..."
              value={filtroEntidad}
              onChange={(e) => { setFiltroEntidad(e.target.value); setPage(0) }}
              className="max-w-[180px] h-8 text-xs"
            />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setFiltroAccion(''); setFiltroUsuario(''); setFiltroEntidad(''); setPage(0) }}>
              <RefreshCw className="w-3 h-3 mr-1" />Limpiar
            </Button>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ClipboardList className="w-8 h-8 mx-auto mb-1 text-slate-300" />
              No hay registros de auditoría
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha/Hora</TableHead>
                    <TableHead className="text-xs">Acción</TableHead>
                    <TableHead className="text-xs">Usuario</TableHead>
                    <TableHead className="text-xs">Entidad</TableHead>
                    <TableHead className="text-xs">ID Entidad</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap font-mono">{formatDate(l.createdAt)}</TableCell>
                      <TableCell>{accionBadge(l.accion)}</TableCell>
                      <TableCell className="text-xs font-medium">{l.usuario || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{l.entidad}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">{l.entidadId ? l.entidadId.substring(0, 12) + '…' : '—'}</TableCell>
                      <TableCell className="text-xs text-slate-400">{l.direccionIp || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={l.detalle || ''}>{l.detalle || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Página {page + 1} de {totalPages} ({total} registros)</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ConfiguracionTab
