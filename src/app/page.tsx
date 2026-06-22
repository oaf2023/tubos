'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Activity,
  Map as MapIcon,
  Package,
  Route as RouteIcon,
  BookOpen,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Factory,
  AlertTriangle,
  Gauge,
  MapPin,
  Calendar,
  Truck,
  TrendingUp,
  X,
  Save,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogFooter,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { ESTADOS, CAPACIDADES_LITROS } from '@/lib/catalogo'

// Tipos
interface Gas {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  presionBar: number
  colorHex: string
  usoPrincipal: string
  categoria: string
  _count?: { cylinders: number }
}

interface Cylinder {
  id: string
  numeroSerie: string
  gasId: string
  gas: Gas
  capacidadLitros: number
  presionActualBar: number
  estado: string
  ubicacionLat: number
  ubicacionLng: number
  ubicacionNombre: string
  provincia: string
  cliente: string | null
  fechaCarga: string | null
  fechaUltimaInspeccion: string
  fechaVencimiento: string
}

interface Location {
  id: string
  nombre: string
  provincia: string
  lat: number
  lng: number
  esBase: boolean
  tipo: string
}

interface Ruta {
  id: string
  nombre: string
  estado: string
  origenNombre: string
  origenLat: number
  origenLng: number
  distanciaKm: number
  duracionHoras: number
  paradas: RutaParada[]
  createdAt: string
}

interface RutaParada {
  id: string
  orden: number
  lat: number
  lng: number
  nombre: string
  provincia: string
  cylinderIds: string
  estado: string
  notas: string | null
}

interface Stats {
  total: number
  porEstado: { estado: string; cantidad: number }[]
  porGas: { gas: Gas; cantidad: number; capacidadTotal: number }[]
  porCapacidad: { capacidad: number; cantidad: number }[]
  porUbicacion: { ubicacion: string; provincia: string; cantidad: number }[]
  enAlertaVencimiento: Cylinder[]
  capacidadTotalLitros: number
}

// Mapa cargado dinámicamente (sin SSR porque Leaflet usa window)
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

const ESTADO_COLORS: Record<string, string> = {
  LLENO: 'bg-emerald-500',
  EN_USO: 'bg-amber-500',
  VACIO: 'bg-slate-400',
  MANTENIMIENTO: 'bg-red-500',
  TRANSITO: 'bg-blue-500',
}

const ESTADO_LABELS: Record<string, string> = {
  LLENO: 'Lleno',
  EN_USO: 'En uso',
  VACIO: 'Vacío',
  MANTENIMIENTO: 'Mantenimiento',
  TRANSITO: 'En tránsito',
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function daysUntil(s: string): number {
  const now = new Date()
  const d = new Date(s)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6 h-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="mapa" className="flex items-center gap-2 py-2">
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="inventario" className="flex items-center gap-2 py-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="rutas" className="flex items-center gap-2 py-2">
              <RouteIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Rutas</span>
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="flex items-center gap-2 py-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Catálogo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>
          <TabsContent value="mapa">
            <MapaTab />
          </TabsContent>
          <TabsContent value="inventario">
            <InventarioTab />
          </TabsContent>
          <TabsContent value="rutas">
            <RutasTab />
          </TabsContent>
          <TabsContent value="catalogo">
            <CatalogoTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              GasTrack AR
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Control de tubos de gases para soldadura · Argentina
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden md:flex border-orange-300 text-orange-700 bg-orange-50">
            <MapPin className="w-3 h-3 mr-1" />
            Base: San Nicolás de los Arroyos
          </Badge>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
        GasTrack AR · Sistema de control y geolocalización de tubos de gases para
        soldadura · Distribución en Argentina · Base operativa San Nicolás de los
        Arroyos (Buenos Aires)
      </div>
    </footer>
  )
}

// ============================================================
// 1. DASHBOARD
// ============================================================
function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      setStats(data && typeof data === 'object' && 'total' in data ? data : null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
      {/* KPIs principales */}
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
          label="Vencidos / Alerta"
          value={stats.enAlertaVencimiento.length.toString()}
          accent="from-red-500 to-rose-600"
        />
      </div>

      {/* Distribución por estado */}
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

      {/* Distribución geográfica y alertas */}
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

      {/* Capacidad por tipo de tubo */}
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
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tabular-nums">
              {value}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-md flex-shrink-0`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// 2. MAPA
// ============================================================
function MapaTab() {
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroGas, setFiltroGas] = useState<string>('all')
  const [filtroEstado, setFiltroEstado] = useState<string>('all')

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroGas !== 'all') params.set('gasId', filtroGas)
      if (filtroEstado !== 'all') params.set('estado', filtroEstado)
      const res = await fetch(`/api/cylinders?${params}`)
      const data = await res.json()
      setCylinders(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filtroGas, filtroEstado])

  useEffect(() => {
    void load()
  }, [load])

  // Agrupar por ubicación (redondear coordenadas)
  const markers = useMemo(() => {
    const grupos = new Map<
      string,
      { lat: number; lng: number; nombre: string; provincia: string; tubos: Cylinder[] }
    >()

    cylinders.forEach((c) => {
      const key = `${c.ubicacionLat.toFixed(2)}_${c.ubicacionLng.toFixed(2)}`
      if (!grupos.has(key)) {
        grupos.set(key, {
          lat: c.ubicacionLat,
          lng: c.ubicacionLng,
          nombre: c.ubicacionNombre,
          provincia: c.provincia,
          tubos: [],
        })
      }
      grupos.get(key)!.tubos.push(c)
    })

    return Array.from(grupos.values()).map((g, idx) => {
      const esBase = g.nombre === 'San Nicolás de los Arroyos'
      const gasPrincipal = g.tubos[0].gas
      return {
        id: `g-${idx}`,
        lat: g.lat,
        lng: g.lng,
        color: esBase ? '#dc2626' : gasPrincipal.colorHex,
        label: g.nombre,
        count: g.tubos.length,
        isBase: esBase,
        popup: `
          <div style="margin-top:2px;">
            <strong>${g.tubos.length} tubo(s)</strong><br/>
            <span style="color:#64748b;">${g.provincia}</span><br/>
            <span style="display:inline-block;margin-top:4px;font-size:11px;">
              ${[...new Set(g.tubos.map((t) => t.gas.nombre))].slice(0, 3).join(' · ')}
            </span>
          </div>
        `,
      }
    })
  }, [cylinders])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Filtrar por gas</Label>
              <Select value={filtroGas} onValueChange={setFiltroGas}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los gases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los gases</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Filtrar por estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 ml-auto">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow" />
                Base
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
                Tubo
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-[600px] rounded-xl" />
      ) : (
        <MapView markers={markers} height="600px" />
      )}

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-800">{cylinders.length} tubos</strong> mostrados
            en el mapa. Los marcadores se agrupan por ubicación. El número sobre cada
            marcador indica la cantidad de tubos en ese punto. La base operativa
            (San Nicolás de los Arroyos) se muestra en rojo y corresponde a la planta
            central de distribución.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// 3. INVENTARIO
// ============================================================
function InventarioTab() {
  const { toast } = useToast()
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroGas, setFiltroGas] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroCapacidad, setFiltroCapacidad] = useState('all')
  const [filtroUbicacion, setFiltroUbicacion] = useState('all')

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    numeroSerie: '',
    gasId: '',
    capacidadLitros: '40',
    presionActualBar: '200',
    estado: 'LLENO',
    ubicacionNombre: 'San Nicolás de los Arroyos',
    provincia: 'Buenos Aires',
    ubicacionLat: '-33.3293',
    ubicacionLng: '-60.2244',
    cliente: '',
    fechaVencimiento: '',
  })

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroSerie) params.set('serie', filtroSerie)
      if (filtroGas !== 'all') params.set('gasId', filtroGas)
      if (filtroEstado !== 'all') params.set('estado', filtroEstado)
      if (filtroCapacidad !== 'all') params.set('capacidad', filtroCapacidad)
      if (filtroUbicacion !== 'all') params.set('ubicacion', filtroUbicacion)
      const [cylRes, gasRes, locRes] = await Promise.all([
        fetch(`/api/cylinders?${params}`),
        fetch('/api/gases'),
        fetch('/api/locations'),
      ])
      const [cylData, gasData, locData] = await Promise.all([
        cylRes.json(),
        gasRes.json(),
        locRes.json(),
      ])
      setCylinders(Array.isArray(cylData) ? cylData : [])
      setGases(Array.isArray(gasData) ? gasData : [])
      setLocations(Array.isArray(locData) ? locData : [])
    } finally {
      setLoading(false)
    }
  }, [filtroSerie, filtroGas, filtroEstado, filtroCapacidad, filtroUbicacion])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  function openCreate() {
    setEditId(null)
    setForm({
      numeroSerie: `SN-2026-${String(cylinders.length + 1).padStart(4, '0')}`,
      gasId: gases[0]?.id || '',
      capacidadLitros: '40',
      presionActualBar: '200',
      estado: 'LLENO',
      ubicacionNombre: 'San Nicolás de los Arroyos',
      provincia: 'Buenos Aires',
      ubicacionLat: '-33.3293',
      ubicacionLng: '-60.2244',
      cliente: '',
      fechaVencimiento: '',
    })
    setDialogOpen(true)
  }

  function openEdit(c: Cylinder) {
    setEditId(c.id)
    setForm({
      numeroSerie: c.numeroSerie,
      gasId: c.gasId,
      capacidadLitros: String(c.capacidadLitros),
      presionActualBar: String(c.presionActualBar),
      estado: c.estado,
      ubicacionNombre: c.ubicacionNombre,
      provincia: c.provincia,
      ubicacionLat: String(c.ubicacionLat),
      ubicacionLng: String(c.ubicacionLng),
      cliente: c.cliente || '',
      fechaVencimiento: c.fechaVencimiento.split('T')[0],
    })
    setDialogOpen(true)
  }

  async function save() {
    try {
      const url = editId ? `/api/cylinders/${editId}` : '/api/cylinders'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      toast({
        title: editId ? 'Tubo actualizado' : 'Tubo creado',
        description: `Serie ${form.numeroSerie} guardada correctamente`,
      })
      setDialogOpen(false)
      load()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  async function remove(c: Cylinder) {
    if (!confirm(`¿Eliminar el tubo ${c.numeroSerie}?`)) return
    await fetch(`/api/cylinders/${c.id}`, { method: 'DELETE' })
    toast({ title: 'Tubo eliminado', description: c.numeroSerie })
    load()
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs flex items-center gap-1">
                <Search className="w-3 h-3" /> Número de serie
              </Label>
              <Input
                placeholder="Ej: SN-2024-0001"
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
              />
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs">Gas</Label>
              <Select value={filtroGas} onValueChange={setFiltroGas}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los gases</SelectItem>
                  {gases.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre} ({g.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs">Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[120px]">
              <Label className="text-xs">Capacidad</Label>
              <Select value={filtroCapacidad} onValueChange={setFiltroCapacidad}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CAPACIDADES_LITROS.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      {c} L
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <Label className="text-xs">Ubicación</Label>
              <Select value={filtroUbicacion} onValueChange={setFiltroUbicacion}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.nombre}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 ml-auto"
            >
              <Plus className="w-4 h-4 mr-1" /> Nuevo Tubo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Inventario de Tubos
              </CardTitle>
              <CardDescription>
                {loading
                  ? 'Cargando...'
                  : `${cylinders.length} tubo(s) encontrado(s)`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : cylinders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No se encontraron tubos con los filtros aplicados
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-32">N° de Serie</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead className="text-center">Cap.</TableHead>
                    <TableHead className="text-center">Presión</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Vence</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cylinders.map((c) => {
                    const diasVenc = daysUntil(c.fechaVencimiento)
                    const vencido = diasVenc < 0
                    const proximoVencer = diasVenc >= 0 && diasVenc <= 30
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs font-semibold">
                          {c.numeroSerie}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-300"
                              style={{ background: c.gas.colorHex }}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {c.gas.nombre}
                              </div>
                              <div className="text-xs text-slate-500">
                                {c.gas.codigo}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium tabular-nums">
                          {c.capacidadLitros}L
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-xs">
                          {c.presionActualBar} bar
                          <div className="text-slate-400">/ {c.gas.presionBar}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${ESTADO_COLORS[c.estado]} text-white hover:opacity-90 text-xs`}
                          >
                            {ESTADO_LABELS[c.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {c.ubicacionNombre}
                          </div>
                          <div className="text-xs text-slate-500">{c.provincia}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {c.cliente || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`text-xs ${
                              vencido
                                ? 'text-red-600 font-bold'
                                : proximoVencer
                                ? 'text-amber-600 font-medium'
                                : 'text-slate-600'
                            }`}
                          >
                            {formatDate(c.fechaVencimiento)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(c)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => remove(c)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de creación/edición */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Editar Tubo' : 'Nuevo Tubo de Gas'}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? `Modificando ${form.numeroSerie}`
                : 'Complete los datos del nuevo tubo para soldadura'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Número de serie *</Label>
              <Input
                value={form.numeroSerie}
                onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })}
                placeholder="SN-2026-0001"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Tipo de gas *</Label>
              <Select
                value={form.gasId}
                onValueChange={(v) => {
                  const g = gases.find((x) => x.id === v)
                  setForm({
                    ...form,
                    gasId: v,
                    presionActualBar: g ? String(g.presionBar) : form.presionActualBar,
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar gas" />
                </SelectTrigger>
                <SelectContent>
                  {gases.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ background: g.colorHex }}
                        />
                        {g.nombre} ({g.codigo})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Capacidad (litros) *</Label>
              <Select
                value={form.capacidadLitros}
                onValueChange={(v) => setForm({ ...form, capacidadLitros: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPACIDADES_LITROS.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      {c} L
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Presión actual (bar)</Label>
              <Input
                type="number"
                value={form.presionActualBar}
                onChange={(e) =>
                  setForm({ ...form, presionActualBar: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm({ ...form, estado: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vencimiento (prueba hidrostática)</Label>
              <Input
                type="date"
                value={form.fechaVencimiento}
                onChange={(e) =>
                  setForm({ ...form, fechaVencimiento: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Ubicación (ciudad) *</Label>
              <Select
                value={form.ubicacionNombre}
                onValueChange={(v) => {
                  const loc = locations.find((l) => l.nombre === v)
                  if (loc) {
                    setForm({
                      ...form,
                      ubicacionNombre: loc.nombre,
                      provincia: loc.provincia,
                      ubicacionLat: String(loc.lat),
                      ubicacionLng: String(loc.lng),
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.nombre}>
                      {l.esBase && '🏭 '} {l.nombre} ({l.provincia})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Cliente (opcional)</Label>
              <Input
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="hidden">
              <Input value={form.ubicacionLat} readOnly />
              <Input value={form.ubicacionLng} readOnly />
              <Input value={form.provincia} readOnly />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={save}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// 4. RUTAS Y LOGÍSTICA
// ============================================================
function RutasTab() {
  const { toast } = useToast()
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  // Nueva ruta
  const [nombreRuta, setNombreRuta] = useState('')
  const [paradasSeleccionadas, setParadasSeleccionadas] = useState<string[]>([])

  const load = useCallback(async () => {
    try {
      const [rRes, lRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/locations'),
      ])
      const [rData, lData] = await Promise.all([rRes.json(), lRes.json()])
      setRutas(Array.isArray(rData) ? rData : [])
      setLocations(Array.isArray(lData) ? lData : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const base = locations.find((l) => l.esBase)

  function toggleParada(nombre: string) {
    if (paradasSeleccionadas.includes(nombre)) {
      setParadasSeleccionadas(paradasSeleccionadas.filter((n) => n !== nombre))
    } else {
      setParadasSeleccionadas([...paradasSeleccionadas, nombre])
    }
  }

  async function crearRuta() {
    if (!base) {
      toast({ title: 'Error', description: 'No se encontró la base', variant: 'destructive' })
      return
    }
    if (!nombreRuta.trim()) {
      toast({ title: 'Faltan datos', description: 'Ingrese nombre de ruta', variant: 'destructive' })
      return
    }
    if (paradasSeleccionadas.length === 0) {
      toast({
        title: 'Faltan paradas',
        description: 'Seleccione al menos una parada',
        variant: 'destructive',
      })
      return
    }

    const paradas = paradasSeleccionadas
      .map((nombre) => locations.find((l) => l.nombre === nombre)!)
      .filter(Boolean)

    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombreRuta,
        origenNombre: base.nombre,
        origenLat: base.lat,
        origenLng: base.lng,
        paradas: paradas.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          nombre: p.nombre,
          provincia: p.provincia,
          cylinderIds: '',
          notas: '',
        })),
      }),
    })

    if (!res.ok) {
      toast({ title: 'Error al crear ruta', variant: 'destructive' })
      return
    }

    toast({
      title: 'Ruta creada',
      description: `${nombreRuta} con ${paradas.length} paradas`,
    })
    setNombreRuta('')
    setParadasSeleccionadas([])
    load()
  }

  async function eliminarRuta(id: string) {
    if (!confirm('¿Eliminar esta ruta?')) return
    await fetch(`/api/routes/${id}`, { method: 'DELETE' })
    toast({ title: 'Ruta eliminada' })
    load()
  }

  async function cambiarEstado(ruta: Ruta, estado: string) {
    await fetch(`/api/routes/${ruta.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    toast({ title: `Ruta marcada como ${estado}` })
    load()
  }

  // Mapa de la ruta seleccionada
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null)
  const rutaMarkers = useMemo(() => {
    if (!rutaSeleccionada || !base) return []
    return [
      {
        id: 'base',
        lat: base.lat,
        lng: base.lng,
        color: '#dc2626',
        label: base.nombre,
        isBase: true,
        popup: `<strong>Base Operativa</strong><br/>${base.nombre}`,
      },
    ]
  }, [rutaSeleccionada, base])

  const rutaRoutes = useMemo(() => {
    if (!rutaSeleccionada || !base) return []
    return [
      {
        id: rutaSeleccionada.id,
        color: '#f97316',
        nombre: rutaSeleccionada.nombre,
        distanciaKm: rutaSeleccionada.distanciaKm,
        points: [
          { lat: base.lat, lng: base.lng, nombre: base.nombre },
          ...rutaSeleccionada.paradas.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            nombre: p.nombre,
          })),
          { lat: base.lat, lng: base.lng, nombre: `Retorno a ${base.nombre}` },
        ],
      },
    ]
  }, [rutaSeleccionada, base])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planificador */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-orange-500" />
              Planificar Nueva Ruta
            </CardTitle>
            <CardDescription>
              Origen: San Nicolás de los Arroyos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Nombre de la ruta</Label>
              <Input
                placeholder="Ej: Ruta Litoral - Martes"
                value={nombreRuta}
                onChange={(e) => setNombreRuta(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">
                Paradas ({paradasSeleccionadas.length} seleccionadas)
              </Label>
              <ScrollArea className="h-[300px] border border-slate-200 rounded-md">
                <div className="p-2 space-y-1">
                  {locations
                    .filter((l) => !l.esBase)
                    .map((l) => {
                      const selected = paradasSeleccionadas.includes(l.nombre)
                      return (
                        <label
                          key={l.id}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm ${
                            selected
                              ? 'bg-orange-50 border border-orange-200'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleParada(l.nombre)}
                            className="w-4 h-4 accent-orange-500"
                          />
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="font-medium">{l.nombre}</span>
                          <span className="text-xs text-slate-400 ml-auto">
                            {l.provincia}
                          </span>
                        </label>
                      )
                    })}
                </div>
              </ScrollArea>
            </div>
            <Button
              onClick={crearRuta}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1" /> Crear Ruta
            </Button>
          </CardContent>
        </Card>

        {/* Lista de rutas existentes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-500" />
              Rutas Planificadas
            </CardTitle>
            <CardDescription>
              {loading
                ? 'Cargando...'
                : `${rutas.length} ruta(s) registrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : rutas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <RouteIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                No hay rutas creadas todavía
              </div>
            ) : (
              <div className="space-y-3">
                {rutas.map((r) => (
                  <div
                    key={r.id}
                    className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {r.nombre}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <Badge
                        variant={
                          r.estado === 'COMPLETADA'
                            ? 'default'
                            : r.estado === 'EN_PROGRESO'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {r.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div className="flex items-center gap-1 text-slate-600">
                        <RouteIcon className="w-3 h-3" />
                        <span className="font-semibold tabular-nums">
                          {r.distanciaKm} km
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3 h-3" />
                        <span className="font-semibold tabular-nums">
                          {r.duracionHoras} h
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3" />
                        <span className="font-semibold">
                          {r.paradas.length} paradas
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {r.paradas.map((p, idx) => (
                        <Badge
                          key={p.id}
                          variant="outline"
                          className="text-[10px] py-0 h-5"
                        >
                          {idx + 1}. {p.nombre}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRutaSeleccionada(r)}
                      >
                        <MapIcon className="w-3 h-3 mr-1" /> Ver en mapa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cambiarEstado(r, 'EN_PROGRESO')}
                        disabled={r.estado === 'EN_PROGRESO'}
                      >
                        Iniciar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cambiarEstado(r, 'COMPLETADA')}
                        disabled={r.estado === 'COMPLETADA'}
                      >
                        Completar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 ml-auto"
                        onClick={() => eliminarRuta(r.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mapa de ruta seleccionada */}
      {rutaSeleccionada && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Mapa de Ruta: {rutaSeleccionada.nombre}
                </CardTitle>
                <CardDescription>
                  {rutaSeleccionada.distanciaKm} km · {rutaSeleccionada.duracionHoras} h ·{' '}
                  {rutaSeleccionada.paradas.length} paradas · Origen y retorno a San
                  Nicolás de los Arroyos
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRutaSeleccionada(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MapView markers={rutaMarkers} routes={rutaRoutes} height="500px" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// 5. CATÁLOGO DE GASES
// ============================================================
function CatalogoTab() {
  const [gases, setGases] = useState<Gas[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gases')
      .then((r) => r.json())
      .then((data) => {
        setGases(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  const categorias = ['INERTE', 'ACTIVO', 'COMBUSTIBLE', 'COMBURENTE']
  const categoriaColor: Record<string, string> = {
    INERTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ACTIVO: 'bg-amber-50 text-amber-700 border-amber-200',
    COMBUSTIBLE: 'bg-red-50 text-red-700 border-red-200',
    COMBURENTE: 'bg-sky-50 text-sky-700 border-sky-200',
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-slate-800">
                Catálogo Técnico de Gases para Soldadura
              </h2>
              <p className="text-sm text-slate-500">
                Información de tipos de gases, presiones de carga, colores de
                identificación (norma EN 1089-3) y aplicaciones en soldadura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {categorias.map((cat) => {
        const gasesCat = gases.filter((g) => g.categoria === cat)
        if (gasesCat.length === 0) return null
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={`${categoriaColor[cat]} border`}>{cat}</Badge>
              <span className="text-sm text-slate-500">
                {gasesCat.length} gas(es) en esta categoría
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gasesCat.map((g) => (
                <Card key={g.id} className="overflow-hidden">
                  <div
                    className="h-2"
                    style={{ background: g.colorHex }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner"
                        style={{ background: g.colorHex }}
                      >
                        <span
                          className="font-bold text-xs"
                          style={{
                            color: ['#FFFFFF', '#808080'].includes(g.colorHex.toUpperCase())
                              ? '#1e293b'
                              : 'white',
                          }}
                        >
                          {g.codigo}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg text-slate-900">
                          {g.nombre}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          Código: {g.codigo} · {g._count?.cylinders || 0} tubo(s) en
                          stock
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {g.descripcion}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Presión de carga</span>
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {g.presionBar} bar
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Uso principal</span>
                        <span className="font-medium text-slate-800 text-right text-xs">
                          {g.usoPrincipal}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Color del tubo</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300"
                            style={{ background: g.colorHex }}
                          />
                          <span className="font-mono text-xs text-slate-600">
                            {g.colorHex}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Normas de seguridad generales</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-xs">
                <li>
                  Los tubos de oxígeno (O₂) nunca deben entrar en contacto con
                  aceites, grasas o combustibles (riesgo de explosión).
                </li>
                <li>
                  Los tubos de acetileno deben almacenarse y transportarse en
                  posición vertical (contienen acetona como solvente).
                </li>
                <li>
                  Todos los tubos deben superar la prueba hidrostática cada 5 años.
                </li>
                <li>
                  Transportar con capuchón de protección y asegurar contra
                  volcadura en el vehículo.
                </li>
                <li>
                  Ventilar el área de almacenamiento y mantener separados gases
                  combustibles de comburentes.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
