'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Plus, RefreshCw, Users, Building2, Contact, Package, History,
  Edit3, Trash2, Save, X, Hash, FlaskConical, Truck, FileText, DollarSign,
  Key, Phone, Mail, MapPin, Eye, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, CheckCircle, XCircle, AlertTriangle, Compass, Loader2,
  User, Briefcase, ShieldAlert, Calendar, Coins, Info, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Cliente, Cylinder } from '@/lib/tab-types'
import {
  TIPOLOGIAS, ESTADO_CUENTA_OPTS, formatDate, SgaBadge,
  ESTADO_COLORS, ESTADO_LABELS, daysUntil,
} from '@/lib/tab-constants'
import { geocodificarDireccion } from '@/lib/geocoding'
import StaticMap from '@/lib/static-map'

const ITEMS_PER_PAGE = 12
const ABECEDARIO = ['Todos', ...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')]

const ESTADO_CLIENTE_OPTS = ['ACTIVO', 'SUSPENDIDO', 'INACTIVO'] as const
const TIPO_DOC_OPTS = ['DNI', 'CUIT', 'CUIL', 'Pasaporte'] as const
const COND_IVA_OPTS = [
  'Responsable Inscripto', 'Monotributista', 'Consumidor Final',
  'Exento', 'Responsable No Inscripto', 'Sujeto No Categorizado',
  'Pequeño Contribuyente Social', 'Gran Contribuyente',
] as const
const MONOTRIBUTO_ACTIVIDAD_OPTS = ['Servicios', 'Comercio', 'Industria'] as const

// Color generator for avatar
function getAvatarColors(apellido: string) {
  const colors = [
    { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'bg-emerald-600' },
    { bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'bg-blue-600' },
    { bg: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'bg-purple-600' },
    { bg: 'bg-orange-100 text-orange-700 border-orange-200', icon: 'bg-orange-600' },
  ]
  return colors[(apellido || 'A').charCodeAt(0) % colors.length]
}

function initials(nombre: string, apellido: string | null) {
  return `${(apellido || '?')[0] || ''}${(nombre || '?')[0] || ''}`.toUpperCase()
}

function clientName(c: Cliente) {
  if (c.apellido) return `${c.apellido.toUpperCase()}, ${c.nombre}`
  return c.nombre
}

function formatDireccion(c: Cliente) {
  if (c.calle && c.altura) {
    const parts = [`${c.calle} ${c.altura}`]
    if (c.ciudad) parts.push(c.ciudad)
    return parts.join(', ')
  }
  if (c.ubicaciones) return c.ubicaciones
  return null
}

function hasCoords(c: Cliente) {
  return c.lat != null && c.lng != null
}

const ESTADO_CUENTA_COLORS: Record<string, string> = {
  AL_DIA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PENDIENTE: 'bg-amber-100 text-amber-700 border-amber-200',
  MOROSO: 'bg-red-100 text-red-700 border-red-200',
}
const ESTADO_CUENTA_LABELS: Record<string, string> = {
  AL_DIA: 'Al día', PENDIENTE: 'Pendiente', MOROSO: 'Moroso',
}

const TIPOS_GENERO = ['Masculino', 'Femenino', 'Otro / No especifica']

export default function ClientesTab() {
  const { toast } = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tipologiaFilter, setTipologiaFilter] = useState('all')
  const [alphabetFilter, setAlphabetFilter] = useState('Todos')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Detail modal
  const [detailCliente, setDetailCliente] = useState<Cliente | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Cylinders dialog
  const [viewCylindersCliente, setViewCylindersCliente] = useState<Cliente | null>(null)
  const [cylindersForCliente, setCylindersForCliente] = useState<Cylinder[]>([])
  const [loadingCylinders, setLoadingCylinders] = useState(false)

  // History dialog
  const [viewHistoryCliente, setViewHistoryCliente] = useState<Cliente | null>(null)
  const [historyData, setHistoryData] = useState<{ gas: string; mes: string; cantidad: number }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Acceso dialog
  const [viewAccesoCliente, setViewAccesoCliente] = useState<Cliente | null>(null)
  const [accesoData, setAccesoData] = useState<{ id: string; usuario: string; activo: boolean } | null>(null)
  const [accesoForm, setAccesoForm] = useState({ usuario: '', password: '', activo: true })
  const [loadingAcceso, setLoadingAcceso] = useState(false)

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [activeFormTab, setActiveFormTab] = useState<'basicos' | 'direccion' | 'comercial' | 'tecnico' | 'gestion'>('basicos')

  const emptyForm = {
    nombre: '', apellido: '', email: '', telefono: '', taxId: '', contacto: '',
    telefonoSecundario: '', fechaNacimiento: '', genero: 'Masculino',
    tipoDocumento: '', numeroDocumento: '',
    calle: '', altura: '', piso: '', codigoPostal: '', ciudad: '', provincia: '', pais: 'Argentina',
    empresa: '', rubro: '', condicionIva: 'Consumidor Final', iibb: '', condicionIibb: '', categoriaMonotributo: '', monotributoActividad: '', monotributoDesde: '', domicilioFiscal: '', limiteCredito: '',
    firmaDigital: '', tipologia: '', procesoSoldadura: '', materialesBase: '',
    parametrosIngenieria: '', modoEnvasado: 'Cilindros', gasesConsumo: '',
    serviciosEspecializados: '', nivelesStockCritico: '', contratoComodato: '',
    activosEnPosesion: '', fechaVencimientoContrato: '', historialDevoluciones: '',
    cargosRecurrentes: '', penalizacionesExtravio: '', estadoCuenta: '', estadoCliente: 'ACTIVO',
    ubicaciones: '', lat: '', lng: '', notas: '',
  }
  const [form, setForm] = useState({ ...emptyForm })
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [geocodeMessage, setGeocodeMessage] = useState('')

  // ---- Data loading ----
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('nombre', searchTerm)
      if (tipologiaFilter !== 'all') params.set('tipologia', tipologiaFilter)
      if (statusFilter === 'activos') params.set('activo', 'true')
      else if (statusFilter === 'inactivos') params.set('activo', 'false')
      if (alphabetFilter !== 'Todos') params.set('letra', alphabetFilter)
      const res = await fetch(`/api/clientes?${params}`)
      const data = await res.json()
      setClientes(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }, [searchTerm, tipologiaFilter, statusFilter, alphabetFilter])

  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t) }, [load])
  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, tipologiaFilter, alphabetFilter])

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(clientes.length / ITEMS_PER_PAGE))
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return clientes.slice(start, start + ITEMS_PER_PAGE)
  }, [clientes, currentPage])
  const showingStart = clientes.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const showingEnd = Math.min(clientes.length, currentPage * ITEMS_PER_PAGE)

  // ---- Acceso ----
  async function loadAcceso(clienteId: string) {
    setLoadingAcceso(true)
    try {
      const res = await fetch('/api/clientes-acceso')
      const lista: any[] = await res.json()
      const mi = lista.find((a: any) => a.clienteId === clienteId) || null
      setAccesoData(mi)
      setAccesoForm({ usuario: mi?.usuario || '', password: '', activo: mi?.activo ?? true })
    } catch { setAccesoData(null) } finally { setLoadingAcceso(false) }
  }

  async function guardarAcceso() {
    if (!viewAccesoCliente) return
    setLoadingAcceso(true)
    try {
      const res = accesoData
        ? await fetch(`/api/clientes-acceso/${accesoData.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: accesoForm.usuario, activo: accesoForm.activo, ...(accesoForm.password ? { password: accesoForm.password } : {}) }),
          })
        : await fetch('/api/clientes-acceso', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clienteId: viewAccesoCliente.id, usuario: accesoForm.usuario, password: accesoForm.password }),
          })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      await loadAcceso(viewAccesoCliente.id)
      toast({ title: accesoData ? 'Acceso actualizado' : 'Acceso creado' })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo guardar', variant: 'destructive' })
    } finally { setLoadingAcceso(false) }
  }

  async function eliminarAcceso() {
    if (!accesoData || !confirm('¿Eliminar el acceso de este cliente?')) return
    setLoadingAcceso(true)
    try {
      await fetch(`/api/clientes-acceso/${accesoData.id}`, { method: 'DELETE' })
      setAccesoData(null); setAccesoForm({ usuario: '', password: '', activo: true })
      toast({ title: 'Acceso eliminado' })
    } catch { toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' }) }
    finally { setLoadingAcceso(false) }
  }

  // ---- Cylinders ----
  async function loadCylindersForCliente(clienteId: string) {
    setLoadingCylinders(true)
    try {
      const res = await fetch(`/api/cylinders?clienteId=${encodeURIComponent(clienteId)}`)
      const data = await res.json()
      setCylindersForCliente(Array.isArray(data) ? data : [])
    } catch { setCylindersForCliente([]) } finally { setLoadingCylinders(false) }
  }

  // ---- History ----
  async function loadHistoryForCliente(clienteId: string) {
    setLoadingHistory(true)
    try {
      const cylRes = await fetch(`/api/cylinders?clienteId=${encodeURIComponent(clienteId)}`)
      const cyls: Cylinder[] = Array.isArray(await cylRes.json()) ? await cylRes.json() : []
      const histMap = new Map<string, number>()
      for (const cyl of cyls) {
        const movRes = await fetch(`/api/cylinders/${cyl.id}/movimientos`)
        const movs: any[] = Array.isArray(await movRes.json()) ? await movRes.json() : []
        for (const m of movs) {
          const d = new Date(m.fecha)
          const key = `${cyl.gas.nombre}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          histMap.set(key, (histMap.get(key) || 0) + 1)
        }
      }
      setHistoryData(Array.from(histMap.entries()).map(([k, cantidad]) => {
        const [gas, mes] = k.split('|'); return { gas, mes, cantidad }
      }).sort((a, b) => a.mes.localeCompare(b.mes)))
    } catch { setHistoryData([]) } finally { setLoadingHistory(false) }
  }

  // ---- Form ----
  function openCreate() {
    setEditId(null); setForm({ ...emptyForm, modoEnvasado: 'Cilindros' }); setActiveFormTab('basicos'); setDialogOpen(true)
  }

  function openEdit(c: Cliente) {
    setEditId(c.id)
    setForm({
      nombre: c.nombre, apellido: c.apellido || '', email: c.email || '', telefono: c.telefono || '', taxId: c.taxId || '', contacto: c.contacto || '',
      telefonoSecundario: c.telefonoSecundario || '', fechaNacimiento: c.fechaNacimiento ? c.fechaNacimiento.split('T')[0] : '', genero: c.genero || 'Masculino',
      tipoDocumento: c.tipoDocumento || '', numeroDocumento: c.numeroDocumento || '',
      calle: c.calle || '', altura: c.altura || '', piso: c.piso || '', codigoPostal: c.codigoPostal || '', ciudad: c.ciudad || '', provincia: c.provincia || '', pais: c.pais || 'Argentina',
      empresa: c.empresa || '', rubro: c.rubro || '', condicionIva: c.condicionIva || 'Consumidor Final', iibb: c.iibb || '', condicionIibb: c.condicionIibb || '', categoriaMonotributo: c.categoriaMonotributo || '', monotributoActividad: c.monotributoActividad || '', monotributoDesde: c.monotributoDesde ? c.monotributoDesde.split('T')[0] : '', domicilioFiscal: c.domicilioFiscal || '', limiteCredito: c.limiteCredito != null ? String(c.limiteCredito) : '',
      firmaDigital: c.firmaDigital || '', tipologia: c.tipologia || '', procesoSoldadura: c.procesoSoldadura || '',
      materialesBase: c.materialesBase || '', parametrosIngenieria: c.parametrosIngenieria || '', modoEnvasado: c.modoEnvasado || 'Cilindros',
      gasesConsumo: c.gasesConsumo || '', serviciosEspecializados: c.serviciosEspecializados || '',
      nivelesStockCritico: c.nivelesStockCritico != null ? String(c.nivelesStockCritico) : '',
      contratoComodato: c.contratoComodato || '', activosEnPosesion: c.activosEnPosesion || '',
      fechaVencimientoContrato: c.fechaVencimientoContrato ? c.fechaVencimientoContrato.split('T')[0] : '',
      historialDevoluciones: c.historialDevoluciones || '', cargosRecurrentes: c.cargosRecurrentes || '',
      penalizacionesExtravio: c.penalizacionesExtravio || '', estadoCuenta: c.estadoCuenta || '', estadoCliente: c.estadoCliente || 'ACTIVO',
      ubicaciones: c.ubicaciones || '', lat: c.lat != null ? String(c.lat) : '', lng: c.lng != null ? String(c.lng) : '', notas: c.notas || '',
    })
    setActiveFormTab('basicos'); setDialogOpen(true)
  }

  async function saveCliente() {
    try {
      const url = editId ? `/api/clientes/${editId}` : '/api/clientes'
      const method = editId ? 'PUT' : 'POST'
      const body: Record<string, any> = {}
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'lat' || k === 'lng') { body[k] = v ? parseFloat(v) : null; return }
        if (k === 'nivelesStockCritico') { body[k] = v ? parseInt(v) : null; return }
        if (k === 'limiteCredito') { body[k] = v ? parseFloat(v) : null; return }
        body[k] = v || undefined
      })
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al guardar') }
      toast({ title: editId ? 'Cliente actualizado' : 'Cliente creado', description: form.nombre })
      setDialogOpen(false); load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' })
    }
  }

  async function removeCliente(c: Cliente) {
    if (!confirm(`¿Eliminar el cliente ${c.nombre}?`)) return
    try {
      const res = await fetch(`/api/clientes/${c.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al eliminar') }
      toast({ title: 'Cliente eliminado', description: c.nombre }); load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' })
    }
  }

  // ---- Geocoding ----
  async function handleGeocode() {
    if (!form.calle || !form.altura || !form.ciudad) {
      setGeocodeStatus('error'); setGeocodeMessage('Complete Calle, Altura y Ciudad para geolocalizar.'); return
    }
    setIsGeocoding(true); setGeocodeStatus('idle'); setGeocodeMessage('')
    try {
      const result = await geocodificarDireccion(form.calle, form.altura, form.ciudad, form.provincia, form.pais)
      setForm(f => ({ ...f, lat: String(result.lat), lng: String(result.lon) }))
      setGeocodeStatus('success'); setGeocodeMessage(`Ubicación encontrada: ${result.displayName}`)
    } catch (err: any) {
      setGeocodeStatus('error'); setGeocodeMessage(err.message || 'No se pudo obtener la geolocalización.')
    } finally { setIsGeocoding(false) }
  }

  async function triggerGeocodingDetail(cliente: Cliente) {
    setIsGeocoding(true)
    try {
      const calle = cliente.calle || ''
      const altura = cliente.altura || ''
      const ciudad = cliente.ciudad || ''
      const provincia = cliente.provincia || ''
      const pais = cliente.pais || 'Argentina'
      if (!calle || !altura || !ciudad) { toast({ title: 'Dirección incompleta', variant: 'destructive' }); return }
      const result = await geocodificarDireccion(calle, altura, ciudad, provincia, pais)
      const updated = { ...cliente, lat: result.lat, lng: result.lon }
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: result.lat, lng: result.lon }),
      })
      if (res.ok) { setDetailCliente(updated); toast({ title: 'Geolocalización guardada' }); load() }
      else { toast({ title: 'Error al guardar', variant: 'destructive' }) }
    } catch (err: any) {
      toast({ title: 'Error de geocodificación', description: err.message, variant: 'destructive' })
    } finally { setIsGeocoding(false) }
  }

  // ---- Card actions ----
  function handleView(cliente: Cliente) { setDetailCliente(cliente) }
  function handleEdit(cliente: Cliente) { openEdit(cliente) }
  function handleDelete(cliente: Cliente) { removeCliente(cliente) }

  // ---- Render ----
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs flex items-center gap-1"><Search className="w-3 h-3" /> Buscar cliente</Label>
              <Input placeholder="Nombre, apellido, doc, teléfono..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs">Tipología</Label>
              <Select value={tipologiaFilter} onValueChange={setTipologiaFilter}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {TIPOLOGIAS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[130px]">
              <Label className="text-xs">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 ml-auto">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Cliente
            </Button>
          </div>
          {/* Alphabet filter */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Índice:</span>
            {ABECEDARIO.map((letter) => (
              <button key={letter}
                onClick={() => setAlphabetFilter(letter)}
                className={`px-1.5 py-0.5 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                  alphabetFilter === letter
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}>
                {letter}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Base de Clientes</CardTitle>
              <CardDescription>{loading ? 'Cargando...' : `${clientes.length} cliente(s) encontrado(s)`}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-12 text-slate-500"><Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />No se encontraron clientes</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentItems.map((c) => {
                  const colors = getAvatarColors(c.apellido || '')
                  const dir = formatDireccion(c)
                  const geo = hasCoords(c)
                  return (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-lg transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm tracking-wide ${colors.bg} border shrink-0 shadow-sm`}>
                            {initials(c.nombre, c.apellido)}
                          </div>
                          <div className="overflow-hidden min-w-0">
                            <h3 className="font-bold text-sm text-slate-800 truncate" title={clientName(c)}>{clientName(c)}</h3>
                            {c.taxId && <p className="text-[11px] text-slate-500 font-medium truncate">{c.taxId}</p>}
                            {c.email && <p className="text-[10px] text-slate-400 truncate">{c.email}</p>}
                          </div>
                        </div>
                        <div className="space-y-1.5 mb-3 text-xs text-slate-600">
                          {c.telefono && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate">{c.telefono}</span></div>}
                          {dir && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate">{dir}</span></div>}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mb-3">
                          <div className="flex gap-1">
                            {ESTADO_CLIENTE_OPTS.filter(e => e === c.estadoCliente).map(e => (
                              <Badge key={e} variant="outline" className={`text-[9px] px-1.5 py-0 ${e === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                                <span className={`w-1 h-1 rounded-full ${e === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'} mr-1 inline-block`} />
                                {e}
                              </Badge>
                            ))}
                          </div>
                          {geo ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600"><CheckCircle className="w-2.5 h-2.5" /> Geo</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600"><XCircle className="w-2.5 h-2.5" /> Sin mapa</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button onClick={() => handleView(c)} className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100/50 transition-all cursor-pointer">
                            <Eye className="w-3 h-3" /><span>Ver</span>
                          </button>
                          <button onClick={() => handleEdit(c)} className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-100/50 transition-all cursor-pointer">
                            <Edit3 className="w-3 h-3" /><span>Editar</span>
                          </button>
                          <button onClick={() => handleDelete(c)} className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[10px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100/50 transition-all cursor-pointer">
                            <Trash2 className="w-3 h-3" /><span>Eliminar</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <button onClick={() => { setViewCylindersCliente(c); loadCylindersForCliente(c.id) }} className="p-1 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer" title="Tubos"><Package className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setViewHistoryCliente(c); loadHistoryForCliente(c.id) }} className="p-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" title="Historial"><History className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setViewAccesoCliente(c); loadAcceso(c.id) }} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="Acceso"><Key className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Pagination */}
              <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="text-xs font-semibold text-slate-500">
                  Mostrando <strong className="text-slate-700">{showingStart}-{showingEnd}</strong> de <strong className="text-slate-700">{clientes.length}</strong> clientes
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 disabled:text-slate-300 disabled:opacity-50 transition-colors cursor-pointer"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 disabled:text-slate-300 disabled:opacity-50 transition-colors cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 disabled:text-slate-300 disabled:opacity-50 transition-colors cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 disabled:text-slate-300 disabled:opacity-50 transition-colors cursor-pointer"><ChevronsRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={!!detailCliente} onOpenChange={(o) => { if (!o) setDetailCliente(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailCliente && (() => {
            const c = detailCliente
            const dir = formatDireccion(c)
            const geo = hasCoords(c)
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">{c.nombre[0]}{(c.apellido || '?')[0]}</div>
                      <div>
                        <DialogTitle className="text-lg">{clientName(c)}</DialogTitle>
                        <p className="text-xs text-slate-500">{c.taxId || 'Sin CUIT'}</p>
                      </div>
                    </div>
                    <button onClick={() => setDetailCliente(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  {/* Left column */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Información Personal</h4>
                      <div className="bg-slate-50 rounded-2xl p-4 border space-y-2.5">
                        <div className="flex justify-between"><span className="text-[11px] font-semibold text-slate-500">Estado</span>
                          <Badge variant="outline" className={`text-[10px] ${c.estadoCliente === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.estadoCliente === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'} mr-1 inline-block`} />{c.estadoCliente || 'ACTIVO'}
                          </Badge>
                        </div>
                        {c.fechaNacimiento && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Nacimiento</span><span className="text-xs font-semibold">{formatDate(c.fechaNacimiento)}</span></div>}
                        {c.genero && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Género</span><span className="text-xs font-semibold">{c.genero}</span></div>}
                        {c.tipoDocumento && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Documento</span><span className="text-xs font-semibold">{c.tipoDocumento}: {c.numeroDocumento}</span></div>}
                        <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Registro</span><span className="text-xs font-semibold">{formatDate(c.createdAt)}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contacto</h4>
                      <div className="bg-slate-50 rounded-2xl p-4 border space-y-2.5">
                        {c.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><div><p className="text-[9px] text-slate-400 font-bold">Email</p><p className="text-xs font-semibold">{c.email}</p></div></div>}
                        {c.telefono && <div className="flex items-center gap-2 border-t pt-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><div><p className="text-[9px] text-slate-400 font-bold">Teléfono</p><p className="text-xs font-semibold">{c.telefono}</p></div></div>}
                        {c.telefonoSecundario && <div className="flex items-center gap-2 border-t pt-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><div><p className="text-[9px] text-slate-400 font-bold">Alternativo</p><p className="text-xs font-semibold">{c.telefonoSecundario}</p></div></div>}
                        {c.contacto && <div className="flex items-center gap-2 border-t pt-2"><Contact className="w-3.5 h-3.5 text-slate-400" /><div><p className="text-[9px] text-slate-400 font-bold">Contacto</p><p className="text-xs font-semibold">{c.contacto}</p></div></div>}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Comercial</h4>
                      <div className="bg-slate-50 rounded-2xl p-4 border space-y-2.5">
                        {c.empresa && <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-500"><Briefcase className="w-3 h-3 inline mr-1" />Empresa</span><span className="text-xs font-semibold">{c.empresa}</span></div>}
                        {c.rubro && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Rubro</span><span className="text-xs font-semibold">{c.rubro}</span></div>}
                        {c.condicionIva && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Cond. IVA</span><span className="text-xs font-semibold">{c.condicionIva}</span></div>}
                        {c.iibb && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">IIBB</span><span className="text-xs font-semibold">{c.iibb}{c.condicionIibb ? ` (${c.condicionIibb})` : ''}</span></div>}
                        {c.categoriaMonotributo && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Monotributo</span><span className="text-xs font-semibold">Cat. {c.categoriaMonotributo}{c.monotributoActividad ? ` · ${c.monotributoActividad}` : ''}{c.monotributoDesde ? ` · ${formatDate(c.monotributoDesde)}` : ''}</span></div>}
                        {c.domicilioFiscal && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Domicilio fiscal</span><span className="text-xs font-semibold">{c.domicilioFiscal}</span></div>}
                        {c.limiteCredito != null && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500"><Coins className="w-3 h-3 inline mr-1" />Límite crédito</span><span className="text-xs font-bold">${c.limiteCredito.toLocaleString('es-AR')}</span></div>}
                        {c.estadoCuenta && <div className="flex justify-between border-t pt-2"><span className="text-[11px] font-semibold text-slate-500">Estado cuenta</span>
                          <Badge className={`text-[10px] border ${ESTADO_CUENTA_COLORS[c.estadoCuenta] || ''}`}>{ESTADO_CUENTA_LABELS[c.estadoCuenta] || c.estadoCuenta}</Badge>
                        </div>}
                        {c.notas && <div className="border-t pt-2"><p className="text-[11px] font-semibold text-slate-500 mb-1">Notas</p><p className="text-xs text-slate-600 bg-white rounded-lg p-2 border italic">"{c.notas}"</p></div>}
                      </div>
                    </div>
                  </div>
                  {/* Right column: Address + Map */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dirección</h4>
                      <div className="bg-slate-50 rounded-2xl p-4 border space-y-2">
                        {dir ? (
                          <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold">{c.calle} {c.altura}</p>
                              {c.piso && <p className="text-[11px] text-slate-500">{c.piso}</p>}
                              <p className="text-[11px] text-slate-500">{c.ciudad}{c.codigoPostal ? ` (CP: ${c.codigoPostal})` : ''}, {c.provincia}</p>
                            </div>
                          </div>
                        ) : c.ubicaciones ? (
                          <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /><p className="text-xs">{c.ubicaciones}</p></div>
                        ) : <p className="text-xs text-slate-400 italic">Sin dirección registrada</p>}
                        <div className="flex items-center justify-between font-mono text-[10px] pt-2 border-t">
                          <span><span className="text-slate-400 font-sans">LAT: </span><span className="font-semibold">{c.lat?.toFixed(6) ?? 'S/D'}</span></span>
                          <span><span className="text-slate-400 font-sans">LON: </span><span className="font-semibold">{c.lng?.toFixed(6) ?? 'S/D'}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="h-64 rounded-2xl border overflow-hidden bg-slate-100 flex flex-col">
                      {geo ? (
                        <StaticMap lat={c.lat!} lng={c.lng!} zoom={14} className="w-full h-full" height={256} />
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                          <h4 className="font-bold text-sm text-slate-800">Sin geoposicionar</h4>
                          <p className="text-xs text-slate-500 mt-1 mb-3">Geolocalice para ver el mapa interactivo</p>
                          {c.calle && c.altura && c.ciudad ? (
                            <button onClick={() => triggerGeocodingDetail(c)} disabled={isGeocoding}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all disabled:bg-slate-400 cursor-pointer">
                              {isGeocoding ? <><Loader2 className="w-3 h-3 animate-spin" /> Geolocalizando...</> : <><Compass className="w-3 h-3" /> Geolocalizar ahora</>}
                            </button>
                          ) : (
                            <p className="text-[10px] text-slate-400">Complete calle, altura y ciudad en la ficha del cliente</p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Quick tech info */}
                    <div className="bg-slate-50 rounded-2xl p-3 border text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-500">Tipología</span><span className="font-semibold">{c.tipologia || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Cilindros</span><span className="font-semibold">{c._count?.cylinders || 0}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Gases</span><span className="font-semibold">{c.gasesConsumo || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Stock crítico</span><span className="font-semibold">{c.nivelesStockCritico ?? '—'}</span></div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <div className="flex gap-2 w-full justify-between">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => { setViewCylindersCliente(c); loadCylindersForCliente(c.id) }}><Package className="w-3.5 h-3.5 mr-1" /> Tubos</Button>
                      <Button variant="outline" size="sm" onClick={() => { setViewHistoryCliente(c); loadHistoryForCliente(c.id) }}><History className="w-3.5 h-3.5 mr-1" /> Historial</Button>
                      <Button variant="outline" size="sm" onClick={() => { setViewAccesoCliente(c); loadAcceso(c.id) }}><Key className="w-3.5 h-3.5 mr-1" /> Acceso</Button>
                    </div>
                    <Button size="sm" onClick={() => setDetailCliente(null)} className="bg-slate-800 hover:bg-slate-700 text-white">Cerrar</Button>
                  </div>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>{editId ? `Modificando ${form.nombre}` : 'Complete la ficha del cliente'}</DialogDescription>
          </DialogHeader>
          {/* Form tabs */}
          <div className="flex gap-0.5 border-b mb-4 bg-slate-50 -mx-6 px-6">
            {([
              { id: 'basicos', label: 'Datos Básicos', icon: User },
              { id: 'direccion', label: 'Dirección', icon: MapPin },
              { id: 'comercial', label: 'Contacto y Comerciales', icon: Briefcase },
              { id: 'tecnico', label: 'Perfil Técnico', icon: FlaskConical },
              { id: 'gestion', label: 'Gestión', icon: FileText },
            ] as const).map((tab) => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setActiveFormTab(tab.id as any)}
                  className={`px-3 py-2.5 text-[11px] font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeFormTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-4">
            {/* TAB 1: Básicos */}
            {activeFormTab === 'basicos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-xs">Nombre / Razón Social *</Label><Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Razón social" /></div>
                <div><Label className="text-xs">Apellido</Label><Input value={form.apellido} onChange={(e) => setForm(f => ({ ...f, apellido: e.target.value }))} placeholder="Apellido del contacto" /></div>
                <div><Label className="text-xs">Tipo Documento</Label>
                  <Select value={form.tipoDocumento} onValueChange={(v) => setForm(f => ({ ...f, tipoDocumento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{TIPO_DOC_OPTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">N° Documento</Label><Input value={form.numeroDocumento} onChange={(e) => setForm(f => ({ ...f, numeroDocumento: e.target.value }))} placeholder="20-12345678-9" /></div>
                <div><Label className="text-xs">Fecha de Nacimiento</Label><Input type="date" value={form.fechaNacimiento} onChange={(e) => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} /></div>
                <div><Label className="text-xs">Género</Label>
                  <Select value={form.genero} onValueChange={(v) => setForm(f => ({ ...f, genero: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_GENERO.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Estado del cliente</Label>
                  <Select value={form.estadoCliente} onValueChange={(v) => setForm(f => ({ ...f, estadoCliente: v }))}>
                    <SelectTrigger><SelectValue placeholder="ACTIVO" /></SelectTrigger>
                    <SelectContent>{ESTADO_CLIENTE_OPTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Tax ID / CUIT</Label><Input value={form.taxId} onChange={(e) => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="30-12345678-9" /></div>
              </div>
            )}

            {/* TAB 2: Dirección */}
            {activeFormTab === 'direccion' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2"><Label className="text-xs">Calle *</Label><Input value={form.calle} onChange={(e) => setForm(f => ({ ...f, calle: e.target.value }))} placeholder="Av. Corrientes" /></div>
                  <div><Label className="text-xs">Altura / Número *</Label><Input value={form.altura} onChange={(e) => setForm(f => ({ ...f, altura: e.target.value }))} placeholder="1500" /></div>
                  <div><Label className="text-xs">Piso / Dpto</Label><Input value={form.piso} onChange={(e) => setForm(f => ({ ...f, piso: e.target.value }))} placeholder="4B" /></div>
                  <div><Label className="text-xs">Código Postal</Label><Input value={form.codigoPostal} onChange={(e) => setForm(f => ({ ...f, codigoPostal: e.target.value }))} placeholder="C1042AAN" /></div>
                  <div><Label className="text-xs">Ciudad *</Label><Input value={form.ciudad} onChange={(e) => setForm(f => ({ ...f, ciudad: e.target.value }))} placeholder="Buenos Aires" /></div>
                  <div><Label className="text-xs">Provincia *</Label><Input value={form.provincia} onChange={(e) => setForm(f => ({ ...f, provincia: e.target.value }))} placeholder="CABA" /></div>
                  <div><Label className="text-xs">País</Label><Input value={form.pais} onChange={(e) => setForm(f => ({ ...f, pais: e.target.value }))} /></div>
                </div>
                <div className="bg-slate-50 rounded-2xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold flex items-center gap-1.5"><Compass className="w-4 h-4 text-indigo-600" /> Geoposicionamiento</h4>
                    <button onClick={handleGeocode} disabled={isGeocoding}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition-all cursor-pointer">
                      {isGeocoding ? <><Loader2 className="w-3 h-3 animate-spin" /> Buscando...</> : <><Search className="w-3 h-3" /> Geolocalizar</>}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Obtiene las coordenadas automáticamente desde la dirección ingresada usando OpenStreetMap (Nominatim).</p>
                  {geocodeStatus !== 'idle' && (
                    <div className={`p-2.5 rounded-xl flex items-start gap-2 text-xs ${geocodeStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                      {geocodeStatus === 'success' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />}
                      <span>{geocodeMessage}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-[10px] text-slate-500">Latitud (Y)</Label><Input type="number" step="any" value={form.lat} onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="-34.6037" /></div>
                    <div><Label className="text-[10px] text-slate-500">Longitud (X)</Label><Input type="number" step="any" value={form.lng} onChange={(e) => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="-58.3816" /></div>
                  </div>
                  {form.lat && form.lng && (
                    <div className="rounded-xl overflow-hidden border h-36 bg-slate-100">
                      <StaticMap lat={parseFloat(form.lat)} lng={parseFloat(form.lng)} zoom={14} height={144} />
                    </div>
                  )}
                </div>
                <div><Label className="text-xs">Ubicaciones (legacy)</Label><Input value={form.ubicaciones} onChange={(e) => setForm(f => ({ ...f, ubicaciones: e.target.value }))} placeholder="Direcciones alternativas" /></div>
              </div>
            )}

            {/* TAB 3: Contacto y Comerciales */}
            {activeFormTab === 'comercial' && (
              <div className="space-y-6">
                {/* Contacto */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><Contact className="w-3.5 h-3.5" /> Contacto</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@empresa.com" /></div>
                    <div><Label className="text-xs">Teléfono Principal *</Label><Input value={form.telefono} onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="11-4444-1111" /></div>
                    <div><Label className="text-xs">Teléfono Secundario</Label><Input value={form.telefonoSecundario} onChange={(e) => setForm(f => ({ ...f, telefonoSecundario: e.target.value }))} placeholder="11-4444-2222" /></div>
                    <div><Label className="text-xs">Persona de Contacto</Label><Input value={form.contacto} onChange={(e) => setForm(f => ({ ...f, contacto: e.target.value }))} placeholder="Responsable / receptor" /></div>
                  </div>
                </div>
                {/* Comercial */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Comercial</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-xs">Empresa</Label><Input value={form.empresa} onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Razón social comercial" /></div>
                    <div><Label className="text-xs">Rubro / Sector</Label><Input value={form.rubro} onChange={(e) => setForm(f => ({ ...f, rubro: e.target.value }))} placeholder="Logística, Construcción..." /></div>
                    <div><Label className="text-xs">Límite de Crédito ($)</Label><Input type="number" value={form.limiteCredito} onChange={(e) => setForm(f => ({ ...f, limiteCredito: e.target.value }))} placeholder="500000" /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Firma Digital</Label><Input value={form.firmaDigital} onChange={(e) => setForm(f => ({ ...f, firmaDigital: e.target.value }))} placeholder="Registro digital de aceptación" /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Notas</Label><Input value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Información adicional" /></div>
                  </div>
                </div>
                {/* Datos Fiscales */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Datos Fiscales (ARCA)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-xs">Condición frente al IVA</Label>
                      <Select value={form.condicionIva} onValueChange={(v) => setForm(f => ({ ...f, condicionIva: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{COND_IVA_OPTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Condición de IIBB</Label>
                      <Select value={form.condicionIibb} onValueChange={(v) => setForm(f => ({ ...f, condicionIibb: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {['Exento', 'Convenio Multilateral', 'Local', 'No Corresponde'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">N° Ingresos Brutos</Label><Input value={form.iibb} onChange={(e) => setForm(f => ({ ...f, iibb: e.target.value }))} placeholder="12345-67890-1" /></div>
                    <div><Label className="text-xs">Categoría Monotributo</Label>
                      <Select value={form.categoriaMonotributo} onValueChange={(v) => setForm(f => ({ ...f, categoriaMonotributo: v }))}>
                        <SelectTrigger><SelectValue placeholder="No aplica" /></SelectTrigger>
                        <SelectContent>
                          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map((c) => <SelectItem key={c} value={c}>{`Cat. ${c}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Actividad Monotributo</Label>
                      <Select value={form.monotributoActividad} onValueChange={(v) => setForm(f => ({ ...f, monotributoActividad: v }))}>
                        <SelectTrigger><SelectValue placeholder="No aplica" /></SelectTrigger>
                        <SelectContent>{MONOTRIBUTO_ACTIVIDAD_OPTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Inscripción Monotributo</Label><Input type="date" value={form.monotributoDesde} onChange={(e) => setForm(f => ({ ...f, monotributoDesde: e.target.value }))} /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Domicilio Fiscal</Label><Input value={form.domicilioFiscal} onChange={(e) => setForm(f => ({ ...f, domicilioFiscal: e.target.value }))} placeholder="Si difiere del domicilio comercial" /></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Perfil Técnico */}
            {activeFormTab === 'tecnico' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-xs">Tipología</Label>
                  <Select value={form.tipologia} onValueChange={(v) => setForm(f => ({ ...f, tipologia: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{TIPOLOGIAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Procesos de Soldadura</Label><Input value={form.procesoSoldadura} onChange={(e) => setForm(f => ({ ...f, procesoSoldadura: e.target.value }))} placeholder="TIG, MIG/MAG, Oxicorte" /></div>
                <div><Label className="text-xs">Materiales Base</Label><Input value={form.materialesBase} onChange={(e) => setForm(f => ({ ...f, materialesBase: e.target.value }))} placeholder="Acero, inox, aluminio" /></div>
                <div><Label className="text-xs">Parámetros de Ingeniería</Label><Input value={form.parametrosIngenieria} onChange={(e) => setForm(f => ({ ...f, parametrosIngenieria: e.target.value }))} placeholder="Homologaciones WPS" /></div>
                <div><Label className="text-xs">Modo de Envasado</Label>
                  <Select value={form.modoEnvasado} onValueChange={(v) => setForm(f => ({ ...f, modoEnvasado: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cilindros">Cilindros individuales</SelectItem>
                      <SelectItem value="Bloques">Bloques</SelectItem>
                      <SelectItem value="Microgranel">Microgranel</SelectItem>
                      <SelectItem value="Granel">Granel líquido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Nivel Stock Crítico</Label><Input type="number" min="0" value={form.nivelesStockCritico} onChange={(e) => setForm(f => ({ ...f, nivelesStockCritico: e.target.value }))} placeholder="Cantidad mínima" /></div>
                <div><Label className="text-xs">Gases de Consumo</Label><Input value={form.gasesConsumo} onChange={(e) => setForm(f => ({ ...f, gasesConsumo: e.target.value }))} placeholder="AR, MIX-7525, CO2..." /></div>
                <div className="md:col-span-2"><Label className="text-xs">Servicios Especializados</Label><Input value={form.serviciosEspecializados} onChange={(e) => setForm(f => ({ ...f, serviciosEspecializados: e.target.value }))} placeholder="CryoEase®, Maxx®, Integra®" /></div>
              </div>
            )}

            {/* TAB 5: Gestión */}
            {activeFormTab === 'gestion' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-xs">N° Contrato Comodato</Label><Input value={form.contratoComodato} onChange={(e) => setForm(f => ({ ...f, contratoComodato: e.target.value }))} placeholder="Número" /></div>
                <div><Label className="text-xs">Vencimiento Contrato</Label><Input type="date" value={form.fechaVencimientoContrato} onChange={(e) => setForm(f => ({ ...f, fechaVencimientoContrato: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label className="text-xs">Activos en Posesión</Label><Input value={form.activosEnPosesion} onChange={(e) => setForm(f => ({ ...f, activosEnPosesion: e.target.value }))} placeholder="IDs de cilindros en poder del cliente" /></div>
                <div className="md:col-span-2"><Label className="text-xs">Historial de Devoluciones</Label><Input value={form.historialDevoluciones} onChange={(e) => setForm(f => ({ ...f, historialDevoluciones: e.target.value }))} placeholder="Registro de activos devueltos" /></div>
                <div><Label className="text-xs">Estado de Cuenta</Label>
                  <Select value={form.estadoCuenta} onValueChange={(v) => setForm(f => ({ ...f, estadoCuenta: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {ESTADO_CUENTA_OPTS.map((e) => <SelectItem key={e} value={e}>{ESTADO_CUENTA_LABELS[e] || e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Penalizaciones Extravío</Label><Input value={form.penalizacionesExtravio} onChange={(e) => setForm(f => ({ ...f, penalizacionesExtravio: e.target.value }))} placeholder="Cargos por no devolución" /></div>
                <div><Label className="text-xs">Cargos Recurrentes</Label><Input value={form.cargosRecurrentes} onChange={(e) => setForm(f => ({ ...f, cargosRecurrentes: e.target.value }))} placeholder="Facturación automática" /></div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
            <Button onClick={saveCliente} disabled={!form.nombre.trim()} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tubos */}
      <Dialog open={!!viewCylindersCliente} onOpenChange={(o) => { if (!o) setViewCylindersCliente(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-sky-600" /> Tubos de {viewCylindersCliente?.nombre}</DialogTitle></DialogHeader>
          {loadingCylinders ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : cylindersForCliente.length === 0 ? (
            <div className="text-center py-8 text-slate-400"><Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />Este cliente no tiene tubos asignados</div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Serie</TableHead><TableHead>Gas</TableHead><TableHead>Estado</TableHead>
                    <TableHead>Capacidad</TableHead><TableHead>PH</TableHead><TableHead>Ubicación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cylindersForCliente.map((cyl) => (
                    <TableRow key={cyl.id}>
                      <TableCell className="font-mono text-xs font-semibold">{cyl.numeroSerie}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cyl.gas.colorHex }} />
                          <span className="text-sm">{cyl.gas.nombre}</span>
                          <SgaBadge peligro={cyl.gas.peligro} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${ESTADO_COLORS[cyl.estado] || 'bg-slate-100 text-slate-700'}`}>
                          {ESTADO_LABELS[cyl.estado] || cyl.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{cyl.capacidadLitros}L</TableCell>
                      <TableCell>
                        {(() => {
                          const d = daysUntil(cyl.fechaProximoRetest)
                          if (d < 0) return <Badge variant="destructive" className="text-[10px]">Vencida</Badge>
                          if (d <= 60) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">{d}d</Badge>
                          return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{formatDate(cyl.fechaProximoRetest)}</Badge>
                        })()}
                      </TableCell>
                      <TableCell className="text-xs">{cyl.ubicacionNombre}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial */}
      <Dialog open={!!viewHistoryCliente} onOpenChange={(o) => { if (!o) setViewHistoryCliente(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5 text-amber-600" /> Historial de uso — {viewHistoryCliente?.nombre}</DialogTitle>
            <DialogDescription>Movimientos de tubos agrupados por gas, mes y año</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-8 text-slate-400"><History className="w-10 h-10 mx-auto mb-2 text-slate-200" />Sin movimientos registrados</div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Gas</TableHead><TableHead className="text-center">Mes / Año</TableHead><TableHead className="text-right">Movimientos</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell><span className="text-sm font-medium">{h.gas}</span></TableCell>
                      <TableCell className="text-center font-mono text-sm">{h.mes}</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary" className="font-mono tabular-nums">{h.cantidad}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Acceso */}
      <Dialog open={!!viewAccesoCliente} onOpenChange={(o) => { if (!o) setViewAccesoCliente(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-indigo-600" /> Acceso de {viewAccesoCliente?.nombre}</DialogTitle>
            <DialogDescription>{accesoData ? 'Modificar o eliminar las credenciales' : 'Crear credenciales para el portal'}</DialogDescription>
          </DialogHeader>
          {loadingAcceso ? (
            <div className="py-8 text-center text-slate-400">Cargando...</div>
          ) : (
            <div className="space-y-4">
              <div><Label className="text-xs font-medium">Usuario</Label><Input value={accesoForm.usuario} onChange={(e) => setAccesoForm(f => ({ ...f, usuario: e.target.value }))} placeholder="nombre de usuario" className="mt-1" /></div>
              <div>
                <Label className="text-xs font-medium">{accesoData ? 'Nueva contraseña (dejar vacío)' : 'Contraseña'}</Label>
                <Input type="password" value={accesoForm.password} onChange={(e) => setAccesoForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres</p>
              </div>
              {accesoData && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="accesoActivo" checked={accesoForm.activo} onChange={(e) => setAccesoForm(f => ({ ...f, activo: e.target.checked }))} className="rounded border-slate-300" />
                  <Label htmlFor="accesoActivo" className="text-xs">Cuenta activa</Label>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <div>{accesoData && <Button variant="destructive" size="sm" onClick={eliminarAcceso} disabled={loadingAcceso}><Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar acceso</Button>}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewAccesoCliente(null)}>Cancelar</Button>
                  <Button size="sm" onClick={guardarAcceso} disabled={!accesoForm.usuario || (!accesoData && !accesoForm.password) || loadingAcceso}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90">
                    <Save className="w-3.5 h-3.5 mr-1" /> {accesoData ? 'Actualizar' : 'Crear acceso'}
                  </Button>
                </div>
              </div>
              {accesoData && <p className="text-xs text-slate-400 text-center pt-2 border-t">Usuario: <strong>{accesoData.usuario}</strong> — {accesoData.activo ? 'Activo' : 'Inactivo'}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
