'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart3, TrendingUp, Users, DollarSign, Wrench, Truck,
  ShieldCheck, Radio, Download, FileSpreadsheet, RefreshCw,
  Activity, CreditCard, AlertTriangle, MapPin, Package,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  ReferenceLine,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const COLORS = {
  LLENO: '#22c55e', EN_USO: '#3b82f6', VACIO: '#94a3b8',
  MANTENIMIENTO: '#f59e0b', TRANSITO: '#8b5cf6',
}
const ESTADOS = ['LLENO', 'EN_USO', 'VACIO', 'MANTENIMIENTO', 'TRANSITO']

const COL10 = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4']

function exportCSV(data: any[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportPrint() {
  window.print()
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[300px] rounded-xl" />
}

function ExportBar({ onCSV, onPrint }: { onCSV: () => void; onPrint: () => void }) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={onCSV}>
        <FileSpreadsheet className="w-4 h-4 mr-1" />CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onPrint}>
        <Download className="w-4 h-4 mr-1" />PDF
      </Button>
    </div>
  )
}

export default function AnalisisTab() {
  const [activeTab, setActiveTab] = useState('panel-general')
  const [periodo, setPeriodo] = useState('12')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({})

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pg, td, cl, fn, op, lg, cd, rf] = await Promise.all([
        fetch('/api/stats/analytics/panel-general').then(r => r.json()),
        fetch(`/api/stats/analytics/tendencias?meses=${periodo}`).then(r => r.json()),
        fetch('/api/stats/analytics/clientes').then(r => r.json()),
        fetch(`/api/stats/analytics/financiero?meses=${periodo}`).then(r => r.json()),
        fetch('/api/stats/analytics/operaciones').then(r => r.json()),
        fetch('/api/stats/analytics/logistica').then(r => r.json()),
        fetch('/api/stats/analytics/calidad').then(r => r.json()),
        fetch('/api/stats/analytics/rfid').then(r => r.json()),
      ])
      setData({ panelGeneral: pg, tendencias: td, clientes: cl, financiero: fn, operaciones: op, logistica: lg, calidad: cd, rfid: rf })
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [periodo])
  useEffect(() => { fetchAll() }, [fetchAll])

  const pg = data.panelGeneral || {}
  const td = data.tendencias || {}
  const cl = data.clientes || {}
  const fn = data.financiero || {}
  const op = data.operaciones || {}
  const lg = data.logistica || {}
  const cd = data.calidad || {}
  const rf = data.rfid || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold">Análisis de Datos</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Actualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto gap-1 mb-4 print:hidden">
          <TabsTrigger value="panel-general"><Activity className="w-4 h-4 mr-1" />Panel General</TabsTrigger>
          <TabsTrigger value="tendencias"><TrendingUp className="w-4 h-4 mr-1" />Tendencias</TabsTrigger>
          <TabsTrigger value="clientes"><Users className="w-4 h-4 mr-1" />Clientes</TabsTrigger>
          <TabsTrigger value="financiero"><DollarSign className="w-4 h-4 mr-1" />Financiero</TabsTrigger>
          <TabsTrigger value="operaciones"><Wrench className="w-4 h-4 mr-1" />Operaciones</TabsTrigger>
          <TabsTrigger value="logistica"><Truck className="w-4 h-4 mr-1" />Logística</TabsTrigger>
          <TabsTrigger value="calidad"><ShieldCheck className="w-4 h-4 mr-1" />Calidad</TabsTrigger>
          <TabsTrigger value="rfid"><Radio className="w-4 h-4 mr-1" />RFID</TabsTrigger>
        </TabsList>

        <div className="print:block">
          <TabsContent value="panel-general">
            {loading ? <ChartSkeleton /> : <PanelGeneral data={pg} onCSV={() => exportCSV(pg.estadoData || [], 'panel-general')} onPrint={exportPrint} />}
          </TabsContent>
          <TabsContent value="tendencias">
            {loading ? <ChartSkeleton /> : <Tendencias data={td} onCSV={() => exportCSV(td.meses || [], 'tendencias')} onPrint={exportPrint} />}
          </TabsContent>
          <TabsContent value="clientes">
            {loading ? <ChartSkeleton /> : <Clientes data={cl} onCSV={() => exportCSV(cl.topClientes || [], 'clientes')} onPrint={exportPrint} />}
          </TabsContent>
          <TabsContent value="financiero">
            {loading ? <ChartSkeleton /> : <Financiero data={fn} onCSV={() => exportCSV(fn.ingresosMensuales || [], 'financiero')} onPrint={exportPrint} />}
          </TabsContent>
          <TabsContent value="operaciones">
            {loading ? <ChartSkeleton /> : <Operaciones data={op} onCSV={() => exportCSV(op.estadoPorGas || [], 'operaciones')} onPrint={exportPrint} />}
          </TabsContent>
          <TabsContent value="logistica">
            {loading ? <ChartSkeleton /> : <Logistica data={lg} onCSV={() => exportCSV(lg.rutasPorMes || [], 'logistica')} onPrint={exportPrint} />}
          </TabsContent>
          <TabsContent value="calidad">
            {loading ? <ChartSkeleton /> : <Calidad data={cd} onCSV={() => exportCSV(cd.diagnosticos || [], 'calidad')} onPrint={exportPrint} />}
          </TabsContent>
          <TabsContent value="rfid">
            {loading ? <ChartSkeleton /> : <RFID data={rf} onCSV={() => exportCSV(rf.eventosPorZona || [], 'rfid')} onPrint={exportPrint} />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function PanelGeneral({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const k = data.kpis || {}
  const kpis = [
    { label: 'Total Cilindros', value: k.totalCilindros ?? '—', icon: Package, color: 'bg-blue-600' },
    { label: 'Clientes Activos', value: k.totalClientes ?? '—', icon: Users, color: 'bg-green-600' },
    { label: 'Ingresos del Mes', value: k.ingresosMes ? `$${Number(k.ingresosMes).toLocaleString()}` : '$0', sub: k.varIngresos ? `${k.varIngresos > 0 ? '+' : ''}${k.varIngresos}% vs mes ant` : undefined, icon: DollarSign, color: 'bg-orange-600' },
    { label: 'Movimientos del Mes', value: k.movimientosMes ?? '—', sub: k.varMovimientos ? `${k.varMovimientos > 0 ? '+' : ''}${k.varMovimientos}% vs mes ant` : undefined, icon: Activity, color: 'bg-purple-600' },
    { label: 'En Uso', value: k.enUso ?? '—', icon: TrendingUp, color: 'bg-indigo-600' },
    { label: 'Facturas Pendientes', value: k.facturasPendientes ?? '—', sub: `${k.facturasVencidas ?? 0} vencidas`, icon: AlertTriangle, color: k.facturasVencidas > 0 ? 'bg-red-600' : 'bg-amber-600' },
  ]

  const estadoData = (data.estadoData || []).map((e: any) => ({ ...e, fill: COLORS[e.estado as keyof typeof COLORS] || '#94a3b8' }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">Resumen ejecutivo</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map(kp => <KpiCard key={kp.label} {...kp} />)}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Distribución por Estado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={estadoData} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" outerRadius={100} label={({ estado, cantidad }) => `${estado} (${cantidad})`}>
                  {estadoData.map((e: any) => <Cell key={e.estado} fill={e.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Top 5 Clientes por Ingresos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.topClientes || []).slice(0, 5).map((c: any, i: number) => (
                <div key={c.cliente} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                    <span className="text-sm truncate max-w-[200px]">{c.cliente}</span>
                  </div>
                  <span className="text-sm font-semibold">${Number(c._sum?.total || 0).toLocaleString()}</span>
                </div>
              ))}
              {(!data.topClientes || data.topClientes.length === 0) && <p className="text-center text-slate-400 py-8">Sin datos</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Tendencias({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const meses = data.meses || []
  const facturacion = data.facturacion || []

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">Series de tiempo</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Movimientos de Cilindros por Mes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="CARGA" stackId="a" fill="#22c55e" />
                <Bar dataKey="DESCARGA" stackId="a" fill="#ef4444" />
                <Bar dataKey="TRASLADO" stackId="a" fill="#3b82f6" />
                <Bar dataKey="INSPECCION" stackId="a" fill="#f59e0b" />
                <Bar dataKey="REPARACION" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="ALTA" stackId="a" fill="#14b8a6" />
                <Bar dataKey="BAJA" stackId="a" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Facturación Mensual</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={facturacion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Area type="monotone" dataKey="pagada" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Pagada" />
                  <Area type="monotone" dataKey="pendiente" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Pendiente" />
                  <Area type="monotone" dataKey="vencida" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Vencida" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Pedidos por Mes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.pedidos || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" name="Cantidad" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="total" stroke="#f59e0b" name="Total $" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Costo de Mantenimiento por Mes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.mantenimiento || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#8b5cf6" name="Cantidad" />
                <Bar yAxisId="right" dataKey="costo" fill="#ef4444" name="Costo $" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Clientes({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const top = data.topClientes || []
  const cuentas = data.estadoCuenta || []
  const topC = data.topCilindros || []
  const resumen = data.resumen || {}

  const estadoColores: Record<string, string> = { AL_DIA: '#22c55e', PENDIENTE: '#f59e0b', MOROSO: '#ef4444', SIN_DATO: '#94a3b8' }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{resumen.totalClientes || 0} clientes · {resumen.conDeuda || 0} con deuda (${(resumen.totalDeuda || 0).toLocaleString()})</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Top 10 Clientes por Ingresos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="nombre" width={120} fontSize={11} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="ingresos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Estado de Cuenta</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={cuentas} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" outerRadius={100} label={({ estado, cantidad }) => `${estado} (${cantidad})`}>
                  {cuentas.map((e: any) => <Cell key={e.estado} fill={estadoColores[e.estado] || '#94a3b8'} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-lg">Clientes con más Cilindros</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">CUIT</th>
                <th className="py-2 pr-4">Tipología</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 text-right">Cilindros</th>
              </tr></thead>
              <tbody>
                {topC.map((c: any, i: number) => (
                  <tr key={c.nombre} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium">{c.nombre}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.taxId || '—'}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.tipologia || '—'}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className={c.estadoCuenta === 'AL_DIA' ? 'text-green-600' : c.estadoCuenta === 'MOROSO' ? 'text-red-600' : 'text-amber-600'}>{c.estadoCuenta || 'SIN_DATO'}</Badge>
                    </td>
                    <td className="py-2 text-right font-bold">{c.cantidad}</td>
                  </tr>
                ))}
                {topC.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Financiero({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const fn = data
  const totales = fn.resumen || {}

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">Total facturado: <strong>${(totales.totalFacturado || 0).toLocaleString()}</strong> · Pendiente: ${(totales.totalPendiente || 0).toLocaleString()} · Vencido: ${(totales.totalVencido || 0).toLocaleString()}</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Ingresos por Mes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={(fn.ingresosMensuales || []).slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={10} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Ingresos por Tipo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={(fn.ingresosPorTipo || []).filter((t: any) => t.total > 0)} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={100} label={({ tipo, total }) => `${tipo} ($${(total / 1000).toFixed(0)}k)`}>
                  {(fn.ingresosPorTipo || []).filter((t: any) => t.total > 0).map((_: any, i: number) => <Cell key={i} fill={COL10[i % 10]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Estado de Facturas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={(fn.estadoFacturas || []).filter((f: any) => f.total > 0)} dataKey="total" nameKey="estado" cx="50%" cy="50%" outerRadius={90} label={({ estado }) => estado}>
                  {(fn.estadoFacturas || []).filter((f: any) => f.total > 0).map((f: any) => <Cell key={f.estado} fill={f.estado === 'PAGADA' ? '#22c55e' : f.estado === 'VENCIDA' ? '#ef4444' : f.estado === 'PENDIENTE' ? '#f59e0b' : '#94a3b8'} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Aging de Cuentas por Cobrar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(fn.aging || []).filter((a: any) => a.total > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rango" />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={0} stroke="#000" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Operaciones({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const op = data
  const estGas = op.estadoPorGas || []
  const costos = op.costosMantenimiento || []

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{op.resumen?.totalCilindros || 0} cilindros · {op.resumen?.vencidosRetest || 0} vencidos retest · ${(op.resumen?.totalCostoMantenimiento || 0).toLocaleString()} en mantenimiento</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Estado por Tipo de Gas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={estGas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="gas" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                {ESTADOS.map(e => <Bar key={e} dataKey={e} stackId="a" fill={COLORS[e as keyof typeof COLORS] || '#94a3b8'} />)}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Costos de Mantenimiento por Tipo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={costos} dataKey="costo" nameKey="tipo" cx="50%" cy="50%" outerRadius={100} label={({ tipo }) => tipo}>
                  {costos.map((_: any, i: number) => <Cell key={i} fill={COL10[i % 10]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-lg">Calendario de Próximos Retests</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(op.retestCalendar || []).slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function Logistica({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const lg = data
  const res = lg.resumen || {}
  const rutasPM = lg.rutasPorMes || []
  const rend = lg.rendimientoCombustible || []

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{res.totalRutas || 0} rutas · Ø {res.distanciaPromedioKm || 0} km · Ø {res.paradasPromedio || 0} paradas</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Rutas por Mes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rutasPM}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={10} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Rutas" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="distancia" fill="#22c55e" name="Distancia km" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Rendimiento de Combustible</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={rend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="rendimiento" stroke="#22c55e" strokeWidth={2} name="km/l" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-lg">Vehículos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-4">Código</th>
                <th className="py-2 pr-4">Patente</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Max Tubos</th>
                <th className="py-2 pr-4">Sesiones</th>
                <th className="py-2 text-right">KM</th>
              </tr></thead>
              <tbody>
                {(lg.vehiculos || []).map((v: any) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium">{v.codigo}</td>
                    <td className="py-2 pr-4">{v.patente}</td>
                    <td className="py-2 pr-4"><Badge variant="outline" className={v.estado === 'ACTIVO' ? 'text-green-600' : 'text-amber-600'}>{v.estado}</Badge></td>
                    <td className="py-2 pr-4">{v.maxTubos || '—'}</td>
                    <td className="py-2 pr-4">{v.sesiones}</td>
                    <td className="py-2 text-right">{v.kmActual?.toLocaleString() || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Calidad({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const cd = data
  const res = cd.resumen || {}

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{res.totalValidaciones || 0} validaciones · {res.tasaInconsistencia || 0}% tasa de inconsistencia</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Validaciones por Día</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={(cd.validacionesPorDia || []).slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" fontSize={10} tickFormatter={v => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Diagnósticos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={(cd.diagnosticos || []).filter((d: any) => d.cantidad > 0)} dataKey="cantidad" nameKey="diagnostico" cx="50%" cy="50%" outerRadius={100} label={({ diagnostico }) => diagnostico}>
                  {(cd.diagnosticos || []).filter((d: any) => d.cantidad > 0).map((d: any) => <Cell key={d.diagnostico} fill={d.diagnostico === 'OK' ? '#22c55e' : d.diagnostico === 'INCONSISTENCIA' ? '#ef4444' : d.diagnostico === 'NO_REGISTRADO' ? '#f59e0b' : '#94a3b8'} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Alertas por Tipo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={(cd.alertasPorTipo || []).slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="tipo" width={120} fontSize={10} tickFormatter={v => v.replace(/_/g, ' ')} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Total" />
                <Bar dataKey="criticas" fill="#ef4444" name="Críticas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Peso Real vs Esperado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="Esperado (kg)" />
                <YAxis dataKey="y" name="Real (kg)" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: any, n: any) => [`${v} kg`, n === 'x' ? 'Esperado' : 'Real']} />
                <ReferenceLine x={0} /><ReferenceLine y={0} />
                <Scatter data={(cd.scatterData || []).slice(0, 200)} dataKey="y" fill="#3b82f6" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-lg">Alertas por Nivel</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {(cd.alertasPorNivel || []).map((a: any) => (
              <Card key={a.nivel} className={`flex-1 ${a.nivel === 'CRITICAL' ? 'bg-red-50 border-red-200' : a.nivel === 'WARNING' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold">{a.cantidad}</p>
                  <p className="text-sm text-slate-600">{a.nivel}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RFID({ data, onCSV, onPrint }: { data: any; onCSV: () => void; onPrint: () => void }) {
  const rf = data
  const res = rf.resumen || {}

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{res.totalEventos || 0} eventos totales · {res.eventosUltimaHora || 0} en la última hora</p>
        <ExportBar onCSV={onCSV} onPrint={onPrint} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Tags Totales" value={res.tagsTotales ?? '—'} icon={Radio} color="bg-blue-600" />
        <KpiCard label="Tags Asociados" value={res.tagsAsociados ?? '—'} icon={Radio} color="bg-green-600" />
        <KpiCard label="Lectores Activos" value={res.lectoresActivos ?? '—'} sub={`${res.lectoresInactivos ?? 0} inactivos`} icon={Radio} color="bg-orange-600" />
        <KpiCard label="Eventos última hora" value={res.eventosUltimaHora ?? '—'} icon={Activity} color="bg-purple-600" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Eventos RFID por Zona</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(rf.eventosPorZona || []).slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="zona" width={120} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Stock por Gas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(rf.stockGas || []).slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="gas" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="llenos" stackId="a" fill="#22c55e" name="Llenos" />
                <Bar dataKey="vacios" stackId="a" fill="#94a3b8" name="Vacíos" />
                <Bar dataKey="enReparto" stackId="a" fill="#3b82f6" name="Reparto" />
                <Bar dataKey="mantenimiento" stackId="a" fill="#f59e0b" name="Mant." />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
