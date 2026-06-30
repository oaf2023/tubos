'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ScanLine, Smartphone, Camera, Package, ShoppingCart,
  AlertTriangle, CheckCircle2, XCircle, Send, Plus, Minus,
  Eye, RefreshCw, MapPin, Calendar, Building2, User,
  FileText, ClipboardList, ListOrdered, QrCode, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/tab-constants'
import { useToast } from '@/hooks/use-toast'

// ---- Types ----
interface QuickView {
  tubeId: string; codigoTubo: string
  tipoGas: string; gasCodigo: string; gasColor: string
  capacidad: number; estado: string; presionActual: number
  clienteAsignado: string | null
  ubicacion: string; provincia: string
  fechaVencimientoPrueba: string
  ultimoMovimiento: string | null
  alertas: string[]
}

interface ResolveResponse {
  tubeId: string; quickView: QuickView
  permisos: { puedeOperar: boolean; puedePedirReposicion: boolean; puedeRetirar: boolean; puedeReportar: boolean }
  accionesDisponibles: string[]
}

interface PedidoLectura {
  id: string; clienteId: string | null; clienteNombre: string | null
  obraId: string | null; obraNombre: string | null
  usuarioId: string | null; usuarioNombre: string | null
  estado: string; prioridad: string; observacion: string | null
  contactoObra: string | null
  fechaCreacion: string; fechaEnvio: string | null
  items: PedidoLecturaItem[]
}

interface PedidoLecturaItem {
  id: string; pedidoId: string
  cylinderId: string | null; codigoTubo: string | null
  tipoGas: string | null; capacidad: number | null
  accion: string; cantidad: number; observacion: string | null
  fotoUrl: string | null; cylinder?: { numeroSerie: string; gas: { nombre: string; codigo: string; colorHex: string } } | null
}

interface ClienteOption {
  id: string; nombre: string
}

const ESTADO_PEDIDO_COLORS: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-600',
  ENVIADO: 'bg-blue-100 text-blue-700',
  VALIDADO: 'bg-emerald-100 text-emerald-700',
  EN_PREPARACION: 'bg-amber-100 text-amber-700',
  EN_REPARTO: 'bg-violet-100 text-violet-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CERRADO: 'bg-slate-200 text-slate-700',
  RECHAZADO: 'bg-red-100 text-red-700',
}

const ESTADO_TUBO_LABELS: Record<string, string> = {
  LLENO: 'Lleno', VACIO: 'Vacío', EN_CLIENTE: 'En cliente',
  EN_REPARTO: 'En reparto', EN_CARGA: 'En carga', EN_DEPOSITO: 'En depósito',
  MANTENIMIENTO: 'Mantenimiento', RETENIDO: 'Retenido', PH_VENCIDO: 'PH vencido',
  BAJA: 'Baja', EXTRAVIADO: 'Extraviado',
}

const ESTADO_TUBO_COLORS: Record<string, string> = {
  LLENO: 'bg-emerald-500', VACIO: 'bg-slate-400', EN_CLIENTE: 'bg-orange-500',
  EN_REPARTO: 'bg-blue-500', EN_CARGA: 'bg-violet-500', EN_DEPOSITO: 'bg-teal-500',
  MANTENIMIENTO: 'bg-red-500', RETENIDO: 'bg-rose-500', PH_VENCIDO: 'bg-rose-700',
  BAJA: 'bg-gray-600', EXTRAVIADO: 'bg-pink-700',
}

function getAlertColor(alert: string) {
  if (alert.includes('VENCIDA') || alert.includes('RECALIFICACIÓN')) return 'text-red-600 bg-red-50 border-red-200'
  if (alert.includes('PRÓXIMA')) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-slate-600 bg-slate-50 border-slate-200'
}

export default function LecturaTab({ user }: { user?: any }) {
  const { toast } = useToast()
  const [activeView, setActiveView] = useState<'scanner' | 'carrito' | 'pedidos'>('scanner')

  // Scanner state
  const [tagInput, setTagInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [resolveResult, setResolveResult] = useState<ResolveResponse | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cart state
  const [cart, setCart] = useState<Array<{ tubeId: string; codigoTubo: string; accion: string; cantidad: number }>>([])
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [observacionGeneral, setObservacionGeneral] = useState('')
  const [prioridad, setPrioridad] = useState('NORMAL')
  const [contactoObra, setContactoObra] = useState('')

  // Orders state
  const [pedidos, setPedidos] = useState<PedidoLectura[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(false)
  const [viewPedido, setViewPedido] = useState<PedidoLectura | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: '' })
  const [rejectMotivo, setRejectMotivo] = useState('')

  // Client/obra selectors
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [selectedClienteId, setSelectedClienteId] = useState('')
  const [selectedClienteNombre, setSelectedClienteNombre] = useState('')

  const esCliente = user?.tipo === 'cliente'
  const esUsuario = !esCliente

  // Initialize client for client users
  useEffect(() => {
    if (esCliente && user?.clienteId) {
      setSelectedClienteId(user.clienteId)
      setSelectedClienteNombre(user.nombre)
    }
  }, [esCliente, user])

  useEffect(() => {
    if (esUsuario) {
      fetch('/api/clientes')
        .then(r => r.json())
        .then(data => setClientes(Array.isArray(data) ? data.map((c: any) => ({ id: c.id, nombre: c.nombre })) : []))
        .catch(() => {})
    }
  }, [esUsuario])

  // ---- Camera handling ----
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
    } catch {
      toast({ title: 'Error', description: 'No se pudo acceder a la cámara', variant: 'destructive' })
    }
  }, [toast])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }, [])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  // ---- Resolve tag ----
  const resolveTag = useCallback(async (valor: string, origen = 'CELULAR_QR') => {
    if (!valor.trim()) return
    setScanning(true)
    setResolveResult(null)
    try {
      const res = await fetch('/api/mobile/resolve-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: valor.trim(), origen }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al leer tag')
      }
      const data: ResolveResponse = await res.json()
      setResolveResult(data)
      if (data.quickView.alertas.length > 0) {
        toast({ title: 'Alertas', description: data.quickView.alertas.join(', '), variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Tag no reconocido', variant: 'destructive' })
    } finally {
      setScanning(false)
      setTagInput('')
      stopCamera()
    }
  }, [toast, stopCamera])

  // ---- Add to cart ----
  const addToCart = useCallback(async (accion: string) => {
    if (!resolveResult) return
    const { tubeId, quickView } = resolveResult
    const exists = cart.find(c => c.tubeId === tubeId)
    if (exists) {
      setCart(cart.map(c => c.tubeId === tubeId ? { ...c, accion, cantidad: c.cantidad + 1 } : c))
    } else {
      setCart([...cart, { tubeId, codigoTubo: quickView.codigoTubo, accion, cantidad: 1 }])
    }
    toast({ title: 'Agregado', description: `${quickView.codigoTubo} - ${accion}` })
    setResolveResult(null)
  }, [resolveResult, cart, toast])

  // ---- Create and submit order ----
  const enviarPedido = useCallback(async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrito vacío', description: 'Escaneá tubos antes de enviar', variant: 'destructive' })
      return
    }
    if (!selectedClienteId) {
      toast({ title: 'Cliente requerido', description: 'Seleccioná un cliente', variant: 'destructive' })
      return
    }
    try {
      let orderId = currentOrderId
      if (!orderId) {
        const res = await fetch('/api/cliente/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: selectedClienteId,
            clienteNombre: selectedClienteNombre,
            observacion: observacionGeneral || null,
            prioridad,
            contactoObra: contactoObra || null,
          }),
        })
        if (!res.ok) throw new Error('Error al crear pedido')
        const order = await res.json()
        orderId = order.id
        setCurrentOrderId(orderId)
      }
      for (const item of cart) {
        await fetch(`/api/cliente/orders/${orderId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cylinderId: item.tubeId,
            codigoTubo: item.codigoTubo,
            accion: item.accion,
            cantidad: item.cantidad,
          }),
        })
      }
      const submitRes = await fetch(`/api/cliente/orders/${orderId}/submit`, { method: 'POST' })
      if (!submitRes.ok) throw new Error('Error al enviar pedido')
      toast({ title: 'Pedido enviado', description: 'El pedido fue enviado correctamente' })
      setCart([]); setCurrentOrderId(null); setObservacionGeneral(''); setPrioridad('NORMAL')
      setContactoObra(''); setActiveView('pedidos')
      loadPedidos()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    }
  }, [cart, selectedClienteId, selectedClienteNombre, observacionGeneral, prioridad, contactoObra, currentOrderId, toast])

  // ---- Load pedidos ----
  const loadPedidos = useCallback(async () => {
    setLoadingPedidos(true)
    try {
      const params = new URLSearchParams()
      if (esCliente && user?.clienteId) params.set('clienteId', user.clienteId)
      const res = await fetch(`/api/cliente/orders?${params}`)
      const data = await res.json()
      setPedidos(Array.isArray(data) ? data : [])
    } catch { /* ok */ }
    finally { setLoadingPedidos(false) }
  }, [esCliente, user])

  useEffect(() => { loadPedidos() }, [loadPedidos])

  // ---- Internal actions ----
  const internalAction = useCallback(async (action: string, orderId: string) => {
    try {
      const res = await fetch(`/api/internal/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ motivo: rejectMotivo }) : undefined,
      })
      if (!res.ok) throw new Error('Error')
      toast({ title: 'Actualizado', description: `Pedido ${action === 'reject' ? 'rechazado' : action === 'validate' ? 'validado' : action === 'prepare' ? 'en preparación' : 'cerrado'}` })
      setRejectDialog({ open: false, orderId: '' })
      setRejectMotivo('')
      loadPedidos()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }, [rejectMotivo, toast, loadPedidos])

  // ---- clear cart ----
  const removeFromCart = useCallback((tubeId: string) => {
    setCart(cart.filter(c => c.tubeId !== tubeId))
  }, [cart])

  // ---------------- Render ----------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Lectura Celular</h2>
        </div>
        <div className="flex items-center gap-2">
          {esUsuario && selectedClienteNombre && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
              <Building2 className="w-3 h-3 mr-1" />{selectedClienteNombre}
            </Badge>
          )}
          {esCliente && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
              <Building2 className="w-3 h-3 mr-1" />{user?.nombre}
            </Badge>
          )}
        </div>
      </div>

      {/* View tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="scanner" className="flex items-center gap-1">
            <QrCode className="w-4 h-4" /><span>Escanear</span>
          </TabsTrigger>
          <TabsTrigger value="carrito" className="flex items-center gap-1">
            <ShoppingCart className="w-4 h-4" /><span>Carrito {cart.length > 0 && <Badge className="ml-1 bg-orange-500 text-white text-[10px] px-1.5">{cart.length}</Badge>}</span>
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center gap-1">
            <ListOrdered className="w-4 h-4" /><span>Pedidos</span>
          </TabsTrigger>
        </TabsList>

        {/* ========== SCANNER ========== */}
        <TabsContent value="scanner" className="space-y-4 mt-2">
          {/* Client selector for usuarios */}
          {esUsuario && (
            <Card className="border-orange-200">
              <CardContent className="p-3">
                <Label className="text-xs text-slate-500">Cliente / Obra</Label>
                <Select value={selectedClienteId} onValueChange={(v) => {
                  const c = clientes.find(x => x.id === v)
                  setSelectedClienteId(v)
                  setSelectedClienteNombre(c?.nombre || '')
                }}>
                  <SelectTrigger className="bg-white mt-1">
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Camera / QR */}
          <Card className={`border-dashed border-2 ${showCamera ? 'border-orange-400' : 'border-slate-300'}`}>
            <CardContent className="p-4 space-y-3">
              {showCamera ? (
                <div className="relative">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-h-64 rounded-lg bg-black" />
                  <Button variant="outline" size="sm" className="absolute top-2 right-2 bg-white/80" onClick={stopCamera}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-slate-500 mt-1 text-center">Acercá el código QR a la cámara</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Camera className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 mb-3">Escaneá el código QR del tubo</p>
                  <Button onClick={startCamera} className="bg-gradient-to-r from-orange-500 to-red-600">
                    <Camera className="w-4 h-4 mr-2" />Abrir cámara
                  </Button>
                  <p className="text-xs text-slate-400 mt-2">O ingresá el código manualmente</p>
                </div>
              )}

              {/* Manual input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Código del tag / QR..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') resolveTag(tagInput) }}
                  className="flex-1"
                  disabled={scanning}
                />
                <Button onClick={() => resolveTag(tagInput)} disabled={!tagInput.trim() || scanning} className="bg-slate-800 text-white hover:bg-slate-700">
                  {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                </Button>
              </div>

              {/* NFC hint */}
              <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                <Smartphone className="w-3 h-3" />
                Si tu dispositivo tiene NFC, acercalo al tubo
              </p>
            </CardContent>
          </Card>

          {/* Quick View Result */}
          {resolveResult && (
            <Card className="border-l-4 border-l-orange-500 shadow-md">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    <span className="font-bold text-lg">{resolveResult.quickView.codigoTubo}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full ${ESTADO_TUBO_COLORS[resolveResult.quickView.estado] || 'bg-slate-400'}`} />
                    <span className="text-sm font-medium">{ESTADO_TUBO_LABELS[resolveResult.quickView.estado] || resolveResult.quickView.estado}</span>
                  </div>
                </div>

                {/* Gas info */}
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-3">
                  <div>
                    <span className="text-slate-500 text-xs">Gas</span>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="w-3 h-3 rounded-full" style={{ background: resolveResult.quickView.gasColor }} />
                      {resolveResult.quickView.tipoGas}
                    </div>
                  </div>
                  <div><span className="text-slate-500 text-xs">Capacidad</span><p className="font-semibold">{resolveResult.quickView.capacidad} L</p></div>
                  <div><span className="text-slate-500 text-xs">Cliente</span><p className="font-semibold">{resolveResult.quickView.clienteAsignado || '—'}</p></div>
                  <div><span className="text-slate-500 text-xs">Ubicación</span><p className="font-semibold text-xs">{resolveResult.quickView.ubicacion || '—'}</p></div>
                  <div><span className="text-slate-500 text-xs">Venc. PH</span><p className="font-semibold">{formatDate(resolveResult.quickView.fechaVencimientoPrueba)}</p></div>
                  <div><span className="text-slate-500 text-xs">Últ. movimiento</span><p className="font-semibold">{resolveResult.quickView.ultimoMovimiento ? formatDate(resolveResult.quickView.ultimoMovimiento) : '—'}</p></div>
                </div>

                {/* Alertas */}
                {resolveResult.quickView.alertas.length > 0 && (
                  <div className="space-y-1">
                    {resolveResult.quickView.alertas.map((a, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border ${getAlertColor(a)}`}>
                        <AlertTriangle className="w-3 h-3" />{a}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {resolveResult.permisos.puedeOperar ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => addToCart('REPONER')}>
                      <Package className="w-4 h-4 mr-1" />Reponer
                    </Button>
                    <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => addToCart('RETIRAR')}>
                      <Send className="w-4 h-4 mr-1" />Retirar
                    </Button>
                    <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => addToCart('MANTENER')}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />Mantener
                    </Button>
                    <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => addToCart('REPORTAR')}>
                      <AlertTriangle className="w-4 h-4 mr-1" />Reportar
                    </Button>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Este tubo no está asignado a tu cuenta
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== CART ========== */}
        <TabsContent value="carrito" className="space-y-4 mt-2">
          {esUsuario && !selectedClienteId ? (
            <div className="text-center py-8 text-slate-500">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Seleccioná un cliente para armar un pedido
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Escaneá tubos para agregarlos al carrito
            </div>
          ) : (
            <>
              <Card className="border-orange-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1">
                      <ShoppingCart className="w-4 h-4 text-orange-500" />
                      Carrito ({cart.length} ítems)
                    </h3>
                    <Button variant="ghost" size="sm" className="text-red-500 text-xs h-7" onClick={() => setCart([])}>
                      <Trash2 className="w-3 h-3 mr-1" />Vaciar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {cart.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
                        <div>
                          <span className="font-mono font-semibold text-sm">{item.codigoTubo}</span>
                          <Badge className="ml-2 text-[10px] bg-slate-200 text-slate-700">{item.accion}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => {
                              setCart(cart.map((c, ci) => ci === i ? { ...c, cantidad: Math.max(1, c.cantidad - 1) } : c))
                            }}><Minus className="w-3 h-3" /></Button>
                            <span className="w-6 text-center text-sm font-semibold">{item.cantidad}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => {
                              setCart(cart.map((c, ci) => ci === i ? { ...c, cantidad: c.cantidad + 1 } : c))
                            }}><Plus className="w-3 h-3" /></Button>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeFromCart(item.tubeId)}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Prioridad</Label>
                      <Select value={prioridad} onValueChange={setPrioridad}>
                        <SelectTrigger className="bg-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BAJA">Baja</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="ALTA">Alta</SelectItem>
                          <SelectItem value="URGENTE">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Contacto en obra</Label>
                      <Input value={contactoObra} onChange={(e) => setContactoObra(e.target.value)} placeholder="Nombre / teléfono" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Observación general</Label>
                    <Textarea value={observacionGeneral} onChange={(e) => setObservacionGeneral(e.target.value)} placeholder="Notas para el pedido..." className="mt-1" rows={2} />
                  </div>
                  <Button onClick={enviarPedido} className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
                    <Send className="w-4 h-4 mr-2" />Enviar Pedido ({cart.length} ítems)
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== PEDIDOS ========== */}
        <TabsContent value="pedidos" className="space-y-4 mt-2">
          {/* Client filter for usuarios */}
          {esUsuario && (
            <div className="flex gap-2">
              <Select value={selectedClienteId} onValueChange={(v) => {
                const c = clientes.find(x => x.id === v)
                setSelectedClienteId(v)
                setSelectedClienteNombre(c?.nombre || '')
                loadPedidos()
              }}>
                <SelectTrigger className="bg-white max-w-xs">
                  <SelectValue placeholder="Filtrar por cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loadingPedidos ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ListOrdered className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No hay pedidos
            </div>
          ) : (
            <div className="space-y-2">
              {pedidos.map(p => (
                <Card key={p.id} className={`hover:shadow-md transition-shadow border-l-4 ${p.estado === 'ENVIADO' ? 'border-l-blue-500' : p.estado === 'VALIDADO' ? 'border-l-emerald-500' : p.estado === 'RECHAZADO' ? 'border-l-red-500' : p.estado === 'CERRADO' ? 'border-l-slate-400' : 'border-l-orange-400'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{p.clienteNombre}</span>
                          <Badge className={`text-[10px] ${ESTADO_PEDIDO_COLORS[p.estado] || 'bg-slate-100 text-slate-600'}`}>{p.estado}</Badge>
                          <Badge variant="outline" className="text-[10px]">{p.prioridad}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(p.fechaCreacion)}</span>
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />{p.items?.length || 0} ítems</span>
                          {p.contactoObra && <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.contactoObra}</span>}
                        </div>
                        {p.observacion && <p className="text-xs text-slate-400 mt-1 truncate max-w-md">{p.observacion}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPedido(p)} title="Ver detalle">
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                        {/* Internal actions */}
                        {esUsuario && p.estado === 'ENVIADO' && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600 border-emerald-300" onClick={() => internalAction('validate', p.id)}>Validar</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-300" onClick={() => setRejectDialog({ open: true, orderId: p.id })}>Rechazar</Button>
                          </>
                        )}
                        {esUsuario && p.estado === 'VALIDADO' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600 border-amber-300" onClick={() => internalAction('prepare', p.id)}>Preparar</Button>
                        )}
                        {esUsuario && (p.estado === 'EN_PREPARACION' || p.estado === 'EN_REPARTO') && (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-slate-600" onClick={() => internalAction('close', p.id)}>Cerrar</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== ORDER DETAIL DIALOG ========== */}
      <Dialog open={!!viewPedido} onOpenChange={(o) => { if (!o) setViewPedido(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Pedido — {viewPedido?.clienteNombre}
            </DialogTitle>
            <DialogDescription>Detalle completo del pedido de lectura</DialogDescription>
          </DialogHeader>
          {viewPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500 text-xs">Estado</span>
                  <p><Badge className={`text-xs ${ESTADO_PEDIDO_COLORS[viewPedido.estado] || ''}`}>{viewPedido.estado}</Badge></p>
                </div>
                <div><span className="text-slate-500 text-xs">Prioridad</span><p className="font-semibold">{viewPedido.prioridad}</p></div>
                <div><span className="text-slate-500 text-xs">Fecha</span><p className="font-semibold">{formatDate(viewPedido.fechaCreacion)}</p></div>
                <div><span className="text-slate-500 text-xs">Contacto</span><p className="font-semibold">{viewPedido.contactoObra || '—'}</p></div>
              </div>
              {viewPedido.observacion && (
                <div className="text-sm bg-slate-50 p-2 rounded"><span className="text-slate-500 text-xs">Observación</span><p>{viewPedido.observacion}</p></div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">Items ({viewPedido.items.length})</div>
                <div className="divide-y">
                  {viewPedido.items.map(i => (
                    <div key={i.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs">{i.codigoTubo || '—'}</span>
                        <Badge className="text-[10px] bg-slate-200 text-slate-700">{i.accion}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {i.tipoGas && <span className="text-xs text-slate-500">{i.tipoGas}</span>}
                        <span className="font-mono font-semibold">×{i.cantidad}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== REJECT DIALOG ========== */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => setRejectDialog({ open: o, orderId: o ? rejectDialog.orderId : '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Rechazar pedido
            </DialogTitle>
            <DialogDescription>Ingresá el motivo del rechazo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Motivo del rechazo..."
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, orderId: '' })}>Cancelar</Button>
              <Button variant="destructive" onClick={() => internalAction('reject', rejectDialog.orderId)} disabled={!rejectMotivo.trim()}>Rechazar pedido</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
