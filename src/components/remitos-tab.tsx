'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit3, Trash2, X, Receipt, Save, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { Cylinder, Gas } from '@/lib/tab-types'
import { formatDate, SgaBadge, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/tab-constants'

interface RemitoItemData {
  id?: string
  cylinderId?: string
  numeroSerie?: string
  gasId: string
  gasCodigo: string
  tipoOperacion: string
  cantidad: number
  fechaDevolucion?: string
  diasAlquiler?: number
  precioUnitario?: number
  subtotal?: number
}

interface Remito {
  id: string
  numero: number
  clienteId: string
  cliente: string
  fecha: string
  tipo: string
  estado: string
  tecnico?: string
  observaciones?: string
  facturaId?: string | null
  items: RemitoItemData[]
}

export default function RemitosTab() {
  const { toast } = useToast()
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')

  // Factura desde remito
  const [facturaDialog, setFacturaDialog] = useState(false)
  const [facturarRemito, setFacturarRemito] = useState<Remito | null>(null)
  const [facturando, setFacturando] = useState(false)
  const [facturaPrecios, setFacturaPrecios] = useState<Record<string, number>>({})

  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState('ENTREGA')
  const [tecnico, setTecnico] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<any[]>([{ gasId: '', gasCodigo: '', tipoOperacion: 'ALQUILER', cantidad: 1 }])

  function resetForm() {
    setClienteId(''); setTipo('ENTREGA'); setTecnico(''); setObservaciones('')
    setItems([{ gasId: '', gasCodigo: '', tipoOperacion: 'ALQUILER', cantidad: 1 }])
    setEditingId(null)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, cRes, gRes, cylRes] = await Promise.all([
        fetch('/api/remitos'), fetch('/api/clientes'), fetch('/api/gases'), fetch('/api/cylinders'),
      ])
      const rData = await rRes.json(); setRemitos(Array.isArray(rData) ? rData : [])
      const cData = await cRes.json(); setClientes(Array.isArray(cData) ? cData : [])
      const gData = await gRes.json(); setGases(Array.isArray(gData) ? gData : [])
      const cylData = await cylRes.json(); setCylinders(Array.isArray(cylData) ? cylData : [])
    } catch { toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' }) }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function guardar() {
    if (!clienteId) { toast({ title: 'Error', description: 'Seleccioná un cliente', variant: 'destructive' }); return }
    const cliente = clientes.find((c: any) => c.id === clienteId)
    const payload = { clienteId, cliente: cliente?.nombre || '', tipo, tecnico, observaciones, items: items.filter((i) => i.gasId) }
    try {
      if (editingId) {
        await fetch(`/api/remitos/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/remitos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      toast({ title: 'OK', description: editingId ? 'Remito actualizado' : 'Remito creado' })
      setShowForm(false); resetForm(); load()
    } catch { toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' }) }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este remito?')) return
    try {
      await fetch(`/api/remitos/${id}`, { method: 'DELETE' })
      toast({ title: 'Eliminado' }); load()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  function openEdit(r: Remito) {
    setClienteId(r.clienteId); setTipo(r.tipo); setTecnico(r.tecnico || ''); setObservaciones(r.observaciones || '')
    setItems(r.items.map((i) => ({ ...i, cylinderId: i.cylinderId || '', numeroSerie: i.numeroSerie || '' })))
    setEditingId(r.id); setShowForm(true)
  }

  const clienteSel = clientes.find((c: any) => c.id === clienteId)
  const filtrados = remitos.filter((r) => (filtroTipo === 'all' || r.tipo === filtroTipo) && (filtroEstado === 'all' || r.estado === filtroEstado))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="ENTREGA">Entrega</option>
            <option value="DEVOLUCION">Devolución</option>
            <option value="CAMBIO">Cambio</option>
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="COMPLETADO">Completado</option>
            <option value="PARCIAL">Parcial</option>
          </select>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="w-4 h-4 mr-1" />Nuevo Remito</Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay remitos registrados</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Remito N°</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">#{r.numero}</TableCell>
                  <TableCell>{r.cliente}</TableCell>
                  <TableCell className="text-sm text-slate-500">{new Date(r.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.tipo === 'DEVOLUCION' ? 'secondary' : r.tipo === 'CAMBIO' ? 'outline' : 'default'}>{r.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.estado === 'COMPLETADO' ? 'default' : r.estado === 'PARCIAL' ? 'secondary' : 'outline'}>{r.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.facturaId ? (
                      <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200">
                        Facturado
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{r.items?.length || 0}</TableCell>
                  <TableCell className="text-right">
                    {!r.facturaId && (
                      <Button variant="outline" size="sm" className="mr-1 h-7 text-xs text-orange-600 border-orange-300" onClick={() => {
                        setFacturarRemito(r)
                        const precios: Record<string, number> = {}
                        r.items.forEach((it) => {
                          if (it.precioUnitario) precios[it.id || it.gasCodigo] = Number(it.precioUnitario)
                        })
                        setFacturaPrecios(precios)
                        setFacturaDialog(true)
                      }}>
                        <Receipt className="w-3 h-3 mr-1" /> Facturar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit3 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => eliminar(r.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Remito' : 'Nuevo Remito'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Tipo</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="ENTREGA">Entrega</option>
                  <option value="DEVOLUCION">Devolución</option>
                  <option value="CAMBIO">Cambio</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Técnico</Label>
                <Input value={tecnico} onChange={(e) => setTecnico(e.target.value)} placeholder="Nombre del técnico" />
              </div>
              <div>
                <Label>Gas / Cilindro</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={items[0]?.gasId || ''} onChange={(e) => {
                  const gas = gases.find((g) => g.id === e.target.value)
                  const newItems = [{ gasId: e.target.value, gasCodigo: gas?.codigo || '', tipoOperacion: 'ALQUILER', cantidad: 1 }]
                  setItems(newItems)
                }}>
                  <option value="">Seleccionar gas...</option>
                  {gases.map((g) => <option key={g.id} value={g.id}>{g.nombre} ({g.codigo})</option>)}
                </select>
              </div>
            </div>
            {items[0]?.gasId && (
              <div className="border rounded-lg p-3 bg-slate-50">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <span>Items del remito</span>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <select className="border rounded px-2 py-1 text-sm flex-1" value={it.tipoOperacion} onChange={(e) => {
                      const newItems = [...items]; newItems[idx].tipoOperacion = e.target.value; setItems(newItems)
                    }}>
                      <option value="ALQUILER">Alquiler</option>
                      <option value="VENTA">Venta</option>
                      <option value="CAMBIO">Cambio</option>
                      <option value="DEVOLUCION">Devolución</option>
                    </select>
                    <Input type="number" min={1} className="w-20 text-sm" value={it.cantidad} onChange={(e) => {
                      const newItems = [...items]; newItems[idx].cantidad = parseInt(e.target.value) || 1; setItems(newItems)
                    }} />
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (items.length > 1) { const newItems = items.filter((_, i) => i !== idx); setItems(newItems) }
                    }}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-1" onClick={() => setItems([...items, { gasId: items[0]?.gasId || '', gasCodigo: items[0]?.gasCodigo || '', tipoOperacion: 'ALQUILER', cantidad: 1 }])}>
                  + Agregar item
                </Button>
              </div>
            )}
            <div>
              <Label>Observaciones</Label>
              <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
            <div className="text-sm text-slate-500">
              {clienteSel && <span>Estado cuenta: <strong>{clienteSel.estadoCuenta || 'N/D'}</strong></span>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={guardar}>{editingId ? 'Actualizar' : 'Crear Remito'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Facturar desde Remito */}
      <Dialog open={facturaDialog} onOpenChange={(o) => { if (!o) { setFacturaDialog(false); setFacturarRemito(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              Facturar Remito #{facturarRemito?.numero}
            </DialogTitle>
          </DialogHeader>
          {facturarRemito && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-slate-500">Cliente:</span>{' '}
                <span className="font-medium">{facturarRemito.cliente}</span>
                <span className="ml-4 text-slate-500">Fecha:</span>{' '}
                <span className="font-medium">{new Date(facturarRemito.fecha).toLocaleDateString()}</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-500">Gas</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500">Operación</th>
                      <th className="text-center px-3 py-2 text-xs text-slate-500">Cant</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500">Precio Unit.</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturarRemito.items.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{it.gasCodigo}</td>
                        <td className="px-3 py-2 text-xs">{it.tipoOperacion}</td>
                        <td className="px-3 py-2 text-center text-xs">{it.cantidad}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-24 text-xs text-right border rounded px-1.5 py-0.5"
                            value={facturaPrecios[it.id || it.gasCodigo] ?? 0}
                            onChange={(e) => {
                              setFacturaPrecios((prev) => ({
                                ...prev,
                                [it.id || it.gasCodigo]: parseFloat(e.target.value) || 0,
                              }))
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          ${((facturaPrecios[it.id || it.gasCodigo] ?? 0) * it.cantidad).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right text-sm font-bold">
                Total: ${facturarRemito.items.reduce((s, it) => s + ((facturaPrecios[it.id || it.gasCodigo] ?? 0) * it.cantidad), 0).toLocaleString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFacturaDialog(false); setFacturarRemito(null) }}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!facturarRemito) return
                setFacturando(true)
                try {
                  const items = facturarRemito.items.map((it) => ({
                    concepto: `${it.tipoOperacion === 'VENTA' ? 'Venta' : 'Alquiler'} ${it.gasCodigo}${it.numeroSerie ? ` - ${it.numeroSerie}` : ''}`,
                    tipo: it.tipoOperacion === 'VENTA' ? 'GAS' : 'ALQUILER',
                    remitoItemId: it.id,
                    cylinderId: it.cylinderId || null,
                    numeroSerie: it.numeroSerie || null,
                    cantidad: it.cantidad,
                    precioUnitario: facturaPrecios[it.id || it.gasCodigo] ?? 0,
                    subtotal: (facturaPrecios[it.id || it.gasCodigo] ?? 0) * it.cantidad,
                  }))
                  const total = items.reduce((s, it) => s + it.subtotal, 0)
                  const res = await fetch('/api/facturas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      clienteId: facturarRemito.clienteId,
                      cliente: facturarRemito.cliente,
                      remitoIds: [facturarRemito.id],
                      items,
                      subtotal: total,
                      total,
                      totalGeneral: total,
                      estado: 'PENDIENTE',
                    }),
                  })
                  if (!res.ok) throw new Error()
                  toast({ title: 'Factura creada', description: `Remito #${facturarRemito.numero} facturado correctamente` })
                  setFacturaDialog(false)
                  setFacturarRemito(null)
                  load()
                } catch {
                  toast({ title: 'Error', description: 'No se pudo crear la factura', variant: 'destructive' })
                }
                setFacturando(false)
              }}
              disabled={facturando}
            >
              <Save className="w-4 h-4 mr-1" /> {facturando ? 'Creando...' : 'Crear Factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
