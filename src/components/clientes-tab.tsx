'use client'

import { useState, useEffect, useCallback } from 'react'
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
  FlaskConical,
  Truck,
  FileText,
  DollarSign,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { useToast } from '@/hooks/use-toast'
import { Cliente, Cylinder } from '@/lib/tab-types'
import {
  TIPOLOGIAS,
  ESTADO_CUENTA_OPTS,
  formatDate,
  SgaBadge,
  ESTADO_COLORS,
  ESTADO_LABELS,
  daysUntil,
} from '@/lib/tab-constants'

export default function ClientesTab() {
  const { toast } = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroTipologia, setFiltroTipologia] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')

  // Dialogs: tubos del cliente / historial
  const [viewCylindersCliente, setViewCylindersCliente] = useState<Cliente | null>(null)
  const [cylindersForCliente, setCylindersForCliente] = useState<Cylinder[]>([])
  const [loadingCylinders, setLoadingCylinders] = useState(false)
  const [viewHistoryCliente, setViewHistoryCliente] = useState<Cliente | null>(null)
  const [historyData, setHistoryData] = useState<{ gas: string; mes: string; cantidad: number }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Acceso dialog
  const [viewAccesoCliente, setViewAccesoCliente] = useState<Cliente | null>(null)
  const [accesoData, setAccesoData] = useState<{ id: string; usuario: string; activo: boolean } | null>(null)
  const [accesoForm, setAccesoForm] = useState({ usuario: '', password: '', activo: true })
  const [loadingAcceso, setLoadingAcceso] = useState(false)

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
      if (accesoData) {
        const body: Record<string, unknown> = {
          usuario: accesoForm.usuario,
          activo: accesoForm.activo,
        }
        if (accesoForm.password) body.password = accesoForm.password
        await fetch(`/api/clientes-acceso/${accesoData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/clientes-acceso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: viewAccesoCliente.id,
            usuario: accesoForm.usuario,
            password: accesoForm.password,
          }),
        })
      }
      await loadAcceso(viewAccesoCliente.id)
      toast({ title: accesoData ? 'Acceso actualizado' : 'Acceso creado' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el acceso', variant: 'destructive' })
    } finally { setLoadingAcceso(false) }
  }

  async function eliminarAcceso() {
    if (!accesoData || !confirm('¿Eliminar el acceso de este cliente?')) return
    setLoadingAcceso(true)
    try {
      await fetch(`/api/clientes-acceso/${accesoData.id}`, { method: 'DELETE' })
      setAccesoData(null)
      setAccesoForm({ usuario: '', password: '', activo: true })
      toast({ title: 'Acceso eliminado' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    } finally { setLoadingAcceso(false) }
  }

  async function loadCylindersForCliente(clienteId: string) {
    setLoadingCylinders(true)
    try {
      const res = await fetch(`/api/cylinders?clienteId=${encodeURIComponent(clienteId)}`)
      const data = await res.json()
      setCylindersForCliente(Array.isArray(data) ? data : [])
    } catch { setCylindersForCliente([]) }
    finally { setLoadingCylinders(false) }
  }

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

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const emptyForm = {
    nombre: '',
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

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroNombre) params.set('nombre', filtroNombre)
      if (filtroTipologia !== 'all') params.set('tipologia', filtroTipologia)
      if (filtroEstado === 'activos') params.set('activo', 'true')
      if (filtroEstado === 'inactivos') params.set('activo', 'false')
      const res = await fetch(`/api/clientes?${params}`)
      const data = await res.json()
      setClientes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filtroNombre, filtroTipologia, filtroEstado])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  function openCreate() {
    setEditId(null)
    setForm({ ...emptyForm, modoEnvasado: 'Cilindros' })
    setDialogOpen(true)
  }

  function openEdit(c: Cliente) {
    setEditId(c.id)
    setForm({
      nombre: c.nombre,
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
    setDialogOpen(true)
  }

  async function saveCliente() {
    try {
      const url = editId ? `/api/clientes/${editId}` : '/api/clientes'
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

  const ESTADO_CUENTA_COLORS: Record<string, string> = {
    AL_DIA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDIENTE: 'bg-amber-100 text-amber-700 border-amber-200',
    MOROSO: 'bg-red-100 text-red-700 border-red-200',
  }

  const ESTADO_CUENTA_LABELS: Record<string, string> = {
    AL_DIA: 'Al día',
    PENDIENTE: 'Pendiente',
    MOROSO: 'Moroso',
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs flex items-center gap-1">
                <Search className="w-3 h-3" /> Nombre o razón social
              </Label>
              <Input
                placeholder="Buscar cliente..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
            </div>
            <div className="min-w-[180px]">
              <Label className="text-xs">Tipología</Label>
              <Select value={filtroTipologia} onValueChange={setFiltroTipologia}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tipologías</SelectItem>
                  {TIPOLOGIAS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 ml-auto"
            >
              <Plus className="w-4 h-4 mr-1" /> Nuevo Cliente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Base de Clientes
              </CardTitle>
              <CardDescription>
                {loading
                  ? 'Cargando...'
                  : `${clientes.length} cliente(s) encontrado(s)`}
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
          ) : clientes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No se encontraron clientes
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-48">Razón Social</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead>Tipología</TableHead>
                    <TableHead className="text-center">Cilindros</TableHead>
                    <TableHead>Gases</TableHead>
                    <TableHead className="text-center">Stock Crítico</TableHead>
                    <TableHead>Estado Cuenta</TableHead>
                    <TableHead className="text-center">Acceso</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {c.nombre}
                            </div>
                            {c.contacto && (
                              <div className="text-xs text-slate-500">
                                <Contact className="w-3 h-3 inline mr-1" />
                                {c.contacto}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {c.taxId || '—'}
                      </TableCell>
                      <TableCell>
                        {c.tipologia ? (
                          <Badge variant="outline" className="text-xs bg-slate-50">
                            {c.tipologia}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold tabular-nums">
                          {c._count?.cylinders || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[180px] truncate">
                        {c.gasesConsumo || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.nivelesStockCritico != null ? (
                          <span className="font-medium tabular-nums">
                            {c.nivelesStockCritico}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {c.estadoCuenta ? (
                          <Badge
                            className={`text-xs border ${ESTADO_CUENTA_COLORS[c.estadoCuenta] || 'bg-slate-100 text-slate-600'}`}
                          >
                            {ESTADO_CUENTA_LABELS[c.estadoCuenta] || c.estadoCuenta}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600"
                            onClick={() => { setViewAccesoCliente(c); loadAcceso(c.id) }}
                            title="Gestionar credenciales de acceso">
                            <Key className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-600"
                            onClick={() => { setViewCylindersCliente(c); loadCylindersForCliente(c.id) }}
                            title="Ver tubos del cliente">
                            <Package className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600"
                            onClick={() => { setViewHistoryCliente(c); loadHistoryForCliente(c.id) }}
                            title="Historial de uso por gas/mes">
                            <History className="w-4 h-4" />
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
                            onClick={() => removeCliente(c)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de creación/edición */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? `Modificando ${form.nombre}`
                : 'Complete el perfil técnico y comercial del cliente'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* IDENTIFICACIÓN */}
            <div className="col-span-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <Building2 className="w-4 h-4" /> Identificación y Contacto
              </h3>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Nombre / Razón Social *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Razón social del cliente"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs flex items-center gap-1">
                <Hash className="w-3 h-3" /> Tax ID / CUIT
              </Label>
              <Input
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="30-12345678-9"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs flex items-center gap-1">
                <Contact className="w-3 h-3" /> Persona de Contacto
              </Label>
              <Input
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                placeholder="Nombre del contacto / receptor autorizado"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Firma Digital del Receptor</Label>
              <Input
                value={form.firmaDigital}
                onChange={(e) => setForm({ ...form, firmaDigital: e.target.value })}
                placeholder="Registro digital de aceptación"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Ubicaciones de Entrega</Label>
              <Input
                value={form.ubicaciones}
                onChange={(e) => setForm({ ...form, ubicaciones: e.target.value })}
                placeholder="Direcciones o coordenadas de plantas, tiendas o puntos de entrega"
              />
            </div>

            {/* PERFIL TÉCNICO */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <FlaskConical className="w-4 h-4" /> Perfil Técnico (Segmentación)
              </h3>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Tipología de Cliente</Label>
              <Select
                value={form.tipologia}
                onValueChange={(v) => setForm({ ...form, tipologia: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipología" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOLOGIAS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Procesos de Soldadura</Label>
              <Input
                value={form.procesoSoldadura}
                onChange={(e) => setForm({ ...form, procesoSoldadura: e.target.value })}
                placeholder="TIG, MIG/MAG, Oxicorte, Electrodo"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Materiales Base</Label>
              <Input
                value={form.materialesBase}
                onChange={(e) => setForm({ ...form, materialesBase: e.target.value })}
                placeholder="Acero, inoxidable, aluminio + espesores"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Parámetros de Ingeniería</Label>
              <Input
                value={form.parametrosIngenieria}
                onChange={(e) => setForm({ ...form, parametrosIngenieria: e.target.value })}
                placeholder="Homologaciones WPS críticas"
              />
            </div>

            {/* LOGÍSTICA Y SUMINISTRO */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <Truck className="w-4 h-4" /> Logística y Suministro
              </h3>
            </div>
            <div>
              <Label className="text-xs">Modo de Envasado</Label>
              <Select
                value={form.modoEnvasado}
                onValueChange={(v) => setForm({ ...form, modoEnvasado: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cilindros">Cilindros individuales</SelectItem>
                  <SelectItem value="Bloques">Bloques</SelectItem>
                  <SelectItem value="Microgranel">Microgranel</SelectItem>
                  <SelectItem value="Granel">Granel líquido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nivel de Stock Crítico</Label>
              <Input
                type="number"
                min="0"
                value={form.nivelesStockCritico}
                onChange={(e) => setForm({ ...form, nivelesStockCritico: e.target.value })}
                placeholder="Cantidad mínima para alerta"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Gases de Consumo</Label>
              <Input
                value={form.gasesConsumo}
                onChange={(e) => setForm({ ...form, gasesConsumo: e.target.value })}
                placeholder="AR, MIX-7525, CO2, O2, C2H2..."
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Servicios Especializados</Label>
              <Input
                value={form.serviciosEspecializados}
                onChange={(e) => setForm({ ...form, serviciosEspecializados: e.target.value })}
                placeholder="CryoEase®, Maxx®, Integra®"
              />
            </div>

            {/* COMODATOS */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <FileText className="w-4 h-4" /> Gestión de Comodatos
              </h3>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">N° Contrato de Comodato</Label>
              <Input
                value={form.contratoComodato}
                onChange={(e) => setForm({ ...form, contratoComodato: e.target.value })}
                placeholder="Número de contrato"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Vencimiento de Contrato</Label>
              <Input
                type="date"
                value={form.fechaVencimientoContrato}
                onChange={(e) => setForm({ ...form, fechaVencimientoContrato: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Activos en Posesión</Label>
              <Input
                value={form.activosEnPosesion}
                onChange={(e) => setForm({ ...form, activosEnPosesion: e.target.value })}
                placeholder="Números de serie o IDs de cilindros en poder del cliente"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Historial de Devoluciones</Label>
              <Input
                value={form.historialDevoluciones}
                onChange={(e) => setForm({ ...form, historialDevoluciones: e.target.value })}
                placeholder="Registro de activos devueltos"
              />
            </div>

            {/* CONTROL FINANCIERO */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <DollarSign className="w-4 h-4" /> Control Financiero
              </h3>
            </div>
            <div>
              <Label className="text-xs">Estado de Cuenta</Label>
              <Select
                value={form.estadoCuenta}
                onValueChange={(v) => setForm({ ...form, estadoCuenta: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AL_DIA">Al día</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="MOROSO">Moroso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Penalizaciones por Extravío</Label>
              <Input
                value={form.penalizacionesExtravio}
                onChange={(e) => setForm({ ...form, penalizacionesExtravio: e.target.value })}
                placeholder="Cargos por cilindros no devueltos"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Cargos Recurrentes</Label>
              <Input
                value={form.cargosRecurrentes}
                onChange={(e) => setForm({ ...form, cargosRecurrentes: e.target.value })}
                placeholder="Facturación automática por alquiler o mantenimiento"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notas / Observaciones</Label>
              <Input
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Información adicional del cliente"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={saveCliente}
              disabled={!form.nombre.trim()}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tubos del cliente */}
      <Dialog open={!!viewCylindersCliente} onOpenChange={(o) => { if (!o) setViewCylindersCliente(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-600" />
              Tubos de {viewCylindersCliente?.nombre}
            </DialogTitle>
          </DialogHeader>
          {loadingCylinders ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : cylindersForCliente.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              Este cliente no tiene tubos asignados
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Serie</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>PH</TableHead>
                    <TableHead>Ubicación</TableHead>
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

      {/* Dialog: Historial de uso por gas/mes */}
      <Dialog open={!!viewHistoryCliente} onOpenChange={(o) => { if (!o) setViewHistoryCliente(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" />
              Historial de uso — {viewHistoryCliente?.nombre}
            </DialogTitle>
            <DialogDescription>Movimientos de tubos agrupados por gas, mes y año</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              Sin movimientos registrados
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gas</TableHead>
                    <TableHead className="text-center">Mes / Año</TableHead>
                    <TableHead className="text-right">Movimientos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-2"><span className="text-sm font-medium">{h.gas}</span></div></TableCell>
                      <TableCell className="text-center font-mono text-sm">{h.mes}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono tabular-nums">{h.cantidad}</Badge>
                      </TableCell>
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
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Acceso de {viewAccesoCliente?.nombre}
            </DialogTitle>
            <DialogDescription>
              {accesoData ? 'Modificar o eliminar las credenciales de inicio de sesión' : 'Crear credenciales para que el cliente acceda al portal'}
            </DialogDescription>
          </DialogHeader>
          {loadingAcceso ? (
            <div className="py-8 text-center text-slate-400">Cargando...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Usuario</Label>
                <Input value={accesoForm.usuario} onChange={(e) => setAccesoForm(f => ({ ...f, usuario: e.target.value }))}
                  placeholder="nombre de usuario" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">{accesoData ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}</Label>
                <Input type="password" value={accesoForm.password} onChange={(e) => setAccesoForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={accesoData ? '•••••••• (dejar vacío)' : '••••••••'} className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres</p>
              </div>
              {accesoData && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="accesoActivo" checked={accesoForm.activo}
                    onChange={(e) => setAccesoForm(f => ({ ...f, activo: e.target.checked }))}
                    className="rounded border-slate-300" />
                  <Label htmlFor="accesoActivo" className="text-xs">Cuenta activa</Label>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <div>
                  {accesoData && (
                    <Button variant="destructive" size="sm" onClick={eliminarAcceso} disabled={loadingAcceso}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar acceso
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewAccesoCliente(null)}>Cancelar</Button>
                  <Button size="sm" onClick={guardarAcceso} disabled={!accesoForm.usuario || (!accesoData && !accesoForm.password) || loadingAcceso}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90">
                    <Save className="w-3.5 h-3.5 mr-1" /> {accesoData ? 'Actualizar' : 'Crear acceso'}
                  </Button>
                </div>
              </div>
              {accesoData && (
                <p className="text-xs text-slate-400 text-center pt-2 border-t">
                  Usuario actual: <strong>{accesoData.usuario}</strong> — {accesoData.activo ? 'Activo' : 'Inactivo'}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
