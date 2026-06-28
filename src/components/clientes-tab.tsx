'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Plus,
  RefreshCw,
  Users,
  Building2,
  Contact,
  Package,
  History,
  Edit3,
  Trash2,
  Save,
  X,
  Hash,
  Phone,
  Mail,
  Eye,
  FileText,
  Download,
  Settings2,
  FolderOpen,
  UserPlus,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Cliente, Cylinder } from '@/lib/tab-types'
import {
  TIPOLOGIAS,
  formatDate,
} from '@/lib/tab-constants'

// ─── Helpers ───────────────────────────────────────────────────────────
const GRADIENTES: Record<string, string> = {
  ACTIVO: 'bg-gradient-to-br from-blue-500 to-emerald-500',
  SUSPENDIDO: 'bg-gradient-to-br from-amber-500 to-orange-500',
  INACTIVO: 'bg-gradient-to-br from-slate-400 to-slate-500',
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SUSPENDIDO: 'bg-amber-100 text-amber-700 border-amber-200',
  INACTIVO: 'bg-slate-100 text-slate-500 border-slate-200',
}

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  INACTIVO: 'Inactivo',
}

function estadoCliente(c: Cliente): string {
  return c.estadoCliente || (c.activo ? 'ACTIVO' : 'INACTIVO')
}

function inicial(c: Cliente): string {
  return (c.apellido || c.nombre).charAt(0).toUpperCase()
}

function formatearNombre(c: Cliente): { apellido: string; nombre: string } {
  if (c.apellido) return { apellido: c.apellido, nombre: c.nombre }
  return { apellido: c.nombre, nombre: '' }
}

// ─── Componente principal ──────────────────────────────────────────────
export default function ClientesTab() {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Data ──
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [loading, setLoading] = useState(true)

  // ── Filters ──
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroTipologia, setFiltroTipologia] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [letraActiva, setLetraActiva] = useState('TODOS')

  // ── Dialogs ──
  const [viewCliente, setViewCliente] = useState<Cliente | null>(null)
  const [viewTab, setViewTab] = useState('info')

  const [cylindersForCliente, setCylindersForCliente] = useState<Cylinder[]>([])
  const [loadingCylinders, setLoadingCylinders] = useState(false)

  const [historyData, setHistoryData] = useState<{ gas: string; mes: string; cantidad: number }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [viewAccesoCliente, setViewAccesoCliente] = useState<Cliente | null>(null)
  const [accesoData, setAccesoData] = useState<{ id: string; usuario: string; activo: boolean } | null>(null)
  const [accesoForm, setAccesoForm] = useState({ usuario: '', password: '', activo: true })
  const [loadingAcceso, setLoadingAcceso] = useState(false)

  // ── Form ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const emptyForm = {
    nombre: '',
    apellido: '',
    email: '',
    taxId: '',
    contacto: '',
    firmaDigital: '',
    tipologia: '',
    procesoSoldadura: '',
    materialesBase: '',
    parametrosIngenieria: '',
    modoEnvasado: '',
    gasesConsumo: '',
    serviciosEspecializados: '',
    nivelesStockCritico: '',
    contratoComodato: '',
    activosEnPosesion: '',
    fechaVencimientoContrato: '',
    historialDevoluciones: '',
    cargosRecurrentes: '',
    penalizacionesExtravio: '',
    estadoCuenta: '',
    ubicaciones: '',
    notas: '',
  }
  const [form, setForm] = useState({ ...emptyForm })
  const [estadoForm, setEstadoForm] = useState('ACTIVO')

  // ── Dialogs extra ──
  const [reportesOpen, setReportesOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [stats, setStats] = useState({ total: 0, activos: 0, suspendidos: 0, inactivos: 0, cilindros: 0 })
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  // ── Load ──
  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(pageSize))
    if (filtroNombre) params.set('nombre', filtroNombre)
    if (filtroTipologia !== 'all') params.set('tipologia', filtroTipologia)
    if (filtroEstado === 'activos') params.set('estado', 'ACTIVO')
    if (filtroEstado === 'suspendidos') params.set('estado', 'SUSPENDIDO')
    if (filtroEstado === 'inactivos') params.set('estado', 'INACTIVO')
    if (letraActiva !== 'TODOS') params.set('letra', letraActiva)
    return params
  }, [page, pageSize, filtroNombre, filtroTipologia, filtroEstado, letraActiva])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildParams()
      const res = await fetch(`/api/clientes?${params}`)
      const data = await res.json()
      if (data.clientes) {
        setClientes(data.clientes)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  // ── Acceso ──
  async function loadAcceso(clienteId: string) {
    setLoadingAcceso(true)
    try {
      const res = await fetch('/api/clientes-acceso')
      const lista: any[] = await res.json()
      const miAcceso = lista.find((a: any) => a.clienteId === clienteId) || null
      setAccesoData(miAcceso)
      setAccesoForm({
        usuario: miAcceso?.usuario || '',
        password: '',
        activo: miAcceso?.activo ?? true,
      })
    } catch { setAccesoData(null) }
    finally { setLoadingAcceso(false) }
  }

  async function guardarAcceso() {
    if (!viewAccesoCliente) return
    setLoadingAcceso(true)
    try {
      const res = accesoData
        ? await fetch(`/api/clientes-acceso/${accesoData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usuario: accesoForm.usuario,
              activo: accesoForm.activo,
              ...(accesoForm.password ? { password: accesoForm.password } : {}),
            }),
          })
        : await fetch('/api/clientes-acceso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clienteId: viewAccesoCliente.id,
              usuario: accesoForm.usuario,
              password: accesoForm.password,
            }),
          })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error del servidor')
      }
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
      const res = await fetch(`/api/clientes-acceso/${accesoData.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setAccesoData(null)
      setAccesoForm({ usuario: '', password: '', activo: true })
      toast({ title: 'Acceso eliminado' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    } finally { setLoadingAcceso(false) }
  }

  // ── Cilindros ──
  async function loadCylindersForCliente(clienteId: string) {
    setLoadingCylinders(true)
    try {
      const res = await fetch(`/api/cylinders?clienteId=${encodeURIComponent(clienteId)}`)
      const data = await res.json()
      setCylindersForCliente(Array.isArray(data) ? data : [])
    } catch { setCylindersForCliente([]) }
    finally { setLoadingCylinders(false) }
  }

  // ── Historial ──
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
      setHistoryData(
        Array.from(histMap.entries())
          .map(([k, cantidad]) => {
            const [gas, mes] = k.split('|')
            return { gas, mes, cantidad }
          })
          .sort((a, b) => a.mes.localeCompare(b.mes))
      )
    } catch { setHistoryData([]) }
    finally { setLoadingHistory(false) }
  }

  // ── Form ──
  function openCreate() {
    setEditId(null)
    setForm({ ...emptyForm, modoEnvasado: 'Cilindros' })
    setEstadoForm('ACTIVO')
    setDialogOpen(true)
  }

  function openEdit(c: Cliente) {
    setEditId(c.id)
    setForm({
      nombre: c.nombre,
      apellido: c.apellido || '',
      email: c.email || '',
      taxId: c.taxId || '',
      contacto: c.contacto || '',
      firmaDigital: c.firmaDigital || '',
      tipologia: c.tipologia || '',
      procesoSoldadura: c.procesoSoldadura || '',
      materialesBase: c.materialesBase || '',
      parametrosIngenieria: c.parametrosIngenieria || '',
      modoEnvasado: c.modoEnvasado || '',
      gasesConsumo: c.gasesConsumo || '',
      serviciosEspecializados: c.serviciosEspecializados || '',
      nivelesStockCritico: c.nivelesStockCritico != null ? String(c.nivelesStockCritico) : '',
      contratoComodato: c.contratoComodato || '',
      activosEnPosesion: c.activosEnPosesion || '',
      fechaVencimientoContrato: c.fechaVencimientoContrato ? c.fechaVencimientoContrato.split('T')[0] : '',
      historialDevoluciones: c.historialDevoluciones || '',
      cargosRecurrentes: c.cargosRecurrentes || '',
      penalizacionesExtravio: c.penalizacionesExtravio || '',
      estadoCuenta: c.estadoCuenta || '',
      ubicaciones: c.ubicaciones || '',
      notas: c.notas || '',
    })
    setEstadoForm(estadoCliente(c))
    setDialogOpen(true)
  }

  async function saveCliente() {
    try {
      const payload = { ...form, estadoCliente: estadoForm }
      const url = editId ? `/api/clientes/${editId}` : '/api/clientes'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      toast({
        title: editId ? 'Cliente actualizado' : 'Cliente creado',
        description: form.nombre,
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

  async function removeCliente(c: Cliente) {
    if (!confirm(`¿Eliminar el cliente ${c.nombre}?`)) return
    try {
      const res = await fetch(`/api/clientes/${c.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast({ title: 'Cliente eliminado', description: c.nombre })
      load()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  // ── Ver detalle ──
  function verCliente(c: Cliente) {
    setViewCliente(c)
    setViewTab('info')
    loadCylindersForCliente(c.id)
    loadHistoryForCliente(c.id)
    loadAcceso(c.id)
  }

  // ── Cambiar estado ──
  async function cambiarEstadoCliente(nuevoEstado: string) {
    if (!viewCliente) return
    setCambiandoEstado(true)
    try {
      const res = await fetch(`/api/clientes/${viewCliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoCliente: nuevoEstado }),
      })
      if (!res.ok) throw new Error('Error al cambiar estado')
      toast({ title: 'Estado actualizado', description: `${viewCliente.nombre} → ${ESTADO_LABEL[nuevoEstado] || nuevoEstado}` })
      setViewCliente({ ...viewCliente, estadoCliente: nuevoEstado, activo: nuevoEstado === 'ACTIVO' })
      load()
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' })
    } finally { setCambiandoEstado(false) }
  }

  // ── Stats ──
  async function loadStats() {
    try {
      const res = await fetch('/api/clientes')
      const data = await res.json()
      const lista = data.clientes || (Array.isArray(data) ? data : [])
      let activos = 0, suspendidos = 0, inactivos = 0, cilindros = 0
      for (const c of lista) {
        const est = c.estadoCliente || (c.activo ? 'ACTIVO' : 'INACTIVO')
        if (est === 'ACTIVO') activos++
        else if (est === 'SUSPENDIDO') suspendidos++
        else inactivos++
        cilindros += c._count?.cylinders || 0
      }
      setStats({ total: lista.length, activos, suspendidos, inactivos, cilindros })
    } catch { /* ignore */ }
  }

  // ── Export CSV ──
  function exportCSV() {
    if (clientes.length === 0) return
    const headers = ['Nombre', 'Apellido', 'Email', 'CUIT', 'Contacto', 'Teléfono', 'Tipología', 'Estado']
    const rows = clientes.map(c => [
      c.nombre, c.apellido || '', c.email || '', c.taxId || '', c.contacto || '', '',
      c.tipologia || '', ESTADO_LABEL[estadoCliente(c)] || ''
    ].map(v => `"${v}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Sidebar items ──
  const sidebarItems = [
    { label: 'Clientes', icon: Users, action: () => { setLetraActiva('TODOS'); setFiltroNombre(''); setFiltroEstado('all'); setFiltroTipologia('all'); setPage(1) } },
    { label: 'Fichero', icon: FolderOpen, action: () => document.querySelector('[data-card-grid]')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Nuevo Cliente', icon: UserPlus, action: openCreate },
    { label: 'Buscar', icon: Search, action: () => searchRef.current?.focus() },
    { label: 'Reportes', icon: BarChart3, action: () => { loadStats(); setReportesOpen(true) } },
    { label: 'Exportar', icon: Download, action: exportCSV },
    { label: 'Configuración', icon: Settings2, action: () => setConfigOpen(true) },
  ]

  // ── Render ──
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1
  const hasta = Math.min(page * pageSize, total)

  return (
    <div className="flex gap-4">
      {/* ── SIDEBAR ── */}
      <aside className="w-[200px] shrink-0 bg-[#183B67] rounded-xl p-3 hidden lg:flex flex-col text-white text-xs shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20">
          <Building2 className="w-5 h-5" />
          <span className="font-semibold text-sm">Clientes</span>
        </div>
        <nav className="space-y-0.5 flex-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2.5 text-white/80 hover:text-white"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/20 pt-3 text-white/50 text-[10px] space-y-0.5">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Administrador
          </div>
          <div>{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Gestión Integral de Clientes</h1>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Cliente
          </Button>
        </div>

        {/* SEARCH + FILTERS */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={searchRef}
              placeholder="Buscar por nombre, apellido, CUIT, teléfono, email..."
              className="pl-9 h-10 text-sm"
              value={filtroNombre}
              onChange={(e) => { setFiltroNombre(e.target.value); setPage(1) }}
            />
          </div>
          <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v); setPage(1) }}>
            <SelectTrigger className="w-[150px] h-10">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="suspendidos">Suspendidos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          {(filtroNombre || filtroEstado !== 'all' || letraActiva !== 'TODOS') && (
            <Button variant="ghost" size="sm" className="h-10 text-xs" onClick={() => { setFiltroNombre(''); setFiltroEstado('all'); setLetraActiva('TODOS'); setPage(1) }}>
              <X className="w-3.5 h-3.5 mr-1" /> Limpiar filtros
            </Button>
          )}
        </div>

        {/* ALPHABETICAL INDEX */}
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={letraActiva === 'TODOS' ? 'default' : 'outline'}
            onClick={() => { setLetraActiva('TODOS'); setPage(1) }}
            className="h-7 min-w-[50px] text-xs"
          >
            Todos
          </Button>
          {'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('').map((l) => (
            <Button
              key={l}
              size="sm"
              variant={letraActiva === l ? 'default' : 'outline'}
              onClick={() => { setLetraActiva(l); setPage(1) }}
              className="h-7 w-8 p-0 text-xs font-semibold"
            >
              {l}
            </Button>
          ))}
        </div>

        {/* CARD GRID */}
        <div data-card-grid>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : clientes.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-500">
                <Users className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">No se encontraron clientes</p>
                <p className="text-sm mt-1">Intentá con otros filtros o creá un nuevo cliente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {clientes.map((c) => {
                const est = estadoCliente(c)
                const { apellido, nombre } = formatearNombre(c)
                return (
                  <Card key={c.id} className="rounded-xl shadow-sm hover:shadow-md transition-all border-slate-200 hover:border-slate-300">
                    <CardContent className="p-4">
                      {/* Avatar + nombre */}
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className={`h-10 w-10 ${GRADIENTES[est] || GRADIENTES.ACTIVO} shadow-sm`}>
                          <AvatarFallback className="text-white font-bold text-sm">
                            {inicial(c)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm uppercase leading-tight truncate text-slate-800">
                            {apellido}
                          </p>
                          {nombre && (
                            <p className="text-xs text-slate-500 truncate">{nombre}</p>
                          )}
                        </div>
                      </div>

                      {/* Datos */}
                      <div className="text-xs text-slate-600 space-y-1 mb-3">
                        {c.taxId && (
                          <p className="font-mono flex items-center gap-1.5">
                            <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{c.taxId}</span>
                          </p>
                        )}
                        {c.contacto && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{c.contacto}</span>
                          </p>
                        )}
                        {c.email && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </p>
                        )}
                      </div>

                      {/* Badge */}
                      <Badge variant="outline" className={`${ESTADO_BADGE[est] || ESTADO_BADGE.ACTIVO} text-[10px]`}>
                        {ESTADO_LABEL[est] || 'Activo'}
                      </Badge>

                      {/* Actions */}
                      <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-slate-600 hover:text-slate-800" onClick={() => verCliente(c)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-slate-600 hover:text-slate-800" onClick={() => openEdit(c)}>
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={() => removeCliente(c)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-600 pt-2">
            <span className="text-xs">
              Mostrando {desde}–{hasta} de {total} clientes
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(1)}>
                <ChevronLeft className="w-3 h-3" /><ChevronLeft className="w-3 h-3 -ml-1" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                return (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'outline'}
                    className="h-7 min-w-[28px] p-0 text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                )
              })}
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <ChevronRight className="w-3 h-3" /><ChevronRight className="w-3 h-3 -ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── DIALOG: Ver cliente ── */}
      <Dialog open={!!viewCliente} onOpenChange={(o) => { if (!o) setViewCliente(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${GRADIENTES[estadoCliente(viewCliente!)] || GRADIENTES.ACTIVO} flex items-center justify-center text-white text-xs font-bold`}>
                {viewCliente ? inicial(viewCliente) : ''}
              </div>
              {viewCliente?.nombre}
            </DialogTitle>
          </DialogHeader>
          {viewCliente && (
            <Tabs value={viewTab} onValueChange={setViewTab}>
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                <TabsTrigger value="cilindros" className="text-xs">Cilindros</TabsTrigger>
                <TabsTrigger value="historial" className="text-xs">Historial</TabsTrigger>
                <TabsTrigger value="acceso" className="text-xs">Acceso</TabsTrigger>
                <TabsTrigger value="estado" className="text-xs">Estado</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="text-sm space-y-2">
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    ['Apellido', viewCliente.apellido],
                    ['Nombre', viewCliente.nombre],
                    ['Email', viewCliente.email],
                    ['CUIT', viewCliente.taxId],
                    ['Contacto', viewCliente.contacto],
                    ['Tipología', viewCliente.tipologia],
                    ['Modo Envasado', viewCliente.modoEnvasado],
                    ['Gases Consumo', viewCliente.gasesConsumo],
                    ['Stock Crítico', viewCliente.nivelesStockCritico?.toString()],
                    ['Contrato Comodato', viewCliente.contratoComodato],
                    ['Venc. Contrato', viewCliente.fechaVencimientoContrato ? formatDate(viewCliente.fechaVencimientoContrato) : ''],
                    ['Ubicaciones', viewCliente.ubicaciones],
                  ].map(([label, val]) => (
                    val ? <div key={label}><span className="text-slate-500 text-xs">{label}</span><p>{val}</p></div> : null
                  ))}
                </div>
                {viewCliente.notas && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 text-xs block mb-1">Notas</span>
                    <p className="whitespace-pre-wrap">{viewCliente.notas}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cilindros">
                {loadingCylinders ? (
                  <Skeleton className="h-[200px]" />
                ) : cylindersForCliente.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Sin cilindros asignados</div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-xs">Serie</TableHead>
                        <TableHead className="text-xs">Gas</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {cylindersForCliente.map((cyl) => (
                          <TableRow key={cyl.id}>
                            <TableCell className="font-mono text-xs">{cyl.numeroSerie}</TableCell>
                            <TableCell><span className="text-xs">{cyl.gas?.nombre || cyl.gas?.codigo || '—'}</span></TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{cyl.estado}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="historial">
                {loadingHistory ? (
                  <Skeleton className="h-[200px]" />
                ) : historyData.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Sin movimientos registrados</div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-xs">Gas</TableHead>
                        <TableHead className="text-xs">Mes</TableHead>
                        <TableHead className="text-xs text-right">Cantidad</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {historyData.map((h, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{h.gas}</TableCell>
                            <TableCell className="text-xs">{h.mes}</TableCell>
                            <TableCell className="text-xs text-right">{h.cantidad}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="acceso">
                {loadingAcceso ? (
                  <Skeleton className="h-[150px]" />
                ) : (
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Usuario</Label>
                        <Input value={accesoForm.usuario} onChange={(e) => setAccesoForm((p) => ({ ...p, usuario: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Contraseña {accesoData ? '(dejar vacío para mantener)' : ''}</Label>
                        <Input type="password" value={accesoForm.password} onChange={(e) => setAccesoForm((p) => ({ ...p, password: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="acceso-activo" checked={accesoForm.activo}
                        onChange={(e) => setAccesoForm((p) => ({ ...p, activo: e.target.checked }))} />
                      <Label htmlFor="acceso-activo" className="text-xs">Activo</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={guardarAcceso} disabled={loadingAcceso || !accesoForm.usuario || (!accesoForm.password && !accesoData)}>
                        <Save className="w-3 h-3 mr-1" /> Guardar
                      </Button>
                      {accesoData && (
                        <Button size="sm" variant="destructive" onClick={eliminarAcceso} disabled={loadingAcceso}>
                          <Trash2 className="w-3 h-3 mr-1" /> Eliminar acceso
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="estado">
                <div className="space-y-3 mt-2">
                  <p className="text-sm text-slate-600">
                    Estado actual: <Badge variant="outline" className={`${ESTADO_BADGE[estadoCliente(viewCliente)]} ml-1`}>{ESTADO_LABEL[estadoCliente(viewCliente)]}</Badge>
                  </p>
                  <div className="flex flex-col gap-2">
                    {viewCliente.estadoCliente !== 'ACTIVO' && (
                      <Button size="sm" variant="outline" className="justify-start text-emerald-700 border-emerald-200" onClick={() => cambiarEstadoCliente('ACTIVO')} disabled={cambiandoEstado}>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                        Reactivar cliente
                      </Button>
                    )}
                    {viewCliente.estadoCliente === 'ACTIVO' && (
                      <Button size="sm" variant="outline" className="justify-start text-amber-700 border-amber-200" onClick={() => cambiarEstadoCliente('SUSPENDIDO')} disabled={cambiandoEstado}>
                        <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                        Suspender cliente
                      </Button>
                    )}
                    {(viewCliente.estadoCliente === 'SUSPENDIDO' || viewCliente.estadoCliente === 'ACTIVO') && (
                      <Button size="sm" variant="outline" className="justify-start text-red-700 border-red-200" onClick={() => { if (confirm('¿Estás seguro? Esta acción marca al cliente como inactivo definitivamente.')) cambiarEstadoCliente('INACTIVO') }} disabled={cambiandoEstado}>
                        <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                        Marcar como inactivo (cuenta cerrada)
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 space-y-1">
                    <p>• <strong>Activo</strong> — operación normal</p>
                    <p>• <strong>Suspendido</strong> — etapa previa al cierre</p>
                    <p>• <strong>Inactivo</strong> — cuenta cerrada, ya no opera</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Crear / Editar ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs">Razón Social *</Label>
              <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre de la empresa" />
            </div>
            <div>
              <Label className="text-xs">Apellido (contacto)</Label>
              <Input value={form.apellido} onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))} placeholder="Apellido" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <Label className="text-xs">CUIT / Tax ID</Label>
              <Input value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} placeholder="XX-XXXXXXXX-X" />
            </div>
            <div>
              <Label className="text-xs">Contacto</Label>
              <Input value={form.contacto} onChange={(e) => setForm((p) => ({ ...p, contacto: e.target.value }))} placeholder="Teléfono / persona" />
            </div>
            <div>
              <Label className="text-xs">Tipología</Label>
              <Select value={form.tipologia} onValueChange={(v) => setForm((p) => ({ ...p, tipologia: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {TIPOLOGIAS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={estadoForm} onValueChange={setEstadoForm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Modo Envasado</Label>
              <Select value={form.modoEnvasado} onValueChange={(v) => setForm((p) => ({ ...p, modoEnvasado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cilindros">Cilindros</SelectItem>
                  <SelectItem value="Bloques">Bloques</SelectItem>
                  <SelectItem value="Microgranel">Microgranel</SelectItem>
                  <SelectItem value="Granel">Granel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Gases Consumo</Label>
              <Input value={form.gasesConsumo} onChange={(e) => setForm((p) => ({ ...p, gasesConsumo: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Stock Crítico</Label>
              <Input type="number" value={form.nivelesStockCritico} onChange={(e) => setForm((p) => ({ ...p, nivelesStockCritico: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Contrato Comodato</Label>
              <Input value={form.contratoComodato} onChange={(e) => setForm((p) => ({ ...p, contratoComodato: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Venc. Contrato</Label>
              <Input type="date" value={form.fechaVencimientoContrato} onChange={(e) => setForm((p) => ({ ...p, fechaVencimientoContrato: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Ubicaciones</Label>
              <Input value={form.ubicaciones} onChange={(e) => setForm((p) => ({ ...p, ubicaciones: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notas</Label>
              <Input value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveCliente} disabled={!form.nombre.trim()}>
              <Save className="w-4 h-4 mr-1" /> {editId ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Reportes ── */}
      <Dialog open={reportesOpen} onOpenChange={setReportesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Reportes de Clientes
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Total', stats.total, 'text-slate-700 bg-slate-100'],
              ['Activos', stats.activos, 'text-emerald-700 bg-emerald-50'],
              ['Suspendidos', stats.suspendidos, 'text-amber-700 bg-amber-50'],
              ['Inactivos', stats.inactivos, 'text-slate-500 bg-slate-100'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className={`rounded-lg p-4 text-center ${cls}`}>
                <div className="text-2xl font-bold">{val as number}</div>
                <div className="text-xs mt-1">{label as string}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4 text-center bg-indigo-50 text-indigo-700">
            <div className="text-2xl font-bold">{stats.cilindros}</div>
            <div className="text-xs mt-1">Cilindros en circulación</div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Configuración ── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> Configuración
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Items por página</Label>
              <p className="text-sm text-slate-600">{pageSize}</p>
              <p className="text-[10px] text-slate-400">Fijo a 12 para mantener 4×3 en el grid</p>
            </div>
            <div>
              <Label className="text-xs">Columnas en grid</Label>
              <p className="text-sm text-slate-600">4 (responsive: 1→2→3→4)</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
