'use client'

import { useState } from 'react'
import {
  BarChart3, DollarSign, ShoppingCart, Package, Truck, MessageCircle,
  AlertTriangle, TrendingUp, FileText, Download, Calendar,
  ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

// ─── Mock Data ──────────────────────────────────────────

const MOCK_KPIS = {
  // Comerciales
  ventasBrutas: 2845690.50,
  ventasNetas: 2618035.26,
  cantidadOrdenes: 847,
  ticketPromedio: 3360.20,
  unidadesVendidas: 1523,
  productoTope: 'Argón 5.0',
  publicacionTop: 'CAUDALIMETRO ARGON 0-25L',
  tasaCancelacion: 3.2,
  // Financieros
  totalCobrado: 2712340.00,
  totalNeto: 2456780.00,
  totalComisiones: 189230.50,
  totalReembolsos: 34210.80,
  totalContracargos: 8920.00,
  dineroDisponible: 892340.00,
  dineroPendiente: 423500.00,
  diferenciaConciliacion: 12560.00,
  // Operativos
  enviosPendientes: 43,
  enviosEntregados: 721,
  enviosDemorados: 12,
  reclamosAbiertos: 8,
  devolucionesAbiertas: 5,
  preguntasSinResponder: 14,
  publicacionesActivas: 156,
  productosBajoStock: 23,
}

const MOCK_VENTAS_PERIODO = [
  { mes: 'Feb', ventas: 420000, cobrado: 390000 },
  { mes: 'Mar', ventas: 380000, cobrado: 365000 },
  { mes: 'Abr', ventas: 510000, cobrado: 480000 },
  { mes: 'May', ventas: 470000, cobrado: 445000 },
  { mes: 'Jun', ventas: 490000, cobrado: 460000 },
  { mes: 'Jul', ventas: 535000, cobrado: 500000 },
]

const MOCK_ORDENES_ESTADO = [
  { name: 'Pagadas', value: 520, color: '#16a34a' },
  { name: 'Enviadas', value: 180, color: '#2563eb' },
  { name: 'Entregadas', value: 95, color: '#7c3aed' },
  { name: 'Canceladas', value: 27, color: '#dc2626' },
  { name: 'Reembolsadas', value: 15, color: '#ea580c' },
]

const MOCK_ENVIOS_ESTADO = [
  { name: 'Pendientes', value: 43, color: '#eab308' },
  { name: 'Despachados', value: 156, color: '#2563eb' },
  { name: 'En tránsito', value: 234, color: '#7c3aed' },
  { name: 'Entregados', value: 331, color: '#16a34a' },
  { name: 'Demorados', value: 12, color: '#dc2626' },
]

const MOCK_CONCILIACION = [
  { id: 1, orderId: 'MLA-2309841', paymentId: '98765432', fecha: '05/07/2026', importeOrden: 12500.00, importePago: 12500.00, neto: 11250.00, comision: 1250.00, diferencia: 0, alerta: 'OK' },
  { id: 2, orderId: 'MLA-2309842', paymentId: '98765433', fecha: '04/07/2026', importeOrden: 8900.00, importePago: 8900.00, neto: 8010.00, comision: 890.00, diferencia: 0, alerta: 'OK' },
  { id: 3, orderId: 'MLA-2309843', paymentId: null, fecha: '04/07/2026', importeOrden: 3450.00, importePago: 0, neto: 0, comision: 0, diferencia: 3450.00, alerta: 'ORDEN_SIN_PAGO' },
  { id: 4, orderId: 'MLA-2309844', paymentId: '98765434', fecha: '03/07/2026', importeOrden: 22000.00, importePago: 21500.00, neto: 19350.00, comision: 2150.00, diferencia: 500.00, alerta: 'DIFERENCIA' },
  { id: 5, orderId: null, paymentId: '98765435', fecha: '03/07/2026', importeOrden: 0, importePago: 6700.00, neto: 6030.00, comision: 670.00, diferencia: 6700.00, alerta: 'PAGO_SIN_ORDEN' },
  { id: 6, orderId: 'MLA-2309845', paymentId: '98765436', fecha: '02/07/2026', importeOrden: 15600.00, importePago: 15600.00, neto: 14040.00, comision: 1560.00, diferencia: 0, alerta: 'OK' },
  { id: 7, orderId: 'MLA-2309846', paymentId: '98765437', fecha: '02/07/2026', importeOrden: 4800.00, importePago: 4800.00, neto: 4320.00, comision: 480.00, diferencia: 0, alerta: 'OK' },
  { id: 8, orderId: 'MLA-2309847', paymentId: null, fecha: '01/07/2026', importeOrden: 18900.00, importePago: 0, neto: 0, comision: 0, diferencia: 18900.00, alerta: 'DINERO_RETENIDO' },
]

const MOCK_PRODUCTOS_VENTA = [
  { name: 'Argón 5.0', vendidos: 320, ingresos: 896000 },
  { name: 'Oxígeno 10L', vendidos: 245, ingresos: 612500 },
  { name: 'Acetileno 3kg', vendidos: 180, ingresos: 540000 },
  { name: 'CO2 20L', vendidos: 165, ingresos: 412500 },
  { name: 'Nitrógeno 10L', vendidos: 120, ingresos: 360000 },
]

const MOCK_EVOLUCION_CAJA = [
  { mes: 'Feb', disponible: 520000, pendiente: 310000 },
  { mes: 'Mar', disponible: 490000, pendiente: 340000 },
  { mes: 'Abr', disponible: 680000, pendiente: 380000 },
  { mes: 'May', disponible: 610000, pendiente: 400000 },
  { mes: 'Jun', disponible: 750000, pendiente: 390000 },
  { mes: 'Jul', disponible: 892340, pendiente: 423500 },
]

// ─── Helpers ──────────────────────────────────────────────

const fnum = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fint = (n: number) => n.toLocaleString('es-AR')

function KpiCard({ icon, label, value, color, trend }: { icon: React.ReactNode; label: string; value: string; color: string; trend?: { dir: 'up' | 'down'; pct: string } }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
            {trend && (
              <p className={`text-xs mt-1 flex items-center gap-0.5 ${trend.dir === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend.dir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend.pct}
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Semaphore({ alerta }: { alerta: string }) {
  if (alerta === 'OK') return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">OK</Badge>
  if (alerta === 'ORDEN_SIN_PAGO' || alerta === 'PAGO_SIN_ORDEN' || alerta === 'CONTROCARGO_PENDIENTE')
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">{alerta.replace(/_/g, ' ')}</Badge>
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">{alerta.replace(/_/g, ' ')}</Badge>
}

// ─── Main Component ───────────────────────────────────────

export default function GerenciaTab() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const k = MOCK_KPIS

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-yellow-600" />
          <h2 className="text-2xl font-bold">Gerencia</h2>
          <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs ml-2">Modo demo</Badge>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />Sincronizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto gap-1 mb-6 h-auto p-1 scrollbar-thin">
          <TabsTrigger value="dashboard" className="flex items-center gap-1 py-2 px-3 text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4" />Dashboard
          </TabsTrigger>
          <TabsTrigger value="ml" className="flex items-center gap-1 py-2 px-3 text-xs sm:text-sm">
            <ShoppingCart className="w-4 h-4" />Mercado Libre
          </TabsTrigger>
          <TabsTrigger value="mp" className="flex items-center gap-1 py-2 px-3 text-xs sm:text-sm">
            <DollarSign className="w-4 h-4" />Mercado Pago
          </TabsTrigger>
          <TabsTrigger value="conciliacion" className="flex items-center gap-1 py-2 px-3 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4" />Conciliación
          </TabsTrigger>
          <TabsTrigger value="reportes" className="flex items-center gap-1 py-2 px-3 text-xs sm:text-sm">
            <FileText className="w-4 h-4" />Reportes
          </TabsTrigger>
        </TabsList>

        {/* ─── Dashboard Ejecutivo ─── */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPIs Comerciales */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />Comerciales
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Ventas Brutas" value={`$${fnum(k.ventasBrutas)}`} color="from-emerald-500 to-emerald-600" trend={{ dir: 'up', pct: '+12.3%' }} />
              <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Ventas Netas" value={`$${fnum(k.ventasNetas)}`} color="from-blue-500 to-blue-600" trend={{ dir: 'up', pct: '+9.8%' }} />
              <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Órdenes" value={fint(k.cantidadOrdenes)} color="from-violet-500 to-violet-600" trend={{ dir: 'up', pct: '+5.2%' }} />
              <KpiCard icon={<BarChart3 className="w-5 h-5" />} label="Ticket Promedio" value={`$${fnum(k.ticketPromedio)}`} color="from-amber-500 to-amber-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <KpiCard icon={<Package className="w-5 h-5" />} label="Unidades Vendidas" value={fint(k.unidadesVendidas)} color="from-cyan-500 to-cyan-600" />
              <KpiCard icon={<Package className="w-5 h-5" />} label="Producto Top" value={k.productoTope} color="from-rose-500 to-rose-600" />
              <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Pub. Más Rentable" value={k.publicacionTop} color="from-orange-500 to-orange-600" />
              <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Tasa Cancelación" value={`${k.tasaCancelacion}%`} color={k.tasaCancelacion > 5 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} />
            </div>
          </div>

          {/* KPIs Financieros */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />Financieros
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Total Cobrado" value={`$${fnum(k.totalCobrado)}`} color="from-green-600 to-green-700" />
              <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Neto Recibido" value={`$${fnum(k.totalNeto)}`} color="from-blue-600 to-blue-700" />
              <KpiCard icon={<ArrowUpRight className="w-5 h-5" />} label="Comisiones" value={`$${fnum(k.totalComisiones)}`} color="from-red-500 to-red-600" />
              <KpiCard icon={<ArrowDownRight className="w-5 h-5" />} label="Reembolsos" value={`$${fnum(k.totalReembolsos)}`} color="from-amber-500 to-amber-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Contracargos" value={`$${fnum(k.totalContracargos)}`} color="from-red-600 to-red-700" />
              <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Disp. en Cuenta" value={`$${fnum(k.dineroDisponible)}`} color="from-green-500 to-green-600" />
              <KpiCard icon={<Calendar className="w-5 h-5" />} label="Pend. Liberar" value={`$${fnum(k.dineroPendiente)}`} color="from-yellow-500 to-yellow-600" />
              <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Dif. Conciliación" value={`$${fnum(k.diferenciaConciliacion)}`} color={k.diferenciaConciliacion > 10000 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} />
            </div>
          </div>

          {/* KPIs Operativos */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4" />Operativos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={<Truck className="w-5 h-5" />} label="Envíos Pendientes" value={fint(k.enviosPendientes)} color={k.enviosPendientes > 50 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600'} />
              <KpiCard icon={<Truck className="w-5 h-5" />} label="Envíos Entregados" value={fint(k.enviosEntregados)} color="from-green-500 to-green-600" />
              <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Envíos Demorados" value={fint(k.enviosDemorados)} color={k.enviosDemorados > 10 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600'} />
              <KpiCard icon={<MessageCircle className="w-5 h-5" />} label="Reclamos Abiertos" value={fint(k.reclamosAbiertos)} color={k.reclamosAbiertos > 5 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600'} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <KpiCard icon={<Package className="w-5 h-5" />} label="Devoluciones" value={fint(k.devolucionesAbiertas)} color={k.devolucionesAbiertas > 3 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600'} />
              <KpiCard icon={<MessageCircle className="w-5 h-5" />} label="Preguntas Sin Resp." value={fint(k.preguntasSinResponder)} color={k.preguntasSinResponder > 10 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600'} />
              <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Publicaciones Act." value={fint(k.publicacionesActivas)} color="from-blue-500 to-blue-600" />
              <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Bajo Stock" value={fint(k.productosBajoStock)} color={k.productosBajoStock > 20 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600'} />
            </div>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Ventas vs Cobrado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={MOCK_VENTAS_PERIODO}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="ventas" name="Ventas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cobrado" name="Cobrado" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Órdenes por Estado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={MOCK_ORDENES_ESTADO} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {MOCK_ORDENES_ESTADO.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Mercado Libre ─── */}
        <TabsContent value="ml" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Ventas por Período</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={MOCK_VENTAS_PERIODO}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ventas" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Ventas por Producto (Top 5)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={MOCK_PRODUCTOS_VENTA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="vendidos" name="Unidades" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Órdenes por Estado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={MOCK_ORDENES_ESTADO} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {MOCK_ORDENES_ESTADO.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Envíos por Estado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={MOCK_ENVIOS_ESTADO} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {MOCK_ENVIOS_ESTADO.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Mercado Pago ─── */}
        <TabsContent value="mp" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Saldo Disponible" value={`$${fnum(k.dineroDisponible)}`} color="from-green-500 to-green-600" />
            <KpiCard icon={<Calendar className="w-5 h-5" />} label="Saldo Pendiente" value={`$${fnum(k.dineroPendiente)}`} color="from-yellow-500 to-yellow-600" />
            <KpiCard icon={<ArrowUpRight className="w-5 h-5" />} label="Comisiones" value={`$${fnum(k.totalComisiones)}`} color="from-red-500 to-red-600" />
            <KpiCard icon={<ArrowDownRight className="w-5 h-5" />} label="Reembolsos" value={`$${fnum(k.totalReembolsos)}`} color="from-amber-500 to-amber-600" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Evolución de Caja</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={MOCK_EVOLUCION_CAJA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="disponible" name="Disponible" fill="#16a34a" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="pendiente" name="Pendiente" fill="#eab308" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Conciliación ─── */}
        <TabsContent value="conciliacion" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Matriz de Conciliación</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-3">Orden</th>
                      <th className="py-2 pr-3">Pago</th>
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3 text-right">Importe Orden</th>
                      <th className="py-2 pr-3 text-right">Importe Pago</th>
                      <th className="py-2 pr-3 text-right">Neto</th>
                      <th className="py-2 pr-3 text-right">Comisión</th>
                      <th className="py-2 pr-3 text-right">Diferencia</th>
                      <th className="py-2 pr-3">Alerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_CONCILIACION.map(row => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-3 font-mono">{row.orderId || '—'}</td>
                        <td className="py-2 pr-3 font-mono">{row.paymentId || '—'}</td>
                        <td className="py-2 pr-3">{row.fecha}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">${fnum(row.importeOrden)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">${fnum(row.importePago)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">${fnum(row.neto!)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">${fnum(row.comision!)}</td>
                        <td className={`py-2 pr-3 text-right tabular-nums ${row.diferencia > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                          ${fnum(row.diferencia)}
                        </td>
                        <td className="py-2 pr-3"><Semaphore alerta={row.alerta} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Reportes ─── */}
        <TabsContent value="reportes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Exportar Reportes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-sm">Resumen Diario</span>
                  </div>
                  <p className="text-xs text-slate-500">Ventas, cobros y envíos del día</p>
                </div>
                <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-sm">Resumen Semanal</span>
                  </div>
                  <p className="text-xs text-slate-500">KPIs agregados de la semana</p>
                </div>
                <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-sm">Resumen Mensual</span>
                  </div>
                  <p className="text-xs text-slate-500">Cierre mensual completo</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" />Exportar Excel</Button>
                <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" />Exportar CSV</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
