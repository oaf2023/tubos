'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Search, Pencil, Trash2, Building2, MapPin, Phone, Mail,
  ChevronLeft, ChevronRight, AlertCircle, User, CreditCard, Globe,
  FileText, DollarSign, Hash, Calendar,
} from 'lucide-react'

interface Proveedor {
  id: string
  codigoLegacy: number | null
  nombre: string
  nombreFantasia: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  codigoPostal: string | null
  pais: string | null
  telefono1: string | null
  telefono2: string | null
  telefono3: string | null
  telefono4: string | null
  telefono5: string | null
  email: string | null
  tipoDocumento: number | null
  tipoIva: number | null
  numeroDocumento: string | null
  habilitadoCheques: number | null
  limiteCheques: number | null
  credito: number | null
  vendedor: string | null
  diaVisita: number | null
  descuentoVto: number | null
  observacion1: string | null
  observacion2: string | null
  observacion3: string | null
  fechaAlta: string | null
  contacto: string | null
  ultimaVisita: string | null
  saldo: number | null
  descuentoRemito: number | null
  web: string | null
  listaPrecios: number | null
  condCompra: string | null
  tipo: number | null
  tipoNombre: string | null
  numeroIB: string | null
  activo: boolean
  notas: string | null
  createdAt: string
  updatedAt: string
}

const PAGE_SIZE = 12
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function ProveedoresTab() {
  const { toast } = useToast()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [letra, setLetra] = useState('TODOS')
  const [showInactivos, setShowInactivos] = useState(false)
  const [editItem, setEditItem] = useState<Proveedor | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (search) params.set('nombre', search)
      if (letra !== 'TODOS') params.set('letra', letra)
      if (!showInactivos) params.set('activo', 'true')

      const res = await fetch(`/api/proveedores?${params}`)
      if (!res.ok) throw new Error('Error al obtener proveedores')
      const data = await res.json()
      setProveedores(data.proveedores || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      toast({ title: 'Error', description: String(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, letra, showInactivos])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (data: Partial<Proveedor>) => {
    try {
      const url = editItem ? `/api/proveedores/${editItem.id}` : '/api/proveedores'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      toast({ title: editItem ? 'Proveedor actualizado' : 'Proveedor creado' })
      setShowForm(false)
      setEditItem(null)
      fetchData()
    } catch (e) {
      toast({ title: 'Error', description: String(e), variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    try {
      const res = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast({ title: 'Proveedor eliminado' })
      fetchData()
    } catch (e) {
      toast({ title: 'Error', description: String(e), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactivos}
            onChange={e => { setShowInactivos(e.target.checked); setPage(1) }}
            className="rounded"
          />
          Mostrar inactivos
        </label>
        <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Proveedor
        </Button>
      </div>

      {/* Índice alfabético */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => { setLetra('TODOS'); setPage(1) }}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${letra === 'TODOS' ? 'bg-orange-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
        >Todos</button>
        {ALPHABET.map(l => (
          <button
            key={l}
            onClick={() => { setLetra(l); setPage(1) }}
            className={`w-7 h-7 text-xs rounded-md transition-colors ${letra === l ? 'bg-orange-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >{l}</button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : proveedores.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No se encontraron proveedores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proveedores.map(p => (
            <Card key={p.id} className={`hover:shadow-md transition-shadow ${!p.activo ? 'opacity-60 border-dashed' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{p.nombre}</p>
                      {p.nombreFantasia && (
                        <p className="text-xs text-slate-400 truncate">{p.nombreFantasia}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditItem(p); setShowForm(true) }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {!p.activo && <Badge variant="secondary" className="mb-2 text-xs">Inactivo</Badge>}

                <div className="space-y-1 text-xs text-slate-500">
                  {(p.localidad || p.provincia) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{[p.localidad, p.provincia].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {(p.telefono1 || p.telefono2) && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{p.telefono1 || p.telefono2}</span>
                    </div>
                  )}
                  {p.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                  {p.numeroDocumento && (
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">CUIT: {p.numeroDocumento}</span>
                    </div>
                  )}
                  {p.contacto && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Contacto: {p.contacto}</span>
                    </div>
                  )}
                  {p.saldo != null && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 flex-shrink-0" />
                      <span className={`truncate ${p.saldo > 0 ? 'text-green-600' : p.saldo < 0 ? 'text-red-600' : ''}`}>
                        Saldo: ${p.saldo.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-500">Página {page} de {totalPages} ({total} proveedores)</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Formulario diálogo */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
            <DialogDescription>
              Complete los datos del proveedor. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <ProveedorForm initial={editItem} onSave={handleSave} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProveedorForm({ initial, onSave, onCancel }: {
  initial: Proveedor | null
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<any>({
    nombre: initial?.nombre || '',
    nombreFantasia: initial?.nombreFantasia || '',
    direccion: initial?.direccion || '',
    localidad: initial?.localidad || '',
    provincia: initial?.provincia || '',
    codigoPostal: initial?.codigoPostal || '',
    pais: initial?.pais || 'Argentina',
    telefono1: initial?.telefono1 || '',
    telefono2: initial?.telefono2 || '',
    telefono3: initial?.telefono3 || '',
    telefono4: initial?.telefono4 || '',
    telefono5: initial?.telefono5 || '',
    email: initial?.email || '',
    tipoDocumento: initial?.tipoDocumento != null ? String(initial.tipoDocumento) : '',
    tipoIva: initial?.tipoIva != null ? String(initial.tipoIva) : '',
    numeroDocumento: initial?.numeroDocumento || '',
    contacto: initial?.contacto || '',
    web: initial?.web || '',
    tipoNombre: initial?.tipoNombre || '',
    numeroIB: initial?.numeroIB || '',
    condCompra: initial?.condCompra || '',
    observacion1: initial?.observacion1 || '',
    notas: initial?.notas || '',
    activo: initial?.activo ?? true,
  })

  const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' })
      return
    }
    await onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos básicos */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-slate-700 flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Datos Básicos</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nombre / Razón Social *</Label>
            <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
          </div>
          <div>
            <Label>Nombre Fantasía</Label>
            <Input value={form.nombreFantasia} onChange={e => set('nombreFantasia', e.target.value)} />
          </div>
          <div>
            <Label>Tipo / Rubro</Label>
            <Input value={form.tipoNombre} onChange={e => set('tipoNombre', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Dirección */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-slate-700 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Dirección</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Dirección</Label>
            <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </div>
          <div>
            <Label>Localidad</Label>
            <Input value={form.localidad} onChange={e => set('localidad', e.target.value)} />
          </div>
          <div>
            <Label>Provincia</Label>
            <Input value={form.provincia} onChange={e => set('provincia', e.target.value)} />
          </div>
          <div>
            <Label>Código Postal</Label>
            <Input value={form.codigoPostal} onChange={e => set('codigoPostal', e.target.value)} />
          </div>
          <div>
            <Label>País</Label>
            <Input value={form.pais} onChange={e => set('pais', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-slate-700 flex items-center gap-1.5"><User className="w-4 h-4" /> Contacto</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Contacto</Label>
            <Input value={form.contacto} onChange={e => set('contacto', e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono 1</Label>
            <Input value={form.telefono1} onChange={e => set('telefono1', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono 2</Label>
            <Input value={form.telefono2} onChange={e => set('telefono2', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono 3</Label>
            <Input value={form.telefono3} onChange={e => set('telefono3', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono 4</Label>
            <Input value={form.telefono4} onChange={e => set('telefono4', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono 5</Label>
            <Input value={form.telefono5} onChange={e => set('telefono5', e.target.value)} />
          </div>
          <div>
            <Label>Sitio Web</Label>
            <Input value={form.web} onChange={e => set('web', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Datos impositivos */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-slate-700 flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> Datos Impositivos</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo Documento</Label>
            <Select value={form.tipoDocumento} onValueChange={v => set('tipoDocumento', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">DNI</SelectItem>
                <SelectItem value="2">CUIT</SelectItem>
                <SelectItem value="3">CUIL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo IVA</Label>
            <Select value={form.tipoIva} onValueChange={v => set('tipoIva', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">IVA Responsable Inscripto</SelectItem>
                <SelectItem value="2">IVA Responsable no Inscripto</SelectItem>
                <SelectItem value="3">IVA no Responsable</SelectItem>
                <SelectItem value="4">IVA Sujeto Exento</SelectItem>
                <SelectItem value="5">Consumidor Final</SelectItem>
                <SelectItem value="6">Monotributista</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Número Documento</Label>
            <Input value={form.numeroDocumento} onChange={e => set('numeroDocumento', e.target.value)} />
          </div>
          <div>
            <Label>Número IB</Label>
            <Input value={form.numeroIB} onChange={e => set('numeroIB', e.target.value)} />
          </div>
          <div>
            <Label>Cond. Compra</Label>
            <Input value={form.condCompra} onChange={e => set('condCompra', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-slate-700 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Notas</h4>
        <textarea
          className="w-full rounded-lg border border-slate-200 p-3 text-sm min-h-[80px] resize-y"
          value={form.notas}
          onChange={e => set('notas', e.target.value)}
          placeholder="Notas adicionales..."
        />
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="activo"
          checked={form.activo}
          onChange={e => set('activo', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="activo" className="text-sm">Proveedor activo</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
          {initial ? 'Guardar Cambios' : 'Crear Proveedor'}
        </Button>
      </DialogFooter>
    </form>
  )
}
