'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { SgaBadge } from '@/lib/tab-constants'
import type { Gas, Location } from '@/lib/tab-types'

const LocationPicker = dynamic(() => import('@/components/location-picker'), { ssr: false })

const TABLAS_DISPONIBLES = [
  { key: 'gases', label: 'Gases', icon: 'FlaskConical' },
  { key: 'locations', label: 'Ubicaciones', icon: 'MapPin' },
  { key: 'usuarios', label: 'Usuarios', icon: 'Users' },
  { key: 'alertconfig', label: 'Alertas', icon: 'Bell' },
  { key: 'operaciones-pedido', label: 'Operaciones Pedido', icon: 'ShoppingCart' },
] as const

export default function TablasTab() {
  const { toast } = useToast()
  const [tablaActiva, setTablaActiva] = useState('gases')
  const [gases, setGases] = useState<Gas[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Gases form
  const emptyGas = { codigo: '', nombre: '', descripcion: '', presionBar: '200', colorHex: '#cccccc', usoPrincipal: '', categoria: '', peligro: 'GAS_PRESION' }
  const [gasForm, setGasForm] = useState(emptyGas)

  // Locations form
  const emptyLoc = { nombre: '', provincia: '', lat: '', lng: '', tipo: 'BASE', esBase: false, direccion: '', telefono: '' }
  const [locForm, setLocForm] = useState(emptyLoc)

  // Alert form (usa campos de AlertConfig: diasAlertaRetest, diasMaxCliente, alertaPH, activo)
  const emptyAlert = { gasId: '', diasAlertaRetest: '60', diasMaxCliente: '90', alertaPH: true, activo: true }
  const [alertForm, setAlertForm] = useState(emptyAlert)

  // Users form
  const emptyUsuario = { nombre: '', usuario: '', password: '', password2: '', direccion: '', telefono: '', ciudad: '', provincia: '', lat: '', lng: '', email: '', nivelAcceso: '1', activo: true }
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [userForm, setUserForm] = useState(emptyUsuario)

  // Operaciones Pedido
  const [operacionesPedido, setOperacionesPedido] = useState<any[]>([])
  const emptyOp = { nombre: '', activo: true, orden: '0' }
  const [opForm, setOpForm] = useState(emptyOp)

  async function loadAll() {
    setLoading(true)
    try {
      const [gRes, lRes, uRes, aRes, oRes] = await Promise.all([
        fetch('/api/gases'),
        fetch('/api/locations'),
        fetch('/api/usuarios'),
        fetch('/api/config-alertas'),
        fetch('/api/tipos-operacion-pedido'),
      ])
      const [gData, lData, uData, aData, oData] = await Promise.all([
        gRes.json().catch(() => []),
        lRes.json().catch(() => []),
        uRes.json().catch(() => []),
        aRes.json().catch(() => []),
        oRes.json().catch(() => []),
      ])
      setGases(Array.isArray(gData) ? gData : [])
      setLocations(Array.isArray(lData) ? lData : [])
      setUsuarios(Array.isArray(uData) ? uData : [])
      setAlerts(Array.isArray(aData) ? aData : [])
      setOperacionesPedido(Array.isArray(oData) ? oData : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  // --- Gases CRUD ---
  async function saveGas() {
    const body = { ...gasForm, presionBar: parseFloat(gasForm.presionBar) }
    try {
      const res = await fetch(`/api/gases${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: editId ? 'Gas actualizado' : 'Gas creado' })
      closeAndReload()
    } catch { toast({ title: 'Error al guardar gas', variant: 'destructive' }) }
  }

  async function deleteGas(id: string) {
    if (!confirm('¿Eliminar este gas?')) return
    try {
      const res = await fetch(`/api/gases/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Gas eliminado' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openGas(gas?: Gas) {
    if (gas) { setEditId(gas.id); setGasForm({ codigo: gas.codigo, nombre: gas.nombre, descripcion: gas.descripcion, presionBar: String(gas.presionBar), colorHex: gas.colorHex, usoPrincipal: gas.usoPrincipal, categoria: gas.categoria, peligro: gas.peligro }) }
    else { setEditId(null); setGasForm(emptyGas) }
    setDialogOpen(true)
  }

  // --- Locations CRUD ---
  async function saveLocation() {
    const body = { ...locForm, lat: parseFloat(locForm.lat), lng: parseFloat(locForm.lng) }
    try {
      const res = await fetch(`/api/locations${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: editId ? 'Ubicación actualizada' : 'Ubicación creada' })
      closeAndReload()
    } catch { toast({ title: 'Error al guardar ubicación', variant: 'destructive' }) }
  }

  async function deleteLocation(id: string) {
    if (!confirm('¿Eliminar esta ubicación?')) return
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Ubicación eliminada' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openLocation(loc?: Location) {
    if (loc) { setEditId(loc.id); setLocForm({ nombre: loc.nombre, provincia: loc.provincia, lat: String(loc.lat), lng: String(loc.lng), tipo: loc.tipo || 'BASE', esBase: loc.esBase || false, direccion: loc.direccion || '', telefono: loc.telefono || '' }) }
    else { setEditId(null); setLocForm(emptyLoc) }
    setDialogOpen(true)
  }

  // --- Usuarios CRUD ---
  async function saveUsuario() {
    if (userForm.password !== userForm.password2) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    const body: Record<string, any> = {
      nombre: userForm.nombre,
      usuario: userForm.usuario,
      direccion: userForm.direccion,
      telefono: userForm.telefono,
      ciudad: userForm.ciudad,
      provincia: userForm.provincia,
      lat: userForm.lat,
      lng: userForm.lng,
      email: userForm.email,
      nivelAcceso: userForm.nivelAcceso,
      activo: userForm.activo,
      password: userForm.password,
    }
    if (!editId) {
      if (!userForm.password) {
        toast({ title: 'La contraseña es requerida', variant: 'destructive' })
        return
      }
    }
    try {
      const res = await fetch(`/api/usuarios${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar')
      }
      toast({ title: editId ? 'Usuario actualizado' : 'Usuario creado' })
      closeAndReload()
    } catch (e: any) {
      toast({ title: e.message || 'Error al guardar usuario', variant: 'destructive' })
    }
  }

  async function deleteUsuario(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Usuario eliminado' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openUsuario(u?: any) {
    if (u) {
      setEditId(u.id)
      setUserForm({
        nombre: u.nombre || '',
        usuario: u.usuario || '',
        password: '',
        password2: '',
        direccion: u.direccion || '',
        telefono: u.telefono || '',
        ciudad: u.ciudad || '',
        provincia: u.provincia || '',
        lat: u.lat != null ? String(u.lat) : '',
        lng: u.lng != null ? String(u.lng) : '',
        email: u.email || '',
        nivelAcceso: String(u.nivelAcceso || '1'),
        activo: u.activo !== false,
      })
    } else {
      setEditId(null)
      setUserForm(emptyUsuario)
    }
    setDialogOpen(true)
  }

  // --- Alerts CRUD (usa /api/config-alertas, upsert por gasId) ---
  async function saveAlert() {
    const body = {
      gasId: alertForm.gasId,
      diasAlertaRetest: parseInt(alertForm.diasAlertaRetest),
      diasMaxCliente: parseInt(alertForm.diasMaxCliente),
      alertaPH: alertForm.alertaPH,
      activo: alertForm.activo,
    }
    try {
      const res = await fetch('/api/config-alertas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: editId ? 'Alerta actualizada' : 'Alerta creada' })
      closeAndReload()
    } catch { toast({ title: 'Error al guardar alerta', variant: 'destructive' }) }
  }

  async function deleteAlert(id: string) {
    if (!confirm('¿Eliminar esta configuración de alerta?')) return
    try {
      const res = await fetch(`/api/config-alertas/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Alerta eliminada' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openAlert(alert?: any) {
    if (alert) { setEditId(alert.id); setAlertForm({ gasId: alert.gasId, diasAlertaRetest: String(alert.diasAlertaRetest), diasMaxCliente: String(alert.diasMaxCliente), alertaPH: alert.alertaPH, activo: alert.activo }) }
    else { setEditId(null); setAlertForm(emptyAlert) }
    setDialogOpen(true)
  }

  // --- Operaciones Pedido CRUD ---
  async function saveOperacionPedido() {
    const body = { nombre: opForm.nombre, activo: opForm.activo, orden: parseInt(opForm.orden) }
    try {
      const res = await fetch('/api/tipos-operacion-pedido', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...body } : body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast({ title: editId ? 'Operación actualizada' : 'Operación creada' })
      closeAndReload()
    } catch (e: any) { toast({ title: e.message || 'Error al guardar', variant: 'destructive' }) }
  }

  async function deleteOperacionPedido(id: string) {
    if (!confirm('¿Eliminar esta operación?')) return
    try {
      const res = await fetch(`/api/tipos-operacion-pedido?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Operación eliminada' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openOperacionPedido(op?: any) {
    if (op) { setEditId(op.id); setOpForm({ nombre: op.nombre, activo: op.activo, orden: String(op.orden) }) }
    else { setEditId(null); setOpForm(emptyOp) }
    setDialogOpen(true)
  }

  function closeAndReload() {
    setDialogOpen(false)
    setEditId(null)
    loadAll()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5 text-orange-500" />
        Tablas de Referencia
      </h2>

      {/* Pestañas de tablas */}
      <div className="flex gap-1 border-b pb-1">
        {TABLAS_DISPONIBLES.map(t => (
          <button key={t.key}
            onClick={() => { setTablaActiva(t.key); setDialogOpen(false) }}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${tablaActiva === t.key ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <>
          {/* Gases */}
          {tablaActiva === 'gases' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openGas()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nuevo Gas
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Presión (Bar)</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Peligro</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gases.map(g => (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-xs font-semibold">{g.codigo}</TableCell>
                        <TableCell className="text-sm">{g.nombre}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded border" style={{ background: g.colorHex }} />
                            <span className="text-[10px] text-slate-400">{g.colorHex}</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">{g.presionBar}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{g.categoria}</Badge></TableCell>
                        <TableCell><SgaBadge peligro={g.peligro} /></TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openGas(g)}>
                              <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteGas(g.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Locations */}
          {tablaActiva === 'locations' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openLocation()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nueva Ubicación
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Lat</TableHead>
                      <TableHead>Lng</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map(loc => (
                      <TableRow key={loc.id}>
                        <TableCell className="text-sm font-medium">{loc.nombre}</TableCell>
                        <TableCell className="text-xs">{loc.provincia}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{loc.tipo}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{loc.lat}</TableCell>
                        <TableCell className="font-mono text-xs">{loc.lng}</TableCell>
                        <TableCell>{loc.esBase ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : '—'}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLocation(loc)}>
                              <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteLocation(loc.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Usuarios */}
          {tablaActiva === 'usuarios' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openUsuario()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nuevo Usuario
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead className="text-center">Nivel</TableHead>
                      <TableHead className="text-center">Activo</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs font-semibold">{u.usuario}</TableCell>
                        <TableCell className="text-sm">{u.nombre}</TableCell>
                        <TableCell className="text-xs">{u.email || '—'}</TableCell>
                        <TableCell className="text-xs">{u.ciudad || '—'}</TableCell>
                        <TableCell className="text-xs">{u.provincia || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.nivelAcceso >= 4 ? 'default' : 'outline'} className="text-[10px]">
                            {u.nivelAcceso}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{u.activo ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : <Badge className="bg-red-100 text-red-700 text-[10px]">No</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openUsuario(u)}>
                              <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteUsuario(u.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* AlertConfig */}
          {tablaActiva === 'alertconfig' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openAlert()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nueva Alerta
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gas</TableHead>
                      <TableHead className="text-right">Días Alerta Retest</TableHead>
                      <TableHead className="text-right">Días Max Cliente</TableHead>
                      <TableHead className="text-center">Alerta PH</TableHead>
                      <TableHead className="text-center">Activo</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map(a => {
                      const gas = gases.find(g => g.id === a.gasId)
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: gas?.colorHex || '#ccc' }} />
                              <span className="text-sm">{gas?.nombre || a.gasId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{a.diasAlertaRetest}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{a.diasMaxCliente}</TableCell>
                          <TableCell className="text-center">{a.alertaPH ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : '—'}</TableCell>
                          <TableCell className="text-center">{a.activo ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : <Badge className="bg-red-100 text-red-700 text-[10px]">No</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAlert(a)}>
                                <Pencil className="w-3.5 h-3.5 text-sky-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteAlert(a.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Operaciones Pedido */}
          {tablaActiva === 'operaciones-pedido' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openOperacionPedido()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nueva Operación
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-center">Orden</TableHead>
                      <TableHead className="text-center">Activo</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operacionesPedido.map(op => (
                      <TableRow key={op.id}>
                        <TableCell className="text-sm font-medium">{op.nombre}</TableCell>
                        <TableCell className="text-center font-mono">{op.orden}</TableCell>
                        <TableCell className="text-center">{op.activo ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : <Badge className="bg-red-100 text-red-700 text-[10px]">No</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openOperacionPedido(op)}>
                              <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteOperacionPedido(op.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog: formulario dinámico según tabla activa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-w-lg ${tablaActiva === 'gases' ? '' : 'max-w-md'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editId ? 'Editar' : 'Nuevo'} {TABLAS_DISPONIBLES.find(t => t.key === tablaActiva)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tablaActiva === 'gases' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Código</Label><Input value={gasForm.codigo} onChange={e => setGasForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: N2" /></div>
                  <div><Label>Nombre</Label><Input value={gasForm.nombre} onChange={e => setGasForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nitrógeno" /></div>
                </div>
                <div><Label>Descripción</Label><Input value={gasForm.descripcion} onChange={e => setGasForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Presión (Bar)</Label><Input type="number" value={gasForm.presionBar} onChange={e => setGasForm(f => ({ ...f, presionBar: e.target.value }))} /></div>
                  <div><Label>Color Hex</Label><div className="flex gap-2 items-center"><Input value={gasForm.colorHex} onChange={e => setGasForm(f => ({ ...f, colorHex: e.target.value }))} /><input type="color" value={gasForm.colorHex} onChange={e => setGasForm(f => ({ ...f, colorHex: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                  <div><Label>Categoría</Label><Select value={gasForm.categoria} onValueChange={v => setGasForm(f => ({ ...f, categoria: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alta Presión">Alta Presión</SelectItem><SelectItem value="Baja Presión">Baja Presión</SelectItem><SelectItem value="Disuelto">Disuelto</SelectItem><SelectItem value="Líquido Criogénico">Líquido Criogénico</SelectItem><SelectItem value="Mezcla">Mezcla</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Uso Principal</Label><Input value={gasForm.usoPrincipal} onChange={e => setGasForm(f => ({ ...f, usoPrincipal: e.target.value }))} /></div>
                  <div><Label>Peligro SGA</Label><Select value={gasForm.peligro} onValueChange={v => setGasForm(f => ({ ...f, peligro: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INFLAMABLE">Inflamable</SelectItem><SelectItem value="COMBURENTE">Comburente</SelectItem><SelectItem value="GAS_PRESION">Gas a Presión</SelectItem><SelectItem value="NINGUNO">Sin Riesgo</SelectItem></SelectContent></Select></div>
                </div>
              </>
            )}
            {tablaActiva === 'locations' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre</Label><Input value={locForm.nombre} onChange={e => setLocForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Base Central" /></div>
                  <div><Label>Provincia</Label><Input value={locForm.provincia} onChange={e => setLocForm(f => ({ ...f, provincia: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Latitud</Label><Input type="number" step="any" value={locForm.lat} onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))} /></div>
                  <div><Label>Longitud</Label><Input type="number" step="any" value={locForm.lng} onChange={e => setLocForm(f => ({ ...f, lng: e.target.value }))} /></div>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  {locForm.lat && locForm.lng && !isNaN(parseFloat(locForm.lat)) && !isNaN(parseFloat(locForm.lng)) ? (
                    <LocationPicker
                      lat={parseFloat(locForm.lat)}
                      lng={parseFloat(locForm.lng)}
                      onChange={(lat, lng) => setLocForm(f => ({ ...f, lat: String(lat), lng: String(lng) }))}
                    />
                  ) : (
                    <div className="h-[250px] flex items-center justify-center bg-slate-50 text-slate-400 text-sm rounded-lg">
                      Ingresá latitud y longitud para ver el mapa
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label><Select value={locForm.tipo} onValueChange={v => setLocForm(f => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BASE">Base</SelectItem><SelectItem value="CLIENTE">Cliente</SelectItem><SelectItem value="SUCURSAL">Sucursal</SelectItem><SelectItem value="ALIADO">Aliado</SelectItem></SelectContent></Select></div>
                  <div className="flex items-end pb-2">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={locForm.esBase} onChange={e => setLocForm(f => ({ ...f, esBase: e.target.checked }))} className="rounded" />
                      Es Base
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Dirección</Label><Input value={locForm.direccion} onChange={e => setLocForm(f => ({ ...f, direccion: e.target.value }))} /></div>
                  <div><Label>Teléfono</Label><Input value={locForm.telefono} onChange={e => setLocForm(f => ({ ...f, telefono: e.target.value }))} /></div>
                </div>
              </>
            )}
            {tablaActiva === 'usuarios' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre</Label><Input value={userForm.nombre} onChange={e => setUserForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" /></div>
                  <div><Label>Usuario</Label><Input value={userForm.usuario} onChange={e => setUserForm(f => ({ ...f, usuario: e.target.value }))} placeholder="nombre de usuario" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contraseña {editId ? '(dejar vacío para no cambiar)' : '*'}</Label>
                    <Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                  </div>
                  <div>
                    <Label>Confirmar contraseña</Label>
                    <Input type="password" value={userForm.password2} onChange={e => setUserForm(f => ({ ...f, password2: e.target.value }))} placeholder="••••••••" className={userForm.password && userForm.password !== userForm.password2 ? 'border-red-400' : ''} />
                  </div>
                </div>
                {userForm.password && userForm.password !== userForm.password2 && (
                  <div className="text-xs text-red-500">Las contraseñas no coinciden</div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ejemplo.com" /></div>
                  <div><Label>Teléfono</Label><Input value={userForm.telefono} onChange={e => setUserForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+54 336 4567890" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Dirección</Label><Input value={userForm.direccion} onChange={e => setUserForm(f => ({ ...f, direccion: e.target.value }))} /></div>
                  <div><Label>Ciudad</Label><Input value={userForm.ciudad} onChange={e => setUserForm(f => ({ ...f, ciudad: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Provincia</Label><Input value={userForm.provincia} onChange={e => setUserForm(f => ({ ...f, provincia: e.target.value }))} /></div>
                  <div><Label>Nivel de Acceso (1-5)</Label><Input type="number" min={1} max={5} value={userForm.nivelAcceso} onChange={e => setUserForm(f => ({ ...f, nivelAcceso: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Latitud</Label><Input type="number" step="any" value={userForm.lat} onChange={e => setUserForm(f => ({ ...f, lat: e.target.value }))} /></div>
                  <div><Label>Longitud</Label><Input type="number" step="any" value={userForm.lng} onChange={e => setUserForm(f => ({ ...f, lng: e.target.value }))} /></div>
                </div>
                <div>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={userForm.activo} onChange={e => setUserForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                    Activo
                  </Label>
                </div>
              </>
            )}
            {tablaActiva === 'alertconfig' && (
              <>
                <div><Label>Gas</Label><Select value={alertForm.gasId} onValueChange={v => setAlertForm(f => ({ ...f, gasId: v }))}><SelectTrigger><SelectValue placeholder="Seleccionar gas" /></SelectTrigger><SelectContent>{gases.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Días Alerta Retest</Label><Input type="number" value={alertForm.diasAlertaRetest} onChange={e => setAlertForm(f => ({ ...f, diasAlertaRetest: e.target.value }))} /></div>
                  <div><Label>Días Max Cliente</Label><Input type="number" value={alertForm.diasMaxCliente} onChange={e => setAlertForm(f => ({ ...f, diasMaxCliente: e.target.value }))} /></div>
                </div>
                <div className="flex items-center gap-6">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={alertForm.alertaPH} onChange={e => setAlertForm(f => ({ ...f, alertaPH: e.target.checked }))} className="rounded" />
                    Alerta PH
                  </Label>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={alertForm.activo} onChange={e => setAlertForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                    Activo
                  </Label>
                </div>
              </>
            )}
            {tablaActiva === 'operaciones-pedido' && (
              <>
                <div><Label>Nombre</Label><Input value={opForm.nombre} onChange={e => setOpForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Con envase" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Orden</Label><Input type="number" value={opForm.orden} onChange={e => setOpForm(f => ({ ...f, orden: e.target.value }))} /></div>
                  <div className="flex items-end pb-2">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={opForm.activo} onChange={e => setOpForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                      Activo
                    </Label>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
            <Button onClick={() => {
              if (tablaActiva === 'gases') saveGas()
              else if (tablaActiva === 'locations') saveLocation()
              else if (tablaActiva === 'usuarios') saveUsuario()
              else if (tablaActiva === 'alertconfig') saveAlert()
              else if (tablaActiva === 'operaciones-pedido') saveOperacionPedido()
            }}
              className="bg-gradient-to-r from-orange-500 to-red-600">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
