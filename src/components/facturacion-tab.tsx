'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Receipt,
  Edit3,
  Trash2,
  RefreshCw,
  Calendar,
  X,
  Save,
  Clock,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ComprobantesHistoricos from '@/components/comprobantes-historicos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Gas, Cliente } from '@/lib/tab-types'
import { formatDate } from '@/lib/tab-constants'

// ===== Types =====
interface FacturaItem {
  id?: string
  concepto: string
  tipo?: string
  remitoItemId?: string
  cylinderId?: string
  numeroSerie?: string
  diasFacturados?: number
  cantidad: number
  precioUnitario: number
  subtotal: number
}

interface Factura {
  id: string; numero: number; clienteId: string; cliente: string
  fecha: string; fechaVencimiento?: string
  fechaDesde?: string; fechaHasta?: string; tipoPeriodo?: string
  remitoIds: string
  subtotal?: number; descuento?: number; impuestos?: number
  total: number; estado: string
  saldoAnterior?: number; notasCredito?: number; pagosAplicados?: number
  totalGeneral?: number
  observaciones?: string
  items: FacturaItem[]
}

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
  id: string; numero: number; clienteId: string; cliente: string; fecha: string
  tipo: string; estado: string; tecnico?: string; observaciones?: string
  facturaId?: string | null
  items: RemitoItemData[]
}

// ===== Invoice Preview Component =====
function InvoicePreview({ factura }: { factura: Factura }) {
  const totalGral = factura.totalGeneral ?? factura.total
  const subtotal = factura.subtotal ?? factura.total
  const desc = factura.descuento ?? 0

  const itemsGrouped = {
    ALQUILER: factura.items.filter((i) => (i.tipo || 'ALQUILER') === 'ALQUILER'),
    GAS: factura.items.filter((i) => i.tipo === 'GAS'),
    OTRO: factura.items.filter((i) => i.tipo !== 'GAS' && (i.tipo || 'ALQUILER') !== 'ALQUILER'),
  }

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">BORRADOR DE FACTURA</h2>
        <p className="text-xs text-slate-400">Documento interno - No válido como comprobante fiscal</p>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-0.5">
        <span className="font-semibold text-sm block mb-1">A. Datos del emisor</span>
        <div className="grid grid-cols-2 gap-1 text-slate-600">
          <span>Razón social: Control Digital ManejaDatos Districon</span>
          <span>San Nicolás de los Arroyos, Buenos Aires</span>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-0.5">
        <span className="font-semibold text-sm block mb-1">B. Datos del cliente</span>
        <div className="grid grid-cols-2 gap-1 text-slate-600">
          <span>Cliente: {factura.cliente}</span>
          <span>Factura N°: {factura.numero}</span>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-0.5">
        <span className="font-semibold text-sm block mb-1">C. Período facturado</span>
        <div className="grid grid-cols-3 gap-1 text-slate-600">
          <span>Desde: {factura.fechaDesde ? new Date(factura.fechaDesde).toLocaleDateString() : '-'}</span>
          <span>Hasta: {factura.fechaHasta ? new Date(factura.fechaHasta).toLocaleDateString() : '-'}</span>
          <span>Tipo: {factura.tipoPeriodo || 'No especificado'}</span>
          <span>Emisión: {new Date(factura.fecha).toLocaleDateString()}</span>
          <span>Vencimiento: {factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString() : '-'}</span>
        </div>
      </div>

      <div>
        <span className="font-semibold text-sm block mb-1">D. Detalle de conceptos</span>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Ítem</TableHead>
                <TableHead className="text-[10px]">Concepto</TableHead>
                <TableHead className="text-[10px] w-16">N° Serie</TableHead>
                <TableHead className="text-[10px] w-12">Días</TableHead>
                <TableHead className="text-[10px] w-14 text-center">Cant</TableHead>
                <TableHead className="text-[10px] w-20 text-right">P.Unit</TableHead>
                <TableHead className="text-[10px] w-20 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factura.items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell className="text-[10px]">{i + 1}</TableCell>
                  <TableCell className="text-xs">{it.concepto}</TableCell>
                  <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                  <TableCell className="text-center text-xs">{it.diasFacturados || '-'}</TableCell>
                  <TableCell className="text-center text-xs">{it.cantidad}</TableCell>
                  <TableCell className="text-right text-xs font-mono">${it.precioUnitario.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs font-mono">${it.subtotal.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {itemsGrouped.ALQUILER.length > 0 && (
        <div>
          <span className="font-semibold text-sm block mb-1">E. Detalle de alquiler por tubo</span>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Tubo</TableHead>
                  <TableHead className="text-[10px]">Concepto</TableHead>
                  <TableHead className="text-[10px] text-center">Días</TableHead>
                  <TableHead className="text-[10px] text-right">Tarifa</TableHead>
                  <TableHead className="text-[10px] text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsGrouped.ALQUILER.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                    <TableCell className="text-xs">{it.concepto}</TableCell>
                    <TableCell className="text-center text-xs">{it.diasFacturados || '-'}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${(it.precioUnitario / (it.diasFacturados || 1)).toFixed(2)}/d</TableCell>
                    <TableCell className="text-right text-xs font-mono">${it.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {itemsGrouped.GAS.length > 0 && (
        <div>
          <span className="font-semibold text-sm block mb-1">F. Gases facturados</span>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Gas</TableHead>
                  <TableHead className="text-[10px]">Concepto</TableHead>
                  <TableHead className="text-[10px] w-14">Cant</TableHead>
                  <TableHead className="text-[10px] w-20 text-right">P.Unit</TableHead>
                  <TableHead className="text-[10px] w-20 text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsGrouped.GAS.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                    <TableCell className="text-xs">{it.concepto}</TableCell>
                    <TableCell className="text-center text-xs">{it.cantidad}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${it.precioUnitario.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${it.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div>
        <span className="font-semibold text-sm block mb-1">I. Resumen financiero</span>
        <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal (período)</span>
            <span className="font-mono">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Descuento</span>
            <span className="font-mono text-emerald-600">- ${desc.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Saldo anterior</span>
            <span className="font-mono">${(factura.saldoAnterior ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Notas de crédito</span>
            <span className="font-mono text-emerald-600">- ${(factura.notasCredito ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Pagos aplicados</span>
            <span className="font-mono text-emerald-600">- ${(factura.pagosAplicados ?? 0).toLocaleString()}</span>
          </div>
          <hr />
          <div className="flex justify-between font-bold text-base">
            <span>Total general adeudado</span>
            <span className="font-mono">${totalGral.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div>
        <span className="font-semibold text-sm block mb-1">J. Remitos incluidos</span>
        <p className="text-xs text-slate-500">
          Remitos: {factura.remitoIds || 'No especificados'}
        </p>
      </div>

      {factura.observaciones && (
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs">
          <span className="font-semibold">Observaciones:</span> {factura.observaciones}
        </div>
      )}

      <div className="text-center text-[10px] text-slate-400 border-t pt-3">
        Borrador administrativo - Emisión fiscal debe realizarse en el sistema autorizado por la autoridad tributaria.
      </div>
    </div>
  )
}

// ===== FacturacionTab Component =====
export default function FacturacionTab() {
  const { toast } = useToast()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [previewFactura, setPreviewFactura] = useState<Factura | null>(null)

  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])
  const [tipoPeriodo, setTipoPeriodo] = useState('MENSUAL')
  const [fechaVencimiento, setFechaVencimiento] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1)
    return d.toISOString().split('T')[0]
  })
  const [observaciones, setObservaciones] = useState('')
  const [selectedRemitoIds, setSelectedRemitoIds] = useState<string[]>([])
  const [facturaItems, setFacturaItems] = useState<FacturaItem[]>([])
  const [descuento, setDescuento] = useState(0)
  const [impuestos, setImpuestos] = useState(0)
  const [saldoAnterior, setSaldoAnterior] = useState(0)
  const [notasCredito, setNotasCredito] = useState(0)
  const [pagosAplicados, setPagosAplicados] = useState(0)
  const [estado, setEstado] = useState('PENDIENTE')

  function resetForm() {
    const now = new Date()
    setClienteId('')
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    setFechaDesde(d.toISOString().split('T')[0])
    setFechaHasta(now.toISOString().split('T')[0])
    setTipoPeriodo('MENSUAL')
    const v = new Date(); v.setMonth(v.getMonth() + 1)
    setFechaVencimiento(v.toISOString().split('T')[0])
    setObservaciones('')
    setSelectedRemitoIds([])
    setFacturaItems([])
    setDescuento(0)
    setImpuestos(0)
    setSaldoAnterior(0)
    setNotasCredito(0)
    setPagosAplicados(0)
    setEstado('PENDIENTE')
    setEditingId(null)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fRes, cRes, rRes, gRes] = await Promise.all([
        fetch('/api/facturas'), fetch('/api/clientes'), fetch('/api/remitos'), fetch('/api/gases'),
      ])
      const fData = await fRes.json(); setFacturas(Array.isArray(fData) ? fData : [])
      const cData = await cRes.json(); setClientes(Array.isArray(cData) ? cData : [])
      const rData = await rRes.json(); setRemitos(Array.isArray(rData) ? rData : [])
      const gData = await gRes.json(); setGases(Array.isArray(gData) ? gData : [])
    } catch { toast({ title: 'Error', description: 'No se pudieron cargar datos', variant: 'destructive' }) }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  const remitosCliente = remitos.filter((r) => r.clienteId === clienteId)
  const remitosEnPeriodo = remitosCliente.filter((r) => {
    const rf = new Date(r.fecha)
    const fd = new Date(fechaDesde)
    const fh = new Date(fechaHasta)
    fh.setHours(23, 59, 59, 999)
    return rf >= fd && rf <= fh
  })

  const total = facturaItems.reduce((s, it) => s + it.subtotal, 0)
  const totalGeneral = total + saldoAnterior - notasCredito - pagosAplicados

  async function calcularAlquiler() {
    if (!clienteId) {
      toast({ title: 'Error', description: 'Seleccioná un cliente primero', variant: 'destructive' })
      return
    }
    setCalculando(true)
    try {
      const res = await fetch('/api/facturas/calcular-alquiler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          fechaDesde,
          fechaHasta,
          incluirFacturados: editingId !== null,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        setFacturaItems(data.items)
        const remitoIds = new Set<string>()
        for (const r of remitosEnPeriodo) {
          const match = data.items.some((it: any) => r.items.some((ri: any) => ri.id === it.remitoItemId))
          if (match) remitoIds.add(r.id)
        }
        setSelectedRemitoIds([...remitoIds])
        toast({ title: 'Cálculo completado', description: `${data.items.length} ítem(es) generados` })
      } else {
        toast({ title: 'Sin ítems', description: 'No se encontraron conceptos facturables en el período' })
        setFacturaItems([])
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo calcular alquiler', variant: 'destructive' })
    }
    setCalculando(false)
  }

  async function guardar() {
    if (!clienteId) { toast({ title: 'Error', description: 'Seleccioná un cliente', variant: 'destructive' }); return }
    if (facturaItems.length === 0) { toast({ title: 'Error', description: 'Agregá al menos un ítem', variant: 'destructive' }); return }
    const cliente = clientes.find((c: any) => c.id === clienteId)
    const payload = {
      clienteId,
      cliente: cliente?.nombre || '',
      fechaVencimiento,
      fechaDesde,
      fechaHasta,
      tipoPeriodo,
      remitoIds: selectedRemitoIds,
      items: facturaItems.filter((i) => i.concepto),
      subtotal: total,
      descuento,
      impuestos,
      total: total,
      saldoAnterior,
      notasCredito,
      pagosAplicados,
      totalGeneral,
      estado,
      observaciones,
    }
    try {
      if (editingId) {
        await fetch(`/api/facturas/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/facturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      toast({ title: 'OK', description: editingId ? 'Factura actualizada' : 'Factura creada' })
      setShowForm(false)
      resetForm()
      load()
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    }
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    try {
      await fetch(`/api/facturas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      toast({ title: `Factura marcada como ${nuevoEstado}` })
      load()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta factura permanentemente?')) return
    try {
      await fetch(`/api/facturas/${id}`, { method: 'DELETE' })
      toast({ title: 'Eliminada' })
      load()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  function openEdit(f: Factura) {
    setClienteId(f.clienteId)
    setFechaDesde(f.fechaDesde?.split('T')[0] || '')
    setFechaHasta(f.fechaHasta?.split('T')[0] || '')
    setTipoPeriodo(f.tipoPeriodo || 'MENSUAL')
    setFechaVencimiento(f.fechaVencimiento?.split('T')[0] || '')
    setObservaciones(f.observaciones || '')
    setSelectedRemitoIds(f.remitoIds ? f.remitoIds.split(',').filter(Boolean) : [])
    setFacturaItems(f.items.map((i) => ({ ...i })))
    setDescuento(f.descuento ?? 0)
    setImpuestos(f.impuestos ?? 0)
    setSaldoAnterior(f.saldoAnterior ?? 0)
    setNotasCredito(f.notasCredito ?? 0)
    setPagosAplicados(f.pagosAplicados ?? 0)
    setEstado(f.estado)
    setEditingId(f.id)
    setShowForm(true)
  }

  const filtradas = facturas.filter((f) => {
    if (filtroEstado !== 'all' && f.estado !== filtroEstado) return false
    if (filtroCliente && !f.cliente.toLowerCase().includes(filtroCliente.toLowerCase())) return false
    return true
  })

  const gasPriceOf = (codigo: string) => {
    const g = gases.find((g) => g.codigo === codigo)
    return {
      diario: g?.precioAlquilerDiario || 0,
      mensual: g?.precioAlquilerMensual || 0,
      venta: g?.precioVenta || 0,
      nombre: g?.nombre || codigo,
    }
  }

  return (
    <Tabs defaultValue="actuales" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="actuales" className="flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Actuales
          </TabsTrigger>
          <TabsTrigger value="historicos" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Históricos
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="actuales">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADA">Pagada</option>
            <option value="VENCIDA">Vencida</option>
            <option value="BORRADOR">Borrador</option>
            <option value="ANULADA">Anulada</option>
          </select>
          <Input
            className="w-48"
            placeholder="Buscar cliente..."
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1" />Nueva Factura
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-200" />
          No hay facturas registradas
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((f) => {
                const totalGral = f.totalGeneral ?? f.total
                return (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => setPreviewFactura(f)}>
                    <TableCell className="font-medium">#{f.numero}</TableCell>
                    <TableCell className="max-w-32 truncate">{f.cliente}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {f.fechaDesde ? `${new Date(f.fechaDesde).toLocaleDateString()} - ${new Date(f.fechaHasta || f.fecha).toLocaleDateString()}` : new Date(f.fecha).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {f.fechaVencimiento ? new Date(f.fechaVencimiento).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-right">${f.total.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-right text-xs">
                      <span className={totalGral > f.total ? 'text-amber-600' : ''}>
                        ${totalGral.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.estado === 'PAGADA' ? 'default' : f.estado === 'VENCIDA' ? 'destructive' : f.estado === 'ANULADA' ? 'secondary' : f.estado === 'BORRADOR' ? 'outline' : 'outline'}>
                        {f.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500">{f.items?.length || 0}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {f.estado === 'PENDIENTE' && (
                        <>
                          <Button variant="outline" size="sm" className="mr-1 h-7 text-xs" onClick={() => cambiarEstado(f.id, 'PAGADA')}>
                            Cobrar
                          </Button>
                          <Button variant="outline" size="sm" className="mr-1 h-7 text-xs" onClick={() => cambiarEstado(f.id, 'VENCIDA')}>
                            Vencer
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7" onClick={() => openEdit(f)}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 text-red-500" onClick={() => eliminar(f.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!previewFactura} onOpenChange={(o) => { if (!o) setPreviewFactura(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewFactura && <InvoicePreview factura={previewFactura} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm() } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              {editingId ? 'Editar Factura' : 'Nueva Factura'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Cliente</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="BORRADOR">Borrador</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PAGADA">Pagada</option>
                </select>
              </div>
            </div>

            {clienteId && (
              <div className="bg-slate-50 rounded-lg p-3 border">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Período de facturación
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <select className="w-full border rounded px-2 py-1.5 text-sm" value={tipoPeriodo} onChange={(e) => setTipoPeriodo(e.target.value)}>
                      <option value="DIARIO">Diario</option>
                      <option value="SEMANAL">Semanal</option>
                      <option value="QUINCENAL">Quincenal</option>
                      <option value="MENSUAL">Mensual</option>
                      <option value="PERSONALIZADO">Personalizado</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Desde</Label>
                    <Input type="date" className="h-8 text-sm" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Hasta</Label>
                    <Input type="date" className="h-8 text-sm" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Vencimiento</Label>
                    <Input type="date" className="h-8 text-sm" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {clienteId && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={calcularAlquiler}
                  disabled={calculando}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${calculando ? 'animate-spin' : ''}`} />
                  {calculando ? 'Calculando...' : 'Calcular alquileres del período'}
                </Button>
                <span className="text-xs text-slate-400">
                  {remitosEnPeriodo.length} remito(s) en el período para este cliente
                </span>
              </div>
            )}

            {clienteId && (
              <div>
                <details className="bg-slate-50 rounded-lg p-3 border">
                  <summary className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" /> Seleccionar remitos manualmente
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      ({remitosCliente.filter((r) => !r.facturaId).length} pendientes)
                    </span>
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {remitosCliente.filter((r) => !r.facturaId).length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No hay remitos pendientes de facturación</p>
                    ) : (
                      remitosCliente
                        .filter((r) => !r.facturaId)
                        .map((r) => {
                          const checked = selectedRemitoIds.includes(r.id)
                          return (
                            <label
                              key={r.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-white transition-colors ${checked ? 'bg-white border border-orange-200' : ''}`}
                            >
                              <input
                                type="checkbox"
                                className="accent-orange-500"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    setSelectedRemitoIds((prev) => prev.filter((id) => id !== r.id))
                                    // Remove items from this remito
                                    const remitoItemIds = new Set(r.items.map((ri) => ri.id))
                                    setFacturaItems((prev) => prev.filter((fi) => !fi.remitoItemId || !remitoItemIds.has(fi.remitoItemId)))
                                  } else {
                                    setSelectedRemitoIds((prev) => [...prev, r.id])
                                    // Add items from this remito
                                    const newItems = r.items.map((ri) => {
                                      const gasInfo = gasPriceOf(ri.gasCodigo)
                                      const pu = ri.tipoOperacion === 'ALQUILER' || ri.tipoOperacion === 'CAMBIO'
                                        ? gasInfo.diario
                                        : ri.tipoOperacion === 'VENTA'
                                          ? gasInfo.venta
                                          : 0
                                      return {
                                        concepto: `${ri.tipoOperacion === 'VENTA' ? 'Venta' : 'Alquiler'} ${ri.gasCodigo}${ri.numeroSerie ? ` - ${ri.numeroSerie}` : ''}`,
                                        tipo: ri.tipoOperacion === 'VENTA' ? 'GAS' : 'ALQUILER',
                                        remitoItemId: ri.id,
                                        cylinderId: ri.cylinderId || undefined,
                                        numeroSerie: ri.numeroSerie || undefined,
                                        cantidad: ri.cantidad,
                                        precioUnitario: pu,
                                        subtotal: pu * ri.cantidad,
                                      }
                                    })
                                    setFacturaItems((prev) => [...prev, ...newItems])
                                  }
                                }}
                              />
                              <span className="font-medium">#{r.numero}</span>
                              <span className="text-slate-400">{new Date(r.fecha).toLocaleDateString()}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0">{r.tipo}</Badge>
                              <span className="text-slate-400">{r.items.length} ítem(s)</span>
                            </label>
                          )
                        })
                    )}
                  </div>
                </details>
              </div>
            )}

            {clienteId && selectedRemitoIds.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500">Remitos incluidos ({selectedRemitoIds.length})</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {remitosCliente
                    .filter((r) => selectedRemitoIds.includes(r.id))
                    .map((r) => (
                      <Badge key={r.id} variant="outline" className="text-[10px]">
                        #{r.numero} · {new Date(r.fecha).toLocaleDateString()} · {r.tipo}
                        <button
                          className="ml-1.5 hover:text-red-500"
                          onClick={() => setSelectedRemitoIds((prev) => prev.filter((id) => id !== r.id))}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {facturaItems.length > 0 && (
              <div>
                <Label>Detalle de conceptos a facturar</Label>
                <div className="border rounded-lg overflow-hidden mt-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Tipo</TableHead>
                        <TableHead className="text-[10px]">Concepto</TableHead>
                        <TableHead className="text-[10px] w-16">Tubo</TableHead>
                        <TableHead className="text-[10px] w-12">Días</TableHead>
                        <TableHead className="text-[10px] w-14 text-center">Cant</TableHead>
                        <TableHead className="text-[10px] w-20 text-right">P.Unit</TableHead>
                        <TableHead className="text-[10px] w-20 text-right">Subtotal</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturaItems.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {it.tipo || 'ALQUILER'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="text-xs h-7 min-w-32"
                              value={it.concepto}
                              onChange={(e) => {
                                const n = [...facturaItems]
                                n[idx].concepto = e.target.value
                                setFacturaItems(n)
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                          <TableCell className="text-center text-xs">{it.diasFacturados || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={1}
                              className="w-14 text-xs h-7 text-center"
                              value={it.cantidad}
                              onChange={(e) => {
                                const n = [...facturaItems]
                                n[idx].cantidad = parseInt(e.target.value) || 1
                                n[idx].subtotal = n[idx].cantidad * n[idx].precioUnitario
                                setFacturaItems(n)
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-20 text-xs h-7 text-right"
                              value={it.precioUnitario}
                              onChange={(e) => {
                                const n = [...facturaItems]
                                n[idx].precioUnitario = parseFloat(e.target.value) || 0
                                n[idx].subtotal = n[idx].cantidad * n[idx].precioUnitario
                                setFacturaItems(n)
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            ${it.subtotal.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-red-400 hover:text-red-600"
                              onClick={() => setFacturaItems((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Saldo anterior</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={saldoAnterior}
                  onChange={(e) => setSaldoAnterior(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Notas de crédito</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={notasCredito}
                  onChange={(e) => setNotasCredito(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Pagos aplicados</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={pagosAplicados}
                  onChange={(e) => setPagosAplicados(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Descuento</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={descuento}
                  onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {facturaItems.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 border">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Resumen financiero</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal (período actual)</span>
                    <span className="font-mono">${total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Saldo anterior</span>
                    <span className="font-mono">${saldoAnterior.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Notas de crédito</span>
                    <span className="font-mono text-emerald-600">- ${notasCredito.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pagos aplicados</span>
                    <span className="font-mono text-emerald-600">- ${pagosAplicados.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Descuento</span>
                    <span className="font-mono text-emerald-600">- ${descuento.toLocaleString()}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total general adeudado</span>
                    <span className="font-mono">${totalGeneral.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Observaciones</Label>
              <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas internas, condiciones de pago, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={facturaItems.length === 0}>
              <Save className="w-4 h-4 mr-1" />
              {editingId ? 'Actualizar' : 'Crear Factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="historicos">
        <ComprobantesHistoricos />
      </TabsContent>
    </Tabs>
  )
}
