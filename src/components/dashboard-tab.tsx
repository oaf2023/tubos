'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Activity,
  Map as MapIcon,
  Package,
  AlertTriangle,
  Gauge,
  MapPin,
  Bell,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Stats, Cylinder, Gas, MapMarker } from '@/lib/tab-types'
import { SgaBadge, KpiCard, ESTADO_COLORS, ESTADO_LABELS } from '@/lib/tab-constants'

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
      <div className="text-slate-500 flex flex-col items-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-sm">Cargando mapa...</span>
      </div>
    </div>
  ),
})

export default function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const [mapCylinders, setMapCylinders] = useState<Cylinder[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([])
  const [filtroGas, setFiltroGas] = useState('all')
  const [filtroCliente, setFiltroCliente] = useState('all')

  const load = useCallback(async () => {
    try {
      const [statsRes, cylRes, gasRes, cliRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/cylinders'),
        fetch('/api/gases'),
        fetch('/api/clientes?activo=true'),
      ])
      const sData = await statsRes.json()
      setStats(sData && typeof sData === 'object' && 'total' in sData ? sData : null)
      const cData = await cylRes.json()
      setMapCylinders(Array.isArray(cData) ? cData : [])
      const gData = await gasRes.json()
      setGases(Array.isArray(gData) ? gData : [])
      const clData = await cliRes.json()
      setClientes(Array.isArray(clData) ? clData.map((c: any) => ({ id: c.id, nombre: c.nombre })) : [])
    } catch { /* ok */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const mapMarkers: MapMarker[] = useMemo(() => {
    let filtrados = mapCylinders
    if (filtroGas !== 'all') filtrados = filtrados.filter((c) => c.gasId === filtroGas)
    if (filtroCliente !== 'all') filtrados = filtrados.filter((c) => c.clienteId === filtroCliente)

    const grupos = new Map<string, { lat: number; lng: number; nombre: string; provincia: string; tubos: Cylinder[] }>()
    filtrados.forEach((c) => {
      const key = `${c.ubicacionLat.toFixed(2)}_${c.ubicacionLng.toFixed(2)}`
      if (!grupos.has(key)) {
        grupos.set(key, { lat: c.ubicacionLat, lng: c.ubicacionLng, nombre: c.ubicacionNombre, provincia: c.provincia, tubos: [] })
      }
      grupos.get(key)!.tubos.push(c)
    })

    return Array.from(grupos.values()).map((g, idx) => {
      const esBase = g.nombre === 'San Nicolás de los Arroyos'
      const gasPrincipal = g.tubos[0].gas
      return {
        id: `dm-${idx}`,
        lat: g.lat,
        lng: g.lng,
        color: esBase ? '#dc2626' : gasPrincipal.colorHex,
        label: g.nombre,
        count: g.tubos.length,
        isBase: esBase,
        popup: `<div><strong>${g.tubos.length} tubo(s)</strong><br/><span style="color:#64748b;">${g.provincia}</span><br/><span style="display:inline-block;margin-top:4px;font-size:11px;">${[...new Set(g.tubos.map((t) => t.gas.nombre))].slice(0, 3).join(' · ')}</span></div>`,
      }
    })
  }, [mapCylinders, filtroGas, filtroCliente])

  const alertMarkers: MapMarker[] = useMemo(() => {
    if (!stats) return []
    return stats.enAlertaVencimiento
      .filter((c) => c.ubicacionLat && c.ubicacionLng)
      .map((c, idx) => ({
        id: `al-${idx}`,
        lat: c.ubicacionLat,
        lng: c.ubicacionLng,
        color: '#dc2626',
        label: c.ubicacionNombre,
        count: 1,
        isBase: false,
        popup: `<div><strong>${c.numeroSerie}</strong><br/><span style="color:#64748b;">${c.gas.nombre}</span><br/><span style="color:#dc2626;font-size:11px;">PH vencida: ${new Date(c.fechaProximoRetest).toLocaleDateString()}</span></div>`,
      }))
  }, [stats])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  const totalCapacidad = stats.capacidadTotalLitros
  const estadosOrden = ['LLENO', 'EN_USO', 'TRANSITO', 'VACIO', 'MANTENIMIENTO']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package className="w-5 h-5" />}
          label="Total de Tubos"
          value={stats.total.toString()}
          accent="from-orange-500 to-red-600"
        />
        <KpiCard
          icon={<Gauge className="w-5 h-5" />}
          label="Capacidad Total"
          value={`${totalCapacidad} L`}
          accent="from-emerald-500 to-teal-600"
        />
        <KpiCard
          icon={<MapPin className="w-5 h-5" />}
          label="Ubicaciones"
          value={stats.porUbicacion.length.toString()}
          accent="from-sky-500 to-blue-600"
        />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Vencidos"
          value={stats.enAlertaVencimiento.length.toString()}
          accent="from-red-500 to-rose-600"
        />
        <KpiCard
          icon={<Bell className="w-5 h-5" />}
          label="Total Alertas"
          value={stats.totalAlertas.toString()}
          accent="from-amber-500 to-orange-600"
        />
      </div>

      {stats.alertasPorGas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.alertasPorGas.map((a) => (
            <Card key={a.gasId} className={`border-l-4 ${a.vencidos > 0 ? 'border-l-red-500' : a.enAlertaRetest > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.gas.colorHex }} />
                  <span className="text-xs font-semibold text-slate-700 truncate">{a.gas.nombre}</span>
                  <SgaBadge peligro={a.gas.peligro} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Vencidos:</span>
                  <span className={`font-bold ${a.vencidos > 0 ? 'text-red-600' : 'text-slate-700'}`}>{a.vencidos}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Próximos ({a.diasAlertaRetest}d):</span>
                  <span className={`font-bold ${a.enAlertaRetest > 0 ? 'text-amber-600' : 'text-slate-700'}`}>{a.enAlertaRetest}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              Distribución por Estado
            </CardTitle>
            <CardDescription>
              Estado actual de los tubos en planta y en distribución
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {estadosOrden.map((est) => {
              const e = stats.porEstado.find((x) => x.estado === est)
              const cantidad = e?.cantidad || 0
              const pct = stats.total > 0 ? (cantidad / stats.total) * 100 : 0
              return (
                <div key={est} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${ESTADO_COLORS[est]}`} />
                      <span className="font-medium text-slate-700">
                        {ESTADO_LABELS[est]}
                      </span>
                    </div>
                    <span className="text-slate-900 font-semibold">
                      {cantidad}{' '}
                      <span className="text-xs text-slate-400 font-normal">
                        ({pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${ESTADO_COLORS[est]} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
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
              Distribución por Gas
            </CardTitle>
            <CardDescription>
              Cantidad de tubos y capacidad total por tipo de gas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-3">
                {stats.porGas
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .map((g) => (
                    <div
                      key={g.gas.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow"
                          style={{ background: g.gas.colorHex }}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-slate-800 truncate">
                            {g.gas.nombre}
                          </div>
                          <div className="text-xs text-slate-500">
                            {g.gas.codigo} · {g.capacidadTotal} L
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="font-bold tabular-nums"
                      >
                        {g.cantidad}
                      </Badge>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500" />
              Distribución Geográfica
            </CardTitle>
            <CardDescription>
              Cantidad de tubos por ciudad (top 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.porUbicacion.slice(0, 10).map((u, idx) => {
                  const max = stats.porUbicacion[0]?.cantidad || 1
                  const pct = (u.cantidad / max) * 100
                  return (
                    <div key={u.ubicacion} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 w-5">
                            #{idx + 1}
                          </span>
                          <span className="font-medium text-slate-700">
                            {u.ubicacion}
                          </span>
                          <span className="text-xs text-slate-400">
                            · {u.provincia}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {u.cantidad}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Alertas de Vencimiento
            </CardTitle>
            <CardDescription>
              Tubos con prueba hidrostática vencida (requieren inspección)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.enAlertaVencimiento.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                  <Activity className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Sin alertas activas
                </p>
                <p className="text-xs text-slate-500">
                  Todos los tubos tienen su inspección al día
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[260px] pr-4">
                <div className="space-y-2">
                  {stats.enAlertaVencimiento.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-red-100 bg-red-50/50"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: c.gas.colorHex }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-semibold text-slate-800 truncate">
                          {c.numeroSerie}
                        </div>
                        <div className="text-xs text-slate-500">
                          {c.gas.nombre} · {c.capacidadLitros}L · {c.ubicacionNombre}
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Vencido
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-500" />
            Distribución por Capacidad de Tubo
          </CardTitle>
          <CardDescription>
            Cantidad de tubos según su capacidad en litros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats.porCapacidad
              .sort((a, b) => a.capacidad - b.capacidad)
              .map((c) => (
                <div
                  key={c.capacidad}
                  className="text-center p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white"
                >
                  <div className="text-2xl font-bold text-slate-900">
                    {c.capacidad}
                  </div>
                  <div className="text-xs text-slate-500 mb-2">litros</div>
                  <Badge variant="secondary" className="font-bold">
                    {c.cantidad} tubos
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-orange-500" />
              Geoposicionamiento de Tubos
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-36">
                <select value={filtroGas} onChange={(e) => setFiltroGas(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                  <option value="all">Todos los gases</option>
                  {gases.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="w-36">
                <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                  <option value="all">Todos los clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-sm" />Base</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-sm" />Tubo</span>
              </div>
            </div>
          </div>
          <CardDescription>{mapMarkers.length} ubicaciones con {mapCylinders.filter((c) => (filtroGas === 'all' || c.gasId === filtroGas) && (filtroCliente === 'all' || c.clienteId === filtroCliente)).length} tubos</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <MapView markers={mapMarkers} height="320px" />
        </CardContent>
      </Card>

      {alertMarkers.length > 0 && (
        <Card className="border-l-4 border-l-red-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Alertas Geográficas — Tubos con PH vencida
            </CardTitle>
            <CardDescription>{alertMarkers.length} tubos con prueba hidrostática vencida</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <MapView markers={alertMarkers} height="200px" zoom={5} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
