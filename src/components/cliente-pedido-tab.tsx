'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { ShoppingCart, Plus, RefreshCw, Package, Building2, FileText, Eye, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { Gas } from '@/lib/tab-types'
import { formatDate, SgaBadge } from '@/lib/tab-constants'

interface Pedido {
  id: string
  fecha: string
  cliente: string
  operacionEnvase: string
  total: number
  estado: string
  createdAt: string
  items: { id: string; concepto: string; monto: number }[]
  cilindros: { id: string; numeroSerie: string; gasCodigo: string | null; verified: boolean }[]
}

interface ClienteCylinder {
  id: string
  numeroSerie: string
  gas: { nombre: string; codigo: string; colorHex: string }
  estado: string
}

const PRECIOS_GAS: Record<string, number> = {
  AR: 15000, C2H2: 22000, O2: 12000, CO2: 18000, N2: 10000,
  'MIX-7525': 16000, HE: 28000, 'AR-HE': 24000, H2: 35000,
}

export default function ClientePedidoTab({ clienteId, clienteNombre }: { clienteId: string; clienteNombre: string }) {
  const { toast } = useToast()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [tiposOperacion, setTiposOperacion] = useState<any[]>([])
  const [cilindrosCliente, setCilindrosCliente] = useState<ClienteCylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [gasId, setGasId] = useState('')
  const [operacionId, setOperacionId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [stockOk, setStockOk] = useState<boolean | null>(null)
  const [verificandoStock, setVerificandoStock] = useState(false)
  const [viewPedido, setViewPedido] = useState<Pedido | null>(null)

  const gasSel = gases.find(g => g.id === gasId)
  const opSel = tiposOperacion.find(t => t.id === operacionId)

  const totalCalc = useMemo(() => {
    if (!gasSel) return 0
    return (PRECIOS_GAS[gasSel.codigo] || 15000) * cantidad
  }, [gasSel, cantidad])

  const pUnit = gasSel ? (PRECIOS_GAS[gasSel.codigo] || 15000) : 0

  async function verificarStock(gasId: string) {
    setVerificandoStock(true)
    setStockOk(null)
    try {
      const res = await fetch(`/api/cylinders?gasId=${gasId}&estado=LLENO`)
      const data = await res.json()
      const llenos = Array.isArray(data) ? data.length : 0
      setStockOk(llenos >= cantidad)
    } catch { setStockOk(null) }
    finally { setVerificandoStock(false) }
  }

  useEffect(() => {
    if (gasId && cantidad > 0) verificarStock(gasId)
    else setStockOk(null)
  }, [gasId, cantidad])

  const load = useCallback(async () => {
    try {
      const [pRes, gRes, tRes, cRes] = await Promise.all([
        fetch('/api/pedidos'),
        fetch('/api/gases'),
        fetch('/api/tipos-operacion-pedido'),
        fetch(`/api/cylinders?clienteId=${encodeURIComponent(clienteId)}`),
      ])
      const pData = await pRes.json()
      const gData = await gRes.json()
      const tData = await tRes.json()
      const cData = await cRes.json()
      setPedidos((Array.isArray(pData) ? pData as Pedido[] : []).filter(p => p.cliente === clienteNombre))
      setGases(Array.isArray(gData) ? gData : [])
      setTiposOperacion(Array.isArray(tData) ? tData.filter((t: any) => t.activo) : [])
      setCilindrosCliente(Array.isArray(cData) ? cData.map((cyl: any) => ({
        id: cyl.id,
        numeroSerie: cyl.numeroSerie,
        gas: cyl.gas || { nombre: '-', codigo: '-', colorHex: '#ccc' },
        estado: cyl.estado,
      })) : [])
    } catch { /* ok */ }
    finally { setLoading(false) }
  }, [clienteNombre, clienteId])

  useEffect(() => { void load() }, [load])

  async function enviarPedido() {
    if (!gasId || !operacionId) { toast({ title: 'Completá gas y operación', variant: 'destructive' }); return }
    setCreando(true)
    try {
      const body = {
        cliente: clienteNombre,
        clienteId,
        operacionEnvase: opSel?.nombre || 'Sin envase',
        renglones: [{ gasId, operacionEnvase: opSel?.nombre || 'Sin envase', cantidad }],
      }
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast({ title: 'Pedido enviado', description: stockOk === false ? ' (pendiente de confirmación)' : '' })
      setGasId(''); setOperacionId(''); setCantidad(1); setStockOk(null)
      load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally { setCreando(false) }
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Pedido de Clientes</h2>
          <span className="text-xs text-slate-400">({pedidos.length} registros)</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
            <Building2 className="w-3 h-3 mr-1" />{clienteNombre}
          </Badge>
        </div>
      </div>

      {/* Formulario */}
      <Card className="border-orange-200 shadow-md">
        <CardContent className="p-4 space-y-4">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-orange-200 pb-3">
              <FileText className="w-5 h-5 text-orange-600" />
              <span className="font-bold text-orange-800 uppercase tracking-wider text-sm">Nuevo Pedido</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500 font-medium">Gas *</Label>
                <Select value={gasId} onValueChange={v => { setGasId(v); setStockOk(null) }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar gas..." />
                  </SelectTrigger>
                  <SelectContent>
                    {gases.map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border" style={{ background: g.colorHex }} />
                          <span className="font-medium">{g.nombre}</span>
                          <span className="text-slate-400 text-xs">({g.codigo})</span>
                          <SgaBadge peligro={g.peligro} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {verificandoStock && <p className="text-xs text-slate-400 mt-1">Verificando stock...</p>}
                {stockOk === true && !verificandoStock && gasId && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Stock disponible</p>
                )}
                {stockOk === false && !verificandoStock && gasId && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />A confirmar — stock insuficiente</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-slate-500 font-medium">Operación *</Label>
                <Select value={operacionId} onValueChange={setOperacionId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar operación..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposOperacion.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 font-medium">Cantidad</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setCantidad(Math.max(1, cantidad - 1))}>−</Button>
                  <span className="w-12 text-center text-lg font-bold tabular-nums">{cantidad}</span>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setCantidad(cantidad + 1)}>+</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen y botón */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {gasSel && <span>Subtotal: <strong className="font-mono">${pUnit.toLocaleString()}</strong> × {cantidad}</span>}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total</span>
                <span className="text-xl font-bold font-mono text-orange-600">${totalCalc.toLocaleString()}</span>
              </div>
              <Button onClick={enviarPedido} disabled={!gasId || !operacionId || creando}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 px-6">
                {creando ? 'Enviando...' : 'Enviar Pedido'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tubos del cliente */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-semibold">Tus tubos en posesión ({cilindrosCliente.length})</h3>
          </div>
          {cilindrosCliente.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <Package className="w-8 h-8 mx-auto mb-1 text-slate-300" />
              No tenés tubos registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Serie</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cilindrosCliente.map(cyl => (
                    <TableRow key={cyl.id}>
                      <TableCell className="font-mono text-xs font-semibold">{cyl.numeroSerie}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cyl.gas.colorHex }} />
                          <span className="text-sm">{cyl.gas.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${cyl.estado === 'LLENO' ? 'bg-emerald-100 text-emerald-700' : cyl.estado === 'EN_USO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {cyl.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de pedidos */}
      <Card>
        <CardContent className="p-0">
          {pedidos.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No tenés pedidos registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operación</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{p.operacionEnvase}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">${p.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${p.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : p.estado === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.estado === 'PENDIENTE' && stockOk === false ? 'A CONFIRMAR' : p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{p.fecha ? formatDate(p.fecha) : '-'}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPedido(p)} title="Ver detalle">
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: detalle del pedido */}
      <Dialog open={!!viewPedido} onOpenChange={(o) => { if (!o) setViewPedido(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Pedido — {viewPedido?.cliente}
            </DialogTitle>
            <DialogDescription>Detalle completo del pedido</DialogDescription>
          </DialogHeader>
          {viewPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500 text-xs">Operación</span><p className="font-semibold">{viewPedido.operacionEnvase}</p></div>
                <div><span className="text-slate-500 text-xs">Estado</span>
                  <p><Badge className={`text-xs ${viewPedido.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : viewPedido.estado === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{viewPedido.estado}</Badge></p>
                </div>
                <div><span className="text-slate-500 text-xs">Fecha</span><p className="font-semibold">{formatDate(viewPedido.fecha)}</p></div>
                <div><span className="text-slate-500 text-xs">Total</span><p className="font-bold text-orange-600 font-mono">${viewPedido.total.toLocaleString()}</p></div>
              </div>

              {viewPedido.items && viewPedido.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">Items</div>
                  <div className="divide-y">
                    {viewPedido.items.map(i => (
                      <div key={i.id} className="flex justify-between px-4 py-2 text-sm">
                        <span>{i.concepto}</span>
                        <span className="font-mono font-semibold">${i.monto.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="bg-orange-50 flex justify-between px-4 py-3 font-bold border-t-2 border-orange-200">
                      <span>Total</span>
                      <span className="text-orange-700 font-mono">${viewPedido.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewPedido.cilindros && viewPedido.cilindros.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-700 text-white px-4 py-2 text-sm font-semibold">Tubos asignados</div>
                  <div className="divide-y">
                    {viewPedido.cilindros.map(c => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
