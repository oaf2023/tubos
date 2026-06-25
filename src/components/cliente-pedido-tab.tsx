'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { ShoppingCart, Plus, RefreshCw, Package, Building2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { Gas } from '@/lib/tab-types'
import { formatDate, SgaBadge } from '@/lib/tab-constants'

interface Pedido {
  id: string
  fecha: string
  cliente: string
  gas: Gas
  operacionEnvase: string
  total: number
  estado: string
  createdAt: string
}

const PRECIOS_GAS: Record<string, number> = {
  AR: 15000, C2H2: 22000, O2: 12000, CO2: 18000, N2: 10000,
  'MIX-7525': 16000, HE: 28000, 'AR-HE': 24000, H2: 35000,
}

export default function ClientePedidoTab({ clienteId, clienteNombre }: { clienteId: string; clienteNombre: string }) {
  const { toast } = useToast()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [gasId, setGasId] = useState('')
  const [operacion, setOperacion] = useState('CANJE')
  const [cantidad, setCantidad] = useState(1)
  const [phFecha, setPhFecha] = useState(() => new Date().toISOString().split('T')[0])

  const gasSel = gases.find(g => g.id === gasId)

  function phVencida(f: string): boolean | null {
    if (!f) return null
    const d = new Date(f); const hace5 = new Date(); hace5.setFullYear(hace5.getFullYear() - 5)
    return d < hace5
  }

  const totalCalc = useMemo(() => {
    if (!gasSel) return 0
    let t = (PRECIOS_GAS[gasSel.codigo] || 15000) * cantidad
    if (operacion === 'VENTA_NUEVO') t += 45000 * cantidad
    if (operacion === 'CANJE' && phVencida(phFecha) === true) t += 8500 * cantidad
    return t
  }, [gasSel, operacion, cantidad, phFecha])

  const pUnit = gasSel ? (PRECIOS_GAS[gasSel.codigo] || 15000) : 0

  const load = useCallback(async () => {
    try {
      const [pRes, gRes] = await Promise.all([
        fetch('/api/pedidos'),
        fetch('/api/gases'),
      ])
      const pData = await pRes.json()
      const gData = await gRes.json()
      setPedidos((Array.isArray(pData) ? pData as Pedido[] : []).filter(p => p.cliente === clienteNombre))
      setGases(Array.isArray(gData) ? gData : [])
    } catch { /* ok */ }
    finally { setLoading(false) }
  }, [clienteNombre])

  useEffect(() => { void load() }, [load])

  async function enviarPedido() {
    if (!gasId) { toast({ title: 'Falta el gas', variant: 'destructive' }); return }
    setCreando(true)
    try {
      const body = {
        cliente: clienteNombre,
        clienteId,
        renglones: [{
          gasId,
          operacionEnvase: operacion,
          cantidad,
          phVigente: operacion === 'CANJE' ? !phVencida(phFecha) : null,
        }],
      }
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast({ title: 'Pedido enviado', description: `$${totalCalc.toLocaleString()}` })
      setGasId(''); setCantidad(1); setOperacion('CANJE')
      setPhFecha(new Date().toISOString().split('T')[0])
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
                <Select value={gasId} onValueChange={setGasId}>
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
              </div>
              <div>
                <Label className="text-xs text-slate-500 font-medium">Operación</Label>
                <Select value={operacion} onValueChange={setOperacion}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CANJE"><div className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-blue-500" /><span>Canje (mano a mano)</span></div></SelectItem>
                    <SelectItem value="VENTA_NUEVO"><div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-emerald-600" /><span>Venta de cilindro nuevo</span></div></SelectItem>
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
              {operacion === 'CANJE' && (
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Fecha de prueba hidrostática</Label>
                  <Input type="date" value={phFecha} onChange={e => setPhFecha(e.target.value)} className="bg-white mt-1" />
                  {phVencida(phFecha) === true && <p className="text-xs text-red-600 mt-1">PH vencida — se aplicará recargo de $8.500</p>}
                </div>
              )}
            </div>
          </div>

          {/* Resumen y botón */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {gasSel && (
                <span>Subtotal: <strong className="font-mono">${pUnit.toLocaleString()}</strong> × {cantidad}</span>
              )}
              {gasSel && totalCalc > pUnit * cantidad && (
                <span className="text-orange-600 ml-2">(incluye recargos)</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total</span>
                <span className="text-xl font-bold font-mono text-orange-600">${totalCalc.toLocaleString()}</span>
              </div>
              <Button onClick={enviarPedido} disabled={!gasId || creando}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 px-6">
                {creando ? 'Enviando...' : 'Enviar Pedido'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial del cliente */}
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
                    <TableHead>Gas</TableHead>
                    <TableHead>Envase</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.gas.colorHex }} />
                          <span className="text-sm">{p.gas.nombre}</span>
                          <SgaBadge peligro={p.gas.peligro} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.operacionEnvase === 'CANJE' ? 'Canje' : 'Venta nueva'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">${p.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${p.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : p.estado === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{p.fecha ? formatDate(p.fecha) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
