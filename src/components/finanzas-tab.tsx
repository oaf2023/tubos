'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Wrench, Truck, Fuel, PieChart as PieIcon,
  BarChart3, Download, FileSpreadsheet, RefreshCw, Wallet, CreditCard,
  AlertTriangle, Receipt,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ReferenceLine,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const COL10 = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4']
const GASTO_COLORS = { mantenimiento: '#ef4444', combustible: '#f59e0b', mantCilindros: '#8b5cf6' }

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

function formatPeso(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export default function FinanzasTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [meses, setMeses] = useState('12')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats/finanzas?meses=${meses}`)
      const json = await res.json()
      if (json.error) { console.error('API error:', json.error); setData(null); return }
      setData(json)
    } catch (e) {
      console.error('Error loading finanzas', e)
    } finally {
      setLoading(false)
    }
  }, [meses])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <div className="space-y-6"><ChartSkeleton /><ChartSkeleton /><ChartSkeleton /></div>
  if (!data) return <p className="text-slate-500 text-center py-10">No hay datos financieros disponibles.</p>

  const { resumen = {}, ingresosPorTipo = [], estadoFacturas = [], serieComparativa = [], mantPorTipo = [], gastosVehiculosMensual = [], ultimosMantCilindros = [], ultimosGastosVehiculos = [] } = data || {}

  return (
    <Tabs defaultValue="panel" className="w-full">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="panel"><BarChart3 className="w-4 h-4 mr-1" />Panel General</TabsTrigger>
          <TabsTrigger value="ingresos"><TrendingUp className="w-4 h-4 mr-1" />Ingresos</TabsTrigger>
          <TabsTrigger value="gastos"><Wrench className="w-4 h-4 mr-1" />Gastos</TabsTrigger>
          <TabsTrigger value="comparativa"><PieIcon className="w-4 h-4 mr-1" />Comparativa</TabsTrigger>
          <TabsTrigger value="detalle"><Receipt className="w-4 h-4 mr-1" />Detalle</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Select value={meses} onValueChange={setMeses}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ===== PANEL GENERAL ===== */}
      <TabsContent value="panel">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Facturado (período)" value={formatPeso(resumen.totalFacturadoPeriodo)} icon={DollarSign} color="bg-green-600" />
          <KpiCard label="Ingresos este mes" value={formatPeso(resumen.ingresosDelMes)} sub={`vs mes ant: ${resumen.varIngresos > 0 ? '+' : ''}${resumen.varIngresos}%`} icon={TrendingUp} color={resumen.varIngresos >= 0 ? 'bg-blue-600' : 'bg-red-600'} />
          <KpiCard label="Total Gastos" value={formatPeso(resumen.totalGastos)} sub={`${resumen.totalMantenimiento > 0 ? `Cilindros: ${formatPeso(resumen.totalMantenimiento)}` : ''}`} icon={Wallet} color="bg-orange-600" />
          <KpiCard label="Margen" value={formatPeso(resumen.margen)} sub={`${resumen.margenPorc}%`} icon={CreditCard} color={resumen.margen >= 0 ? 'bg-purple-600' : 'bg-red-600'} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Pendiente de cobro" value={formatPeso(resumen.totalPendiente)} icon={AlertTriangle} color="bg-amber-600" />
          <KpiCard label="Vencido" value={formatPeso(resumen.totalVencido)} icon={AlertTriangle} color="bg-red-600" />
          <KpiCard label="Mant. Vehículos" value={formatPeso(resumen.totalMantVehiculos)} icon={Wrench} color="bg-slate-600" />
          <KpiCard label="Combustible" value={formatPeso(resumen.totalCombustible)} sub={`${resumen.totalLitros} L · $${resumen.precioPromedioCombustible}/L`} icon={Fuel} color="bg-yellow-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Ingresos vs Gastos */}
          {serieComparativa?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ingresos vs Gastos</CardTitle>
                <ExportBar
                  onCSV={() => exportCSV(serieComparativa, 'ingresos-vs-gastos')}
                  onPrint={exportPrint}
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={serieComparativa}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalGastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Estado facturas */}
          {estadoFacturas?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Estado Facturas</CardTitle>
                <ExportBar
                  onCSV={() => exportCSV(estadoFacturas, 'estado-facturas')}
                  onPrint={exportPrint}
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={estadoFacturas} dataKey="total" nameKey="estado" cx="50%" cy="50%" outerRadius={80} label={({ estado, total }: any) => `${estado} (${((total / (resumen.totalPagado + resumen.totalPendiente + resumen.totalVencido)) * 100).toFixed(0)}%)`}>
                      {estadoFacturas.map((_: any, i: number) => (
                        <Cell key={i} fill={[('#22c55e'), ('#f59e0b'), ('#ef4444')][i] || COL10[i % COL10.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Últimos gastos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ultimosMantCilindros?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Últimos Mant. Cilindros</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {ultimosMantCilindros.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5">
                      <span className="text-slate-600">{new Date(m.fecha).toLocaleDateString('es-AR')}</span>
                      <Badge variant="outline" className="text-xs">{m.tipo}</Badge>
                      <span className="font-medium">{formatPeso(m.costo || 0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ultimosGastosVehiculos?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Últimos Gastos Vehículos</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {ultimosGastosVehiculos.map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5">
                      <span className="text-slate-600">{new Date(g.fecha).toLocaleDateString('es-AR')}</span>
                      <Badge variant="outline" className="text-xs">{g.tipo}</Badge>
                      <span className="font-medium">{formatPeso(g.costo || 0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* ===== INGRESOS ===== */}
      <TabsContent value="ingresos">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {serieComparativa?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Evolución Ingresos</CardTitle>
                <ExportBar onCSV={() => exportCSV(serieComparativa, 'ingresos-mensuales')} onPrint={exportPrint} />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={serieComparativa}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {ingresosPorTipo?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ingresos por Tipo</CardTitle>
                <ExportBar onCSV={() => exportCSV(ingresosPorTipo, 'ingresos-por-tipo')} onPrint={exportPrint} />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={ingresosPorTipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={100} label={({ tipo }: any) => tipo}>
                      {ingresosPorTipo.map((_: any, i: number) => (
                        <Cell key={i} fill={COL10[i % COL10.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ingresos por Mes</CardTitle>
              <ExportBar onCSV={() => exportCSV(serieComparativa?.map((s: any) => ({ mes: s.mes, ingresos: s.ingresos })), 'ingresos-barra')} onPrint={exportPrint} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={serieComparativa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Resumen Ingresos</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Facturado total (período)</span><span className="font-bold">{formatPeso(resumen.totalFacturadoPeriodo)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Pagado</span><span className="font-bold text-green-600">{formatPeso(resumen.totalPagado)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Pendiente</span><span className="font-bold text-amber-600">{formatPeso(resumen.totalPendiente)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Vencido</span><span className="font-bold text-red-600">{formatPeso(resumen.totalVencido)}</span></div>
                <div className="border-t pt-2 flex justify-between text-sm"><span className="text-slate-500">Ingresos este mes</span><span className="font-bold">{formatPeso(resumen.ingresosDelMes)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Variación vs mes anterior</span><span className={`font-bold ${resumen.varIngresos >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resumen.varIngresos > 0 ? '+' : ''}{resumen.varIngresos}%</span></div>
                <div className="border-t pt-2 flex justify-between text-sm"><span className="text-slate-500">Facturas emitidas</span><span className="font-bold">{resumen.facturasPeriodo}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ===== GASTOS ===== */}
      <TabsContent value="gastos">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Mant. Cilindros" value={formatPeso(resumen.totalMantenimiento)} icon={Wrench} color="bg-purple-600" />
          <KpiCard label="Mant. Vehículos" value={formatPeso(resumen.totalMantVehiculos)} icon={Wrench} color="bg-slate-600" />
          <KpiCard label="Combustible" value={formatPeso(resumen.totalCombustible)} sub={`${resumen.totalLitros} L`} icon={Fuel} color="bg-yellow-600" />
          <KpiCard label="Total Gastos" value={formatPeso(resumen.totalGastos)} icon={Wallet} color="bg-orange-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {serieComparativa?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gastos por Mes</CardTitle>
                <ExportBar onCSV={() => exportCSV(serieComparativa, 'gastos-mensuales')} onPrint={exportPrint} />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serieComparativa}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                    <Legend />
                    <Bar dataKey="mantCilindros" name="Mant. Cilindros" fill={GASTO_COLORS.mantCilindros} stackId="a" />
                    <Bar dataKey="mantVehiculos" name="Mant. Vehículos" fill={GASTO_COLORS.mantenimiento} stackId="a" />
                    <Bar dataKey="combustible" name="Combustible" fill={GASTO_COLORS.combustible} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {mantPorTipo?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Mant. Cilindros por Tipo</CardTitle>
                <ExportBar onCSV={() => exportCSV(mantPorTipo, 'gastos-mant-tipo')} onPrint={exportPrint} />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mantPorTipo} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="tipo" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                    <Bar dataKey="total" name="Costo" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {serieComparativa?.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Evolución Gastos Vehiculares</CardTitle>
              <ExportBar onCSV={() => exportCSV(serieComparativa, 'gastos-vehiculares')} onPrint={exportPrint} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={serieComparativa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="mantVehiculos" name="Mant. Vehículos" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="combustible" name="Combustible" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ===== COMPARATIVA ===== */}
      <TabsContent value="comparativa">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ingresos vs Gastos</CardTitle>
              <ExportBar onCSV={() => exportCSV(serieComparativa, 'comparativa-ingresos-gastos')} onPrint={exportPrint} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={serieComparativa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalGastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Margen por Mes</CardTitle>
              <ExportBar onCSV={() => exportCSV(serieComparativa, 'margen-mensual')} onPrint={exportPrint} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={serieComparativa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                  <Legend />
                  <Bar dataKey="margen" name="Margen" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Distribución Gastos</CardTitle>
              <ExportBar onCSV={() => exportCSV([{ tipo: 'Mant. Cilindros', total: resumen.totalMantenimiento }, { tipo: 'Mant. Vehículos', total: resumen.totalMantVehiculos }, { tipo: 'Combustible', total: resumen.totalCombustible }], 'distribucion-gastos')} onPrint={exportPrint} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={[
                    { tipo: 'Mant. Cilindros', total: resumen.totalMantenimiento },
                    { tipo: 'Mant. Vehículos', total: resumen.totalMantVehiculos },
                    { tipo: 'Combustible', total: resumen.totalCombustible },
                  ]} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={90} label={({ tipo }: any) => tipo}>
                    {[0, 1, 2].map(i => <Cell key={i} fill={[GASTO_COLORS.mantCilindros, GASTO_COLORS.mantenimiento, GASTO_COLORS.combustible][i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPeso(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Resumen Comparativo</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Total Ingresos</span><span className="font-bold text-green-600">{formatPeso(resumen.totalFacturadoPeriodo)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Total Gastos</span><span className="font-bold text-red-600">{formatPeso(resumen.totalGastos)}</span></div>
                <div className="border-t pt-2 flex justify-between text-sm"><span className="text-slate-500">Margen Bruto</span><span className={`font-bold ${resumen.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPeso(resumen.margen)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Margen %</span><span className={`font-bold ${resumen.margenPorc >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resumen.margenPorc}%</span></div>
                <div className="border-t pt-2">
                  <p className="text-xs text-slate-400 mb-2">Composición Gastos:</p>
                  {resumen.totalMantenimiento > 0 && <div className="flex justify-between text-sm ml-2"><span className="text-slate-500">Mant. Cilindros</span><span className="font-medium">{formatPeso(resumen.totalMantenimiento)} ({(resumen.totalMantenimiento / resumen.totalGastos * 100).toFixed(0)}%)</span></div>}
                  {resumen.totalMantVehiculos > 0 && <div className="flex justify-between text-sm ml-2"><span className="text-slate-500">Mant. Vehículos</span><span className="font-medium">{formatPeso(resumen.totalMantVehiculos)} ({(resumen.totalMantVehiculos / resumen.totalGastos * 100).toFixed(0)}%)</span></div>}
                  {resumen.totalCombustible > 0 && <div className="flex justify-between text-sm ml-2"><span className="text-slate-500">Combustible</span><span className="font-medium">{formatPeso(resumen.totalCombustible)} ({(resumen.totalCombustible / resumen.totalGastos * 100).toFixed(0)}%)</span></div>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ===== DETALLE ===== */}
      <TabsContent value="detalle">
        {gastosVehiculosMensual?.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gastos Vehiculares por Mes</CardTitle>
              <ExportBar onCSV={() => exportCSV(gastosVehiculosMensual, 'gastos-vehiculares-mensual')} onPrint={exportPrint} />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 font-medium">Mes</th>
                      <th className="pb-2 font-medium text-right">Mantenimiento</th>
                      <th className="pb-2 font-medium text-right">Combustible</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosVehiculosMensual.map((g: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-1.5">{g.mes}</td>
                        <td className="py-1.5 text-right">{formatPeso(g.mantenimiento || 0)}</td>
                        <td className="py-1.5 text-right">{formatPeso(g.combustible || 0)}</td>
                        <td className="py-1.5 text-right font-medium">{formatPeso((g.mantenimiento || 0) + (g.combustible || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {mantPorTipo?.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mantenimiento Cilindros por Tipo</CardTitle>
              <ExportBar onCSV={() => exportCSV(mantPorTipo, 'mant-cilindros-tipo')} onPrint={exportPrint} />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mantPorTipo.map((m: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-1.5">{m.tipo}</td>
                        <td className="py-1.5 text-right font-medium">{formatPeso(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <style>{`
@media print {
  @page { size: A4; margin: 15mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`}</style>
    </Tabs>
  )
}
