'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  ShoppingCart,
  Plus,
  FileText,
  AlertTriangle,
  RefreshCw,
  Package,
  Trash2,
  Search,
  Edit3,
  Building2,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import type { Gas, Cylinder, Cliente } from '@/lib/tab-types'
import { formatDate, SgaBadge, ESTADO_LABELS, ESTADO_COLORS, daysUntil } from '@/lib/tab-constants'
import { ESTADOS } from '@/lib/catalogo'

interface PedidoItem {
  id: string
  concepto: string
  monto: number
}

interface PedidoCilindro {
  id: string
  pedidoId: string
  numeroSerie: string
  gasCodigo: string | null
  verified: boolean
  createdAt: string
}

interface RenglonPedido {
  id: string
  gasId: string
  operacionEnvase: string
  cantidad: number
  phFecha: string
}

interface PedidoCilindroEntry {
  id: string
  numeroSerie: string
  gasCodigo: string
  verified: boolean
}

interface Pedido {
  id: string
  fecha: string
  cliente: string
  clienteId: string | null
  estadoCuenta: string | null
  gasId: string
  gas: Gas
  operacionEnvase: string
  phVigente: boolean | null
  phObservacion: string | null
  total: number
  estado: string
  observaciones: string | null
  items: PedidoItem[]
  cilindros: PedidoCilindro[]
  facturaId: string | null
  createdAt: string
}

const PRECIOS_GAS: Record<string, number> = {
  AR: 15000, C2H2: 22000, O2: 12000, CO2: 18000, N2: 10000,
  'MIX-7525': 16000, HE: 28000, 'AR-HE': 24000, H2: 35000,
}

const ESTADOS_PEDIDO = ['PENDIENTE', 'COMPLETADO', 'CANCELADO'] as const

export default function PedidosTab() {
  const { toast } = useToast()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [clientes, setClientes] = useState<{ id: string; nombre: string; estadoCuenta: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewPedido, setViewPedido] = useState<Pedido | null>(null)
  const [scannerPedidoId, setScannerPedidoId] = useState<string | null>(null)
  const [scannerInput, setScannerInput] = useState('')
  const [scannerCilindros, setScannerCilindros] = useState<PedidoCilindro[]>([])

  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [clienteId, setClienteId] = useState('')
  const [estadoCuenta, setEstadoCuenta] = useState('OK')
  const [observaciones, setObservaciones] = useState('')

  const renglonIdRef = useRef(0)

  const [renglones, setRenglones] = useState<RenglonPedido[]>([
    { id: `r_${++renglonIdRef.current}`, gasId: '', operacionEnvase: 'CANJE', cantidad: 1, phFecha: new Date().toISOString().split('T')[0] },
  ])

  function resetForm() {
    setFecha(new Date().toISOString().split('T')[0])
    setClienteId(''); setEstadoCuenta('OK'); setObservaciones(''); setEditingId(null)
    setRenglones([{ id: `r_${++renglonIdRef.current}`, gasId: '', operacionEnvase: 'CANJE', cantidad: 1, phFecha: new Date().toISOString().split('T')[0] }])
  }

  function openEdit(p: Pedido) {
    setFecha(p.fecha ? p.fecha.split('T')[0] : new Date().toISOString().split('T')[0])
    setClienteId(p.clienteId || '')
    setEstadoCuenta(p.estadoCuenta || 'OK')
    setObservaciones(p.observaciones || '')
    setEditingId(p.id)
    setRenglones(p.items.filter((i) => i.concepto.includes('Carga')).map((i, idx) => {
      const gas = gases.find((g) => i.concepto.startsWith(g.nombre))
      const cantMatch = i.concepto.match(/× (\d+)/)
      return {
        id: `r_${++renglonIdRef.current}`,
        gasId: gas?.id || '',
        operacionEnvase: 'CANJE',
        cantidad: cantMatch ? parseInt(cantMatch[1]) : 1,
        phFecha: new Date().toISOString().split('T')[0],
      }
    }))
    setShowForm(true)
  }

  function agregarRenglon() {
    setRenglones((prev) => [...prev, { id: `r_${++renglonIdRef.current}`, gasId: '', operacionEnvase: 'CANJE', cantidad: 1, phFecha: new Date().toISOString().split('T')[0] }])
  }

  function actualizarRenglon(id: string, campo: keyof RenglonPedido, valor: string | number) {
    setRenglones((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)))
  }

  function eliminarRenglon(id: string) {
    setRenglones((prev) => prev.filter((r) => r.id !== id))
  }

  const clienteSel = clientes.find((c) => c.id === clienteId)

  function phVencida(phFecha: string): boolean | null {
    if (!phFecha) return null
    const d = new Date(phFecha); const hace5 = new Date(); hace5.setFullYear(hace5.getFullYear() - 5)
    return d < hace5
  }

  const totalCalc = useMemo(() => {
    let t = 0
    for (const r of renglones) {
      const gas = gases.find((g) => g.id === r.gasId)
      if (!gas) continue
      t += (PRECIOS_GAS[gas.codigo] || 15000) * r.cantidad
      if (r.operacionEnvase === 'VENTA_NUEVO') t += 45000 * r.cantidad
      if (r.operacionEnvase === 'CANJE' && phVencida(r.phFecha) === true) t += 8500 * r.cantidad
    }
    return t
  }, [renglones, gases])

  const subtotalRenglon = useCallback((r: RenglonPedido) => {
    const gas = gases.find((g) => g.id === r.gasId)
    if (!gas) return 0
    let s = (PRECIOS_GAS[gas.codigo] || 15000) * r.cantidad
    if (r.operacionEnvase === 'VENTA_NUEVO') s += 45000 * r.cantidad
    if (r.operacionEnvase === 'CANJE' && phVencida(r.phFecha) === true) s += 8500 * r.cantidad
    return s
  }, [gases])

  const load = useCallback(async () => {
    try {
      const [pRes, gRes, cRes] = await Promise.all([
        fetch('/api/pedidos'),
        fetch('/api/gases'),
        fetch('/api/clientes?activo=true'),
      ])
      const pData = await pRes.json(); setPedidos(Array.isArray(pData) ? pData : [])
      const gData = await gRes.json(); setGases(Array.isArray(gData) ? gData : [])
      const cData = await cRes.json()
      setClientes(Array.isArray(cData) ? cData.map((c: any) => ({ id: c.id, nombre: c.nombre, estadoCuenta: c.estadoCuenta || 'AL_DIA' })) : [])
    } catch { /* ok */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function guardarPedido() {
    if (!clienteId || renglones.length === 0 || renglones.every((r) => !r.gasId)) {
      toast({ title: 'Faltan datos', description: 'Seleccioná un cliente y al menos un gas', variant: 'destructive' }); return
    }
    try {
      const body = {
        fecha,
        cliente: clienteSel?.nombre,
        clienteId,
        estadoCuenta,
        renglones: renglones.filter((r) => r.gasId).map((r) => ({
          gasId: r.gasId,
          operacionEnvase: r.operacionEnvase,
          cantidad: r.cantidad,
          phVigente: r.operacionEnvase === 'CANJE' ? !phVencida(r.phFecha) : null,
        })),
        observaciones: observaciones.trim() || null,
      }

      const res = editingId
        ? await fetch(`/api/pedidos/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast({ title: editingId ? 'Pedido actualizado' : 'Pedido creado', description: `$${totalCalc.toLocaleString()}` })
      setShowForm(false); resetForm(); load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    }
  }

  async function cambiarEstado(id: string, estado: string) {
    await fetch(`/api/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) })
    toast({ title: 'Estado actualizado' }); load()
  }

  async function eliminarPedido(id: string) {
    if (!confirm('¿Eliminar este pedido?')) return
    await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
    toast({ title: 'Pedido eliminado' }); load()
  }

  async function openScanner(pedido: Pedido) {
    setScannerPedidoId(pedido.id)
    setScannerInput('')
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}/cilindros`)
      const data = await res.json()
      setScannerCilindros(Array.isArray(data) ? data : [])
    } catch { setScannerCilindros([]) }
  }

  async function agregarCilindroScan() {
    if (!scannerInput.trim() || !scannerPedidoId) return
    try {
      const res = await fetch(`/api/pedidos/${scannerPedidoId}/cilindros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroSerie: scannerInput.trim() }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      const nuevo = await res.json()
      setScannerCilindros((prev) => [...prev, nuevo])
      setScannerInput('')
      toast({ title: 'Cilindro agregado', description: scannerInput.trim() })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    }
  }

  async function eliminarCilindroScan(id: string) {
    if (!confirm('Quitar este cilindro del pedido?')) return
    await fetch(`/api/pedidos/${scannerPedidoId}/cilindros?cilindroId=${id}`, { method: 'DELETE' })
    setScannerCilindros((prev) => prev.filter((c) => c.id !== id))
    toast({ title: 'Cilindro quitado' })
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <span className="text-xs text-slate-400">({pedidos.length} registros)</span>
        </div>
        <Button onClick={() => { if (showForm) resetForm(); setShowForm(!showForm) }} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
          <Plus className="w-4 h-4 mr-1" /> {showForm ? 'Cancelar' : 'Nuevo Pedido'}
        </Button>
      </div>

      {/* FORM: Nuevo / Editar */}
      {showForm && (
        <Card className="border-orange-200 shadow-md print:hidden">
          <CardContent className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-orange-800 uppercase tracking-wider text-sm">{editingId ? 'Editar Pedido' : 'Orden de Pedido'}</span>
                </div>
                <Badge variant="outline" className="bg-white text-orange-700 border-orange-300 text-xs">{editingId ? 'Editando' : 'Nuevo'}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Fecha del pedido</Label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-white text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Cliente *</Label>
                  <Select value={clienteId} onValueChange={(v) => {
                    setClienteId(v)
                    const c = clientes.find((cl) => cl.id === v)
                    if (c) setEstadoCuenta(c.estadoCuenta === 'MOROSO' ? 'DEUDA_PENDIENTE' : 'OK')
                  }}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.nombre}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Estado de cuenta</Label>
                  <Select value={estadoCuenta} onValueChange={setEstadoCuenta}>
                    <SelectTrigger className={`bg-white ${estadoCuenta === 'DEUDA_PENDIENTE' ? 'border-red-400' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK">Ok — Sin deuda</SelectItem>
                      <SelectItem value="DEUDA_PENDIENTE">Deuda pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  {estadoCuenta === 'DEUDA_PENDIENTE' && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] text-red-600">Cliente con deuda — verificar condiciones de pago</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Observaciones</Label>
                  <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas del pedido" className="bg-white text-sm" />
                </div>
              </div>
            </div>

            {/* Renglones */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold tracking-wide">Detalle del pedido</span>
                </div>
                <span className="text-xs text-slate-400">{renglones.filter((r) => r.gasId).length} ítem(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                      <th className="px-3 py-2.5 text-left font-semibold w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[160px]">Gas</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[130px]">Operación</th>
                      <th className="px-3 py-2.5 text-center font-semibold w-16">Cant.</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[140px]">PH (Canje)</th>
                      <th className="px-3 py-2.5 text-right font-semibold w-28">P. Unit.</th>
                      <th className="px-3 py-2.5 text-right font-semibold w-28">Subtotal</th>
                      <th className="px-3 py-2.5 text-center w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {renglones.map((r, idx) => {
                      const gas = gases.find((g) => g.id === r.gasId)
                      const phCheck = phVencida(r.phFecha)
                      const sub = subtotalRenglon(r)
                      const pUnit = gas ? (PRECIOS_GAS[gas.codigo] || 15000) : 0
                      return (
                        <tr key={r.id} className={`border-t border-slate-100 ${!r.gasId ? 'bg-slate-50/40' : 'bg-white'} hover:bg-orange-50/30 transition-colors`}>
                          <td className="px-3 py-2 text-xs font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <Select value={r.gasId} onValueChange={(v) => actualizarRenglon(r.id, 'gasId', v)}>
                              <SelectTrigger className={`h-9 text-sm border-0 bg-transparent ${!r.gasId ? 'text-slate-400' : ''} hover:bg-slate-50 focus:ring-1`}>
                                <SelectValue placeholder="— Seleccionar gas —" />
                              </SelectTrigger>
                              <SelectContent>
                                {gases.map((g) => (
                                  <SelectItem key={g.id} value={g.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: g.colorHex }} />
                                      <span className="font-medium">{g.nombre}</span>
                                      <span className="text-slate-400 text-xs">({g.codigo})</span>
                                      <SgaBadge peligro={g.peligro} />
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select value={r.operacionEnvase} onValueChange={(v) => actualizarRenglon(r.id, 'operacionEnvase', v)}>
                              <SelectTrigger className="h-9 text-sm border-0 bg-transparent hover:bg-slate-50 focus:ring-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CANJE"><div className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-blue-500" /><span>Canje (mano a mano)</span></div></SelectItem>
                                <SelectItem value="VENTA_NUEVO"><div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-emerald-600" /><span>Venta de cilindro nuevo</span></div></SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { if (r.cantidad > 1) actualizarRenglon(r.id, 'cantidad', r.cantidad - 1) }}>
                                <span className="text-sm font-bold text-slate-500">−</span>
                              </Button>
                              <span className="w-8 text-center text-sm font-semibold tabular-nums">{r.cantidad}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => actualizarRenglon(r.id, 'cantidad', r.cantidad + 1)}>
                                <span className="text-sm font-bold text-slate-500">+</span>
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {r.operacionEnvase === 'CANJE' ? (
                              <div>
                                <Input type="date" value={r.phFecha} onChange={(e) => actualizarRenglon(r.id, 'phFecha', e.target.value)}
                                  className="h-9 text-xs bg-transparent border-0 hover:bg-slate-50 focus:ring-1" />
                                {phCheck === true && <p className="text-[10px] text-red-600 mt-0.5">PH vencida (+$8.500 c/u)</p>}
                                {phCheck === false && <p className="text-[10px] text-emerald-600 mt-0.5">PH vigente</p>}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {gas ? <span className="text-sm font-mono font-semibold tabular-nums">${pUnit.toLocaleString()}</span>
                              : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-sm font-bold font-mono tabular-nums text-orange-700">${sub.toLocaleString()}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50"
                              onClick={() => eliminarRenglon(r.id)} disabled={renglones.length === 1}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 px-4 py-2 flex items-center justify-between bg-slate-50">
                <Button type="button" variant="ghost" size="sm" onClick={agregarRenglon} className="text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar renglón
                </Button>
              </div>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-orange-200 pb-2">Resumen</p>
                {renglones.filter((r) => r.gasId).map((r) => {
                  const gas = gases.find((g) => g.id === r.gasId)
                  if (!gas) return null
                  const sub = subtotalRenglon(r)
                  return (
                    <div key={r.id} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate">{gas.nombre} × {r.cantidad}
                        <span className="text-slate-400 ml-1">({r.operacionEnvase === 'CANJE' ? 'Canje' : 'Nuevo'})</span>
                      </span>
                      <span className="font-mono font-semibold tabular-nums">${sub.toLocaleString()}</span>
                    </div>
                  )
                })}
                <div className="border-t border-orange-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">Total</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-orange-600">${totalCalc.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <Select onValueChange={(v) => cambiarEstado(editingId, v)}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Cambiar estado..." /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PEDIDO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={guardarPedido} disabled={!clienteId || renglones.every((r) => !r.gasId)}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 px-8">
                <ShoppingCart className="w-4 h-4 mr-2" /> {editingId ? 'Actualizar Pedido' : 'Confirmar Pedido'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardContent className="p-0">
          {pedidos.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No hay pedidos registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead>Envase</TableHead>
                    <TableHead className="text-center">PH</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Tubos</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{p.cliente}</div>
                        {p.estadoCuenta === 'DEUDA_PENDIENTE' && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">Deuda</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.gas.colorHex }} />
                          <span className="text-sm">{p.gas.nombre}</span>
                          <SgaBadge peligro={p.gas.peligro} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.operacionEnvase === 'CANJE' ? 'Canje' : 'Venta nueva'}</TableCell>
                      <TableCell className="text-center">
                        {p.phVigente === true && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Vigente</Badge>}
                        {p.phVigente === false && <Badge variant="destructive" className="text-xs">Vencida</Badge>}
                        {p.phVigente === null && <span className="text-xs text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">${p.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${p.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : p.estado === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{p.fecha ? formatDate(p.fecha) : formatDate(p.createdAt)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openScanner(p)} title="Gestionar tubos del pedido">
                          <Package className="w-3.5 h-3.5" />
                        </Button>
                        {p.cilindros && p.cilindros.length > 0 && (
                          <span className="text-[10px] text-slate-400 block -mt-1">{p.cilindros.length}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPedido(p)} title="Ver detalle">
                            <Search className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} title="Editar">
                            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewPedido(p); setTimeout(() => window.print(), 300) }} title="Imprimir / PDF">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                          </Button>
                          {!p.facturaId && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                              try {
                                const res = await fetch(`/api/pedidos/${p.id}/facturar`, { method: 'POST' })
                                if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
                                toast({ title: 'Factura creada', description: 'El pedido fue facturado correctamente' })
                                load()
                              } catch (e) {
                                toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
                              }
                            }} title="Facturar">
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => eliminarPedido(p.id)} title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Ver detalle / Imprimir */}
      <Dialog open={!!viewPedido} onOpenChange={(o) => { if (!o) setViewPedido(null) }}>
        <DialogContent className="max-w-3xl print:max-w-full print:shadow-none print:border-0">
          {viewPedido && <PedidoDetalle pedido={viewPedido} />}
        </DialogContent>
      </Dialog>

      {/* Modal: Scanner de cilindros */}
      <Dialog open={!!scannerPedidoId} onOpenChange={(o) => { if (!o) setScannerPedidoId(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Gestionar tubos del pedido
            </DialogTitle>
            <DialogDescription>
              Escaneá el QR o ingresá manualmente el número de serie del tubo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={scannerInput} onChange={(e) => setScannerInput(e.target.value)}
                placeholder="N° de serie del tubo (QR o manual)" className="flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarCilindroScan() } }} />
              <Button onClick={agregarCilindroScan} disabled={!scannerInput.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>📷 Escaneá con lector QR — el número aparece acá automáticamente</span>
            </div>
            {scannerCilindros.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {scannerCilindros.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">{c.numeroSerie}</span>
                      {c.gasCodigo && <Badge variant="outline" className="text-[10px]">{c.gasCodigo}</Badge>}
                      {c.verified
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verificado</Badge>
                        : <Badge variant="destructive" className="text-[10px]">No en inv.</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminarCilindroScan(c.id)}>
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                No hay tubos asignados a este pedido
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PedidoDetalle({ pedido }: { pedido: Pedido }) {
  const fecha = pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'
  return (
    <div className="space-y-6 print:space-y-4">
      {/* Encabezado imprimible */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Orden de Pedido</h1>
        <p className="text-sm text-slate-500">Control Digital ManejaDatos Districon</p>
      </div>

      <DialogHeader className="print:hidden">
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          Pedido — {pedido.cliente}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-slate-500 text-xs">Cliente</span><p className="font-semibold">{pedido.cliente}</p></div>
        <div><span className="text-slate-500 text-xs">Fecha</span><p className="font-semibold">{fecha}</p></div>
        <div><span className="text-slate-500 text-xs">Estado</span>
          <p><Badge className={`text-xs ${pedido.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : pedido.estado === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{pedido.estado}</Badge></p>
        </div>
        <div><span className="text-slate-500 text-xs">Estado de cuenta</span>
          <p>{pedido.estadoCuenta === 'DEUDA_PENDIENTE' ? <span className="text-red-600 font-semibold">Deuda pendiente</span> : 'Ok'}</p>
        </div>
      </div>

      {pedido.observaciones && (
        <div className="text-sm bg-slate-50 p-2 rounded"><span className="text-slate-500 text-xs">Observaciones:</span><p>{pedido.observaciones}</p></div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">Detalle de ítems</div>
        <div className="divide-y">
          {pedido.items.map((i) => (
            <div key={i.id} className="flex justify-between px-4 py-2 text-sm">
              <span>{i.concepto}</span>
              <span className="font-mono font-semibold">${i.monto.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="bg-orange-50 flex justify-between px-4 py-3 font-bold text-base border-t-2 border-orange-200">
          <span>Total</span>
          <span className="text-orange-700 font-mono">${pedido.total.toLocaleString()}</span>
        </div>
      </div>

      {/* Tubos asignados */}
      {pedido.cilindros && pedido.cilindros.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-700 text-white px-4 py-2 text-sm font-semibold">Tubos asignados</div>
          <div className="divide-y">
            {pedido.cilindros.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-mono font-semibold">{c.numeroSerie}</span>
                <div className="flex items-center gap-2">
                  {c.gasCodigo && <Badge variant="outline" className="text-[10px]">{c.gasCodigo}</Badge>}
                  {c.verified
                    ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verif.</Badge>
                    : <Badge variant="destructive" className="text-[10px]">No verif.</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón de impresión (solo en pantalla) */}
      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <FileText className="w-4 h-4" /> Imprimir / PDF
        </Button>
      </div>
    </div>
  )
}
