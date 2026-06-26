'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  TrendingUp, AlertTriangle, Users, Calendar, Package, DollarSign, Activity,
  RefreshCw, Download, Printer, RotateCcw, BarChart3, Flame, Trash2, Truck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ESTADO_COLORS, ESTADO_LABELS } from '@/lib/tab-constants'

type TableroData = {
  rotacion: number
  stockCritico: Array<{
    gasId: string; gasCodigo: string; gasNombre: string; total: number
    llenos: number; porcentaje: number; critico: boolean
  }>
  clientesRetencion: Array<{
    clienteId: string; clienteNombre: string; totalCilindros: number
    promedioDias: number; riesgo: string
  }>
  ph: {
    vencidos: number; porVencer30: number; porVencer60: number; porVencer90: number
    proximos: Array<{
      id: string; numeroSerie: string; gas: string; vencimiento: string; diasRestantes: number
    }>
  }
  perdidas: { extraviados: number; baja: number; total: number; porcentaje: number }
  utilizacion: { porcentaje: number; enUso: number; total: number; porEstado: Array<{ estado: string; count: number; porcentaje: number }> }
  costos: { costoPorTubo: number; totalEntregadosEnRutas: number; totalCostosRutas: number; rutasConCosto: number }
  resumen: {
    totalCilindros: number; totalGases: number; totalClientes: number; totalRutas: number
    estadoComposition: Array<{ estado: string; cantidad: number }>
  }
}

const COLORS = ['#ea580c', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#ec4899']

function getRiesgoColor(r: string) {
  if (r === 'ALTO') return 'bg-red-100 text-red-700 border-red-300'
  if (r === 'MEDIO') return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  return 'bg-green-100 text-green-700 border-green-300'
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color || 'text-slate-800'}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color ? 'bg-opacity-10' : 'bg-slate-100'}`}>
            <Icon className={`w-5 h-5 ${color || 'text-slate-500'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TableroTab() {
  const [data, setData] = useState<TableroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stats/analytics/tablero')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setError('Error al cargar KPIs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const exportCSV = useCallback(() => {
    if (!data) return
    const rows = [
      ['Indicador', 'Valor'],
      ['Rotación (30d)', data.rotacion],
      ['% Utilización', `${data.utilizacion.porcentaje}%`],
      ['PH Vencidos', data.ph.vencidos],
      ['PH por vencer (30d)', data.ph.porVencer30],
      ['Pérdidas totales', data.perdidas.total],
      ['Costo por tubo', data.costos.costoPorTubo],
      ['Total cilindros', data.resumen.totalCilindros],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'tablero-kpis.csv'; a.click()
    URL.revokeObjectURL(url)
  }, [data])

  if (loading) return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-2" />
      <p className="text-slate-600">{error}</p>
      <Button size="sm" variant="outline" onClick={load} className="mt-4">
        <RefreshCw className="w-3 h-3 mr-1" /> Reintentar
      </Button>
    </div>
  )

  if (!data) return null

  const estadoPieData = data.resumen.estadoComposition.map((e) => ({
    name: ESTADO_LABELS[e.estado as keyof typeof ESTADO_LABELS] || e.estado,
    value: e.cantidad,
    color: (ESTADO_COLORS as any)[e.estado] || '#94a3b8',
  }))

  const activeStates = ['LLENO', 'EN_CLIENTE', 'EN_REPARTO', 'EN_CARGA', 'EN_DEPOSITO']
  const inactiveStates = ['VACIO', 'MANTENIMIENTO', 'RETENIDO', 'PH_VENCIDO', 'TRANSITO']
  const lostStates = ['BAJA', 'EXTRAVIADO']

  const estadoChartData = data.resumen.estadoComposition
    .filter(e => activeStates.includes(e.estado) || inactiveStates.includes(e.estado) || lostStates.includes(e.estado))
    .map(e => ({
      name: ESTADO_LABELS[e.estado as keyof typeof ESTADO_LABELS] || e.estado,
      cantidad: e.cantidad,
      fill: (ESTADO_COLORS as any)[e.estado] || '#94a3b8',
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tablero Gerencial</h2>
          <p className="text-sm text-slate-500">KPIs ejecutivos en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-3 h-3 mr-1" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-3 h-3 mr-1" /> Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={RotateCcw} label="Rotación (30d)" value={data.rotacion.toFixed(2)} sub={`${data.resumen.totalCilindros} cilindros`} color="text-blue-600" />
        <KpiCard icon={Activity} label="% Utilización" value={`${data.utilizacion.porcentaje}%`} sub={`${data.utilizacion.enUso} de ${data.utilizacion.total} activos`} color="text-emerald-600" />
        <KpiCard icon={Calendar} label="PH por vencer (30d)" value={data.ph.porVencer30} sub={`${data.ph.vencidos} vencidos · ${data.ph.porVencer90} en 90d`} color={data.ph.porVencer30 > 0 ? 'text-orange-600' : 'text-emerald-600'} />
        <KpiCard icon={DollarSign} label="Costo / tubo" value={`$${data.costos.costoPorTubo}`} sub={`${data.costos.totalEntregadosEnRutas} entregados`} color="text-purple-600" />
        <KpiCard icon={AlertTriangle} label="Stock crítico" value={data.stockCritico.filter(s => s.critico).length} sub={`de ${data.resumen.totalGases} gases`} color="text-red-600" />
        <KpiCard icon={Flame} label="Clientes alto riesgo" value={data.clientesRetencion.filter(c => c.riesgo === 'ALTO').length} sub={`${data.clientesRetencion.length} total monitoreados`} color="text-orange-600" />
        <KpiCard icon={Trash2} label="Pérdidas" value={data.perdidas.total} sub={`${data.perdidas.porcentaje}% · ${data.perdidas.extraviados} extraviados`} color="text-red-500" />
        <KpiCard icon={BarChart3} label="Cilindros totales" value={data.resumen.totalCilindros} sub={`${data.rotacion.toFixed(2)} rotación · ${data.resumen.totalRutas} rutas`} color="text-slate-700" />
      </div>

      {/* Tabs de detalle */}
      <Tabs defaultValue="panorama" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap gap-1 bg-transparent p-0 h-auto">
          {[
            { value: 'panorama', label: 'Panorama', icon: Activity },
            { value: 'stock', label: 'Stock Crítico', icon: AlertTriangle },
            { value: 'clientes', label: 'Retención', icon: Users },
            { value: 'ph', label: 'PH / Retest', icon: Calendar },
            { value: 'perdidas', label: 'Pérdidas', icon: Trash2 },
            { value: 'costos', label: 'Costos', icon: DollarSign },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="flex items-center gap-1.5 py-2 px-3 text-xs data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:shadow-none rounded-lg border border-transparent data-[state=active]:border-orange-200">
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Panorama ─── */}
        <TabsContent value="panorama" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Composición por Estado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={estadoPieData} cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {estadoPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Distribución por Estado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={estadoChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                      {estadoChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-emerald-700">🟢 Activos</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {data.resumen.estadoComposition.filter(e => activeStates.includes(e.estado)).map(e => (
                  <div key={e.estado} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span>{ESTADO_LABELS[e.estado as keyof typeof ESTADO_LABELS] || e.estado}</span>
                    <span className="font-mono">{e.cantidad}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-orange-700">🟡 Inactivos / Retenidos</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {data.resumen.estadoComposition.filter(e => inactiveStates.includes(e.estado)).map(e => (
                  <div key={e.estado} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span>{ESTADO_LABELS[e.estado as keyof typeof ESTADO_LABELS] || e.estado}</span>
                    <span className="font-mono">{e.cantidad}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-red-700">🔴 Pérdidas / Baja</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {data.resumen.estadoComposition.filter(e => lostStates.includes(e.estado)).map(e => (
                  <div key={e.estado} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span>{ESTADO_LABELS[e.estado as keyof typeof ESTADO_LABELS] || e.estado}</span>
                    <span className="font-mono">{e.cantidad}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Stock Crítico ─── */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Stock de LLENOS por Gas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.stockCritico.map((g) => (
                  <div key={g.gasId} className={`p-3 rounded-lg border ${g.critico ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{g.gasCodigo}</span>
                        <span className="text-xs text-slate-500">{g.gasNombre}</span>
                      </div>
                      <Badge variant={g.critico ? 'destructive' : 'default'} className="text-[9px]">
                        {g.llenos} / {g.total}
                      </Badge>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${g.critico ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${g.porcentaje}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{g.porcentaje}% llenos</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Retención Clientes ─── */}
        <TabsContent value="clientes" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Clientes con Mayor Retención de Tubos</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {data.clientesRetencion.map((c) => (
                  <div key={c.clienteId} className="flex items-center justify-between p-2 border-b last:border-0 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">{c.clienteNombre}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-500">{c.totalCilindros} tubos</span>
                      <span className="font-mono">{c.promedioDias} días</span>
                      <Badge className={`text-[9px] ${getRiesgoColor(c.riesgo)}`} variant="outline">
                        {c.riesgo}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {data.clientesRetencion.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Sin datos de retención</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PH / Retest ─── */}
        <TabsContent value="ph" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Calendar} label="PH Vencidos" value={data.ph.vencidos} color={data.ph.vencidos > 0 ? 'text-red-600' : 'text-emerald-600'} />
            <KpiCard icon={Calendar} label="Vencen en 30d" value={data.ph.porVencer30} color={data.ph.porVencer30 > 0 ? 'text-orange-600' : 'text-emerald-600'} />
            <KpiCard icon={Calendar} label="Vencen en 60d" value={data.ph.porVencer60} />
            <KpiCard icon={Calendar} label="Vencen en 90d" value={data.ph.porVencer90} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Próximos Vencimientos PH</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {data.ph.proximos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 border-b last:border-0 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{c.numeroSerie}</span>
                      <Badge variant="outline" className="text-[9px]">{c.gas}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{new Date(c.vencimiento).toLocaleDateString('es-AR')}</span>
                      <span className={`font-mono ${c.diasRestantes <= 30 ? 'text-red-600 font-bold' : c.diasRestantes <= 60 ? 'text-orange-600' : 'text-slate-600'}`}>
                        {c.diasRestantes} días
                      </span>
                    </div>
                  </div>
                ))}
                {data.ph.proximos.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sin vencimientos próximos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Pérdidas ─── */}
        <TabsContent value="perdidas" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-red-600">Extraviados</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{data.perdidas.extraviados}</p>
                <p className="text-xs text-slate-500 mt-1">Cilindros en estado EXTRAVIADO</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-red-600">Baja</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{data.perdidas.baja}</p>
                <p className="text-xs text-slate-500 mt-1">Cilindros dados de baja</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-slate-700">% del Total</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-700">{data.perdidas.porcentaje}%</p>
                <p className="text-xs text-slate-500 mt-1">Sobre {data.resumen.totalCilindros} cilindros</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Costos ─── */}
        <TabsContent value="costos" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-purple-600">Costo por Tubo</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">${data.costos.costoPorTubo}</p>
                <p className="text-xs text-slate-500 mt-1">Promedio por cilindro entregado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-slate-700">Costos Totales Rutas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-700">${data.costos.totalCostosRutas}</p>
                <p className="text-xs text-slate-500 mt-1">{data.costos.rutasConCosto} rutas con costo</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-slate-700">Entregados en Rutas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-700">{data.costos.totalEntregadosEnRutas}</p>
                <p className="text-xs text-slate-500 mt-1">Cilindros entregados con costo registrado</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
