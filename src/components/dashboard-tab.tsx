'use client'

import { useEffect, useState } from 'react'
import {
  Users, Package, ClipboardList, DollarSign, Truck, Wrench,
  Bell, AlertTriangle, TrendingUp, RefreshCw, Activity, MapPin,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Stats } from '@/lib/tab-types'

function KpiCard({ icon, label, value, accent, sub }: {
  icon: React.ReactNode; label: string; value: string; accent: string; sub?: string
}) {
  return (
    <Card className={`bg-gradient-to-br ${accent} text-white`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/20 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs opacity-80 truncate">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          {sub && <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

const NIVEL_COLORS: Record<string, string> = {
  CRITICO: 'bg-red-100 border-red-300 text-red-700',
  ALTO: 'bg-orange-100 border-orange-300 text-orange-700',
  MEDIO: 'bg-amber-100 border-amber-300 text-amber-700',
  BAJO: 'bg-blue-100 border-blue-300 text-blue-700',
}
const NIVEL_DOT: Record<string, string> = {
  CRITICO: 'bg-red-500',
  ALTO: 'bg-orange-500',
  MEDIO: 'bg-amber-500',
  BAJO: 'bg-blue-500',
}

export default function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Error')
      const j = await res.json()
      setStats(j)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    )
  }

  const maxVentas = Math.max(...stats.facturacionMensual.map(r => r.total), 1)
  const maxProvincia = Math.max(...stats.clientesPorProvincia.map(r => r.cantidad), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-sky-600" />
        <h2 className="text-lg font-semibold">Dashboard General</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Users className="w-5 h-5" />} label="Clientes Activos" value={stats.clientesActivos.toLocaleString()} accent="from-blue-500 to-indigo-600" sub={stats.clientesMorosos > 0 ? `${stats.clientesMorosos} morosos` : undefined} />
        <KpiCard icon={<Package className="w-5 h-5" />} label="Cilindros Totales" value={stats.totalCylinders.toLocaleString()} accent="from-emerald-500 to-teal-600" sub={stats.cylindersPHVencidos > 0 ? `${stats.cylindersPHVencidos} PH vencida` : undefined} />
        <KpiCard icon={<ClipboardList className="w-5 h-5" />} label="Pedidos Pendientes" value={stats.pedidosPendientes.toLocaleString()} accent="from-orange-500 to-red-600" sub={`${stats.pedidosHoy} hoy`} />
        <KpiCard icon={<Bell className="w-5 h-5" />} label="Alertas Sin Resolver" value={stats.alertasSinResolver.toLocaleString()} accent="from-rose-500 to-pink-600" sub={stats.alertasCriticas > 0 ? `${stats.alertasCriticas} críticas` : undefined} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Truck className="w-5 h-5" />} label="Rutas Activas" value={stats.rutasActivasHoy.toLocaleString()} accent="from-violet-500 to-purple-600" />
        <KpiCard icon={<Wrench className="w-5 h-5" />} label="Vehículos Disponibles" value={stats.vehiculosDisponibles.toLocaleString()} accent="from-cyan-500 to-sky-600" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Conductores en Línea" value={stats.conductoresEnLinea.toLocaleString()} accent="from-emerald-500 to-green-600" />
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Facturación Pendiente" value={`$${(stats.totalPendienteARS).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`} accent="from-amber-500 to-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-orange-500" />
              Pedidos por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.pedidosPorEstado.map(e => {
              const total = stats.pedidosPorEstado.reduce((a, b) => a + b.cantidad, 0)
              const pct = total > 0 ? (e.cantidad / total) * 100 : 0
              return (
                <div key={e.estado} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{e.estado}</span>
                    <span className="font-semibold text-slate-900">{e.cantidad} <span className="text-xs text-slate-400">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Facturación Mensual
            </CardTitle>
            <CardDescription>Últimos períodos con facturación</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.facturacionMensual.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center">Sin datos de facturación</div>
            ) : (
              <div className="space-y-3">
                {stats.facturacionMensual.map(r => {
                  const pct = (r.total / maxVentas) * 100
                  return (
                    <div key={r.mes} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{r.mes}</span>
                        <span className="font-semibold text-slate-900">${r.total.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500" />
              Clientes por Provincia
            </CardTitle>
            <CardDescription>Top 10 provincias con más clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.clientesPorProvincia.map((r, idx) => {
                  const pct = (r.cantidad / maxProvincia) * 100
                  return (
                    <div key={r.provincia} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-50">
                      <span className="text-xs font-mono text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                      <span className="font-medium text-sm text-slate-700 flex-1 truncate">{r.provincia}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <Badge variant="secondary" className="font-bold tabular-nums shrink-0">{r.cantidad}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertas Recientes
          </CardTitle>
          <CardDescription>Últimas 5 alertas del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.alertasRecientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <Bell className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">Sin alertas</p>
              <p className="text-xs text-slate-500">No hay alertas registradas en el sistema</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.alertasRecientes.map(a => (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border ${NIVEL_COLORS[a.nivel] || 'bg-slate-50 border-slate-200'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${NIVEL_DOT[a.nivel] || 'bg-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.mensaje}</div>
                    <div className="text-xs text-slate-500">{a.tipo} · {new Date(a.fecha).toLocaleString()}</div>
                  </div>
                  <Badge variant={a.resuelta ? 'outline' : 'default'} className="shrink-0 text-xs">
                    {a.resuelta ? 'Resuelta' : 'Activa'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <button onClick={load} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar datos
        </button>
      </div>
    </div>
  )
}
