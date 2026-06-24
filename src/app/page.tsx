'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
  Users,
  Building2,
  FileText,
  Hash,
  DollarSign,
  ShieldAlert,
  Contact,
  FlaskConical,
  Wrench,
  Beaker,
  Settings2,
  History,
  Clock,
  Bell,
  ShoppingCart,
  GitBranch,
  Receipt,
  ClipboardList,
  Pencil,
  Printer,
  Eye,
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
import { ESTADOS, CAPACIDADES_LITROS, CLIENTES_EJEMPLO } from '@/lib/catalogo'

const TIPOLOGIAS = [
  'Metalúrgica Pesada', 'Construcción Pesada', 'Taller Metalúrgico',
  'Herrería Artística', 'Estructuras Metálicas', 'Calderería',
  'Comercio Industrial', 'Servicios de Soldadura', 'Industria Metalúrgica',
  'Aceros', 'Industria Pesada', 'Taller Mecánico', 'Construcción',
  'Carrocerías', 'Soldadura Especializada', 'Farmacéutico',
]

const ESTADO_CUENTA_OPTS = ['AL_DIA', 'PENDIENTE', 'MOROSO']

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
  peligro: string
  precioAlquilerDiario?: number | null
  precioAlquilerMensual?: number | null
  precioVenta?: number | null
  _count?: { cylinders: number }
}

const SGA_PELIGROS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  INFLAMABLE: { label: 'Inflamable', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  COMBURENTE: { label: 'Comburente', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  GAS_PRESION: { label: 'Gas a Presión', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  NINGUNO: { label: 'Sin Riesgo', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
}

function SgaBadge({ peligro }: { peligro: string }) {
  const info = SGA_PELIGROS[peligro] || SGA_PELIGROS.GAS_PRESION
  return (
    <Badge variant="outline" className={`${info.bg} ${info.text} ${info.border} text-[10px] px-1.5 py-0 leading-tight`}>
      {info.label}
    </Badge>
  )
}

interface Cylinder {
  id: string
  numeroSerie: string
  propietario: string | null
  fabricante: string | null
  paisFabricacion: string | null
  marcaUN: boolean
  normaFabricacion: string | null
  presionTrabajoBar: number | null
  roscacilindro: string | null
  espesorMinParedMm: number | null
  materialAleacion: string | null
  capacidadLitros: number
  pesoVacioKg: number | null
  pesoTaraKg: number | null
  pesoMaxLlenadoKg: number | null
  presionEnsayoBar: number | null
  fechaEnsayoInicial: string | null
  fechaUltimoRetest: string | null
  fechaProximoRetest: string
  resultadoInspeccion: string
  inspectorId: string | null
  laboratorio: string | null
  metodoPrueba: string | null
  gasId: string
  gas: Gas
  presionActualBar: number
  masaPorosaId: string | null
  tipoSolvente: string | null
  solventeMasaKg: number | null
  vidaUtilLimite: string | null
  reparaciones: string | null
  observaciones: string | null
  compatibleH2: boolean
  estado: string
  ubicacionLat: number
  ubicacionLng: number
  ubicacionNombre: string
  provincia: string
  clienteId: string | null
  cliente: string | null
  fechaCarga: string | null
}

interface Location {
  id: string
  nombre: string
  provincia: string
  lat: number
  lng: number
  esBase: boolean
  tipo: string
  direccion?: string | null
  telefono?: string | null
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
  geometry?: string | null
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

interface Cliente {
  id: string
  nombre: string
  taxId: string | null
  contacto: string | null
  firmaDigital: string | null
  tipologia: string | null
  procesoSoldadura: string | null
  materialesBase: string | null
  parametrosIngenieria: string | null
  modoEnvasado: string | null
  gasesConsumo: string | null
  serviciosEspecializados: string | null
  nivelesStockCritico: number | null
  contratoComodato: string | null
  activosEnPosesion: string | null
  fechaVencimientoContrato: string | null
  historialDevoluciones: string | null
  cargosRecurrentes: string | null
  penalizacionesExtravio: string | null
  estadoCuenta: string | null
  ubicaciones: string | null
  lat: number | null
  lng: number | null
  notas: string | null
  activo: boolean
  _count?: { cylinders: number }
}

interface AlertaPorGas {
  gasId: string
  gas: Gas
  diasAlertaRetest: number
  diasMaxCliente: number
  enAlertaRetest: number
  vencidos: number
}

interface Stats {
  total: number
  porEstado: { estado: string; cantidad: number }[]
  porGas: { gas: Gas; cantidad: number; capacidadTotal: number }[]
  porCapacidad: { capacidad: number; cantidad: number }[]
  porUbicacion: { ubicacion: string; provincia: string; cantidad: number }[]
  enAlertaVencimiento: Cylinder[]
  alertasPorGas: AlertaPorGas[]
  totalAlertas: number
  capacidadTotalLitros: number
}

// Mapa cargado dinámicamente (sin SSR porque Leaflet usa window)
import type { MapMarker } from '@/components/map-view'

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

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
  ssr: false,
  loading: () => <div className="h-[250px] rounded-lg bg-slate-100 animate-pulse" />,
})

const ReportesTab = dynamic(() => import('@/components/reportes-tab'), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] rounded-xl" />,
})

const ObservacionesTab = dynamic(() => import('@/components/observaciones-tab'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] rounded-xl" />,
})

const LoginPage = dynamic(() => import('@/components/login-page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
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
  const [user, setUser] = useState<any | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('opencode_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { /* ignore */ }
    }
    setAuthReady(true)
  }, [])

  if (!authReady) return null

  if (!user) {
    return <LoginPage onLogin={(u) => { setUser(u); sessionStorage.setItem('opencode_user', JSON.stringify(u)) }} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header user={user} onLogout={() => { setUser(null); sessionStorage.removeItem('opencode_user') }} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="flex w-full overflow-x-auto gap-1 mb-6 h-auto p-1 scrollbar-thin whitespace-nowrap justify-start">
            <TabsTrigger value="dashboard" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Activity className="w-4 h-4" /><span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="mapa" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <MapIcon className="w-4 h-4" /><span>Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="inventario" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Package className="w-4 h-4" /><span>Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="rutas" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <RouteIcon className="w-4 h-4" /><span>Rutas</span>
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4" /><span>Catálogo</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Users className="w-4 h-4" /><span>Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="laboratorio" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Beaker className="w-4 h-4" /><span>Laboratorio</span>
            </TabsTrigger>
            <TabsTrigger value="configuracion" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Settings2 className="w-4 h-4" /><span>Configuración</span>
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <ShoppingCart className="w-4 h-4" /><span>Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="facturacion" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Receipt className="w-4 h-4" /><span>Facturación</span>
            </TabsTrigger>
            <TabsTrigger value="remitos" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <ClipboardList className="w-4 h-4" /><span>Entrega/Remitos</span>
            </TabsTrigger>
            <TabsTrigger value="mantenimiento" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Wrench className="w-4 h-4" /><span>Mantenimiento</span>
            </TabsTrigger>
             <TabsTrigger value="tablas" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <FileText className="w-4 h-4" /><span>Tablas</span>
            </TabsTrigger>
            <TabsTrigger value="reportes" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Printer className="w-4 h-4" /><span>Reportes</span>
            </TabsTrigger>
            <TabsTrigger value="observaciones" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Eye className="w-4 h-4" /><span>Observaciones</span>
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
          <TabsContent value="clientes">
            <ClientesTab />
          </TabsContent>
          <TabsContent value="laboratorio">
            <LaboratorioTab />
          </TabsContent>
          <TabsContent value="configuracion">
            <ConfiguracionTab />
          </TabsContent>
          <TabsContent value="pedidos">
            <PedidosTab />
          </TabsContent>
          <TabsContent value="facturacion">
            <FacturacionTab />
          </TabsContent>
          <TabsContent value="remitos">
            <RemitosTab />
          </TabsContent>
          <TabsContent value="mantenimiento">
            <MantenimientoTab />
          </TabsContent>
          <TabsContent value="tablas">
            <TablasTab />
          </TabsContent>
          <TabsContent value="reportes">
            <ReportesTab />
          </TabsContent>
          <TabsContent value="observaciones">
            <ObservacionesTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}

function Header({ user, onLogout }: { user?: any; onLogout?: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Control Digital ManejaDatos
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Districon · Ferreteria Industrial · Gases para soldadura
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden md:flex border-orange-300 text-orange-700 bg-orange-50">
            <MapPin className="w-3 h-3 mr-1" />
            Base: San Nicolás de los Arroyos
          </Badge>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {user.nombre}
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                title="Cerrar sesión"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
        Control Digital ManejaDatos Districon · Ferreteria Industrial · Gases para
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

  // Cilindros filtrados para el mapa
  const mapMarkers = useMemo(() => {
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

  // Marcadores de alertas (tubos con PH vencida)
  const alertMarkers = useMemo(() => {
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

      {/* Alertas por gas */}
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

      {/* Mapa de geoposicionamiento */}
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

      {/* Mapa de alertas */}
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

  // Graph dialog
  const [graphCylinder, setGraphCylinder] = useState<Cylinder | null>(null)
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[]; source: string } | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)

  async function loadGraph(cyl: Cylinder) {
    setGraphLoading(true)
    setGraphCylinder(cyl)
    setGraphData(null)
    try {
      const res = await fetch(`/api/cylinders/${cyl.id}/graph`)
      if (!res.ok) throw new Error()
      setGraphData(await res.json())
    } catch { setGraphData(null) }
    finally { setGraphLoading(false) }
  }
  const emptyForm = {
    numeroSerie: '',
    gasId: '',
    propietario: '',
    fabricante: '',
    paisFabricacion: '',
    marcaUN: 'false',
    normaFabricacion: '',
    presionTrabajoBar: '',
    roscacilindro: '',
    espesorMinParedMm: '',
    materialAleacion: '',
    capacidadLitros: '40',
    pesoVacioKg: '',
    pesoTaraKg: '',
    pesoMaxLlenadoKg: '',
    presionEnsayoBar: '',
    fechaEnsayoInicial: '',
    fechaUltimoRetest: '',
    fechaProximoRetest: '',
    resultadoInspeccion: 'APROBADO',
    inspectorId: '',
    laboratorio: '',
    metodoPrueba: '',
    presionActualBar: '200',
    masaPorosaId: '',
    tipoSolvente: '',
    solventeMasaKg: '',
    vidaUtilLimite: '',
    reparaciones: '',
    observaciones: '',
    compatibleH2: 'false',
    estado: 'LLENO',
    ubicacionNombre: 'San Nicolás de los Arroyos',
    provincia: 'Buenos Aires',
    ubicacionLat: '-33.3293',
    ubicacionLng: '-60.2244',
    cliente: '',
  }
  const [form, setForm] = useState({ ...emptyForm })

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
      ...emptyForm,
      numeroSerie: `SN-2026-${String(cylinders.length + 1).padStart(4, '0')}`,
      gasId: gases[0]?.id || '',
      capacidadLitros: '40',
      presionActualBar: gases[0] ? String(gases[0].presionBar) : '200',
      ubicacionNombre: 'San Nicolás de los Arroyos',
      provincia: 'Buenos Aires',
      ubicacionLat: '-33.3293',
      ubicacionLng: '-60.2244',
      resultadoInspeccion: 'APROBADO',
      estado: 'LLENO',
    })
    setDialogOpen(true)
  }

  function openEdit(c: Cylinder) {
    setEditId(c.id)
    setForm({
      numeroSerie: c.numeroSerie,
      gasId: c.gasId,
      propietario: c.propietario || '',
      fabricante: c.fabricante || '',
      paisFabricacion: c.paisFabricacion || '',
      marcaUN: c.marcaUN ? 'true' : 'false',
      normaFabricacion: c.normaFabricacion || '',
      presionTrabajoBar: c.presionTrabajoBar != null ? String(c.presionTrabajoBar) : '',
      roscacilindro: c.roscacilindro || '',
      espesorMinParedMm: c.espesorMinParedMm != null ? String(c.espesorMinParedMm) : '',
      materialAleacion: c.materialAleacion || '',
      capacidadLitros: String(c.capacidadLitros),
      pesoVacioKg: c.pesoVacioKg != null ? String(c.pesoVacioKg) : '',
      pesoTaraKg: c.pesoTaraKg != null ? String(c.pesoTaraKg) : '',
      pesoMaxLlenadoKg: c.pesoMaxLlenadoKg != null ? String(c.pesoMaxLlenadoKg) : '',
      presionEnsayoBar: c.presionEnsayoBar != null ? String(c.presionEnsayoBar) : '',
      fechaEnsayoInicial: c.fechaEnsayoInicial || '',
      fechaUltimoRetest: c.fechaUltimoRetest ? c.fechaUltimoRetest.split('T')[0] : '',
      fechaProximoRetest: c.fechaProximoRetest ? c.fechaProximoRetest.split('T')[0] : '',
      resultadoInspeccion: c.resultadoInspeccion || 'APROBADO',
      inspectorId: c.inspectorId || '',
      laboratorio: c.laboratorio || '',
      metodoPrueba: c.metodoPrueba || '',
      presionActualBar: String(c.presionActualBar),
      masaPorosaId: c.masaPorosaId || '',
      tipoSolvente: c.tipoSolvente || '',
      solventeMasaKg: c.solventeMasaKg != null ? String(c.solventeMasaKg) : '',
      vidaUtilLimite: c.vidaUtilLimite ? c.vidaUtilLimite.split('T')[0] : '',
      reparaciones: c.reparaciones || '',
      observaciones: c.observaciones || '',
      compatibleH2: c.compatibleH2 ? 'true' : 'false',
      estado: c.estado,
      ubicacionNombre: c.ubicacionNombre,
      provincia: c.provincia,
      ubicacionLat: String(c.ubicacionLat),
      ubicacionLng: String(c.ubicacionLng),
      cliente: c.cliente || '',
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
                    const diasVenc = daysUntil(c.fechaProximoRetest)
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
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-slate-400">{c.gas.codigo}</span>
                                <SgaBadge peligro={c.gas.peligro} />
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
                            {formatDate(c.fechaProximoRetest)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-purple-600"
                              onClick={() => loadGraph(c)}
                              title="Ver grafo de relaciones"
                            >
                              <GitBranch className="w-4 h-4" />
                            </Button>
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

          <div className="space-y-6">
            {/* --- 1. Identificación General --- */}
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Identificación General</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Número de serie *</Label>
                  <Input value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} placeholder="SN-2026-0001" />
                </div>
                <div>
                  <Label className="text-xs">Tipo de gas *</Label>
                  <Select value={form.gasId} onValueChange={(v) => { const g = gases.find((x) => x.id === v); setForm({ ...form, gasId: v, presionActualBar: g ? String(g.presionBar) : form.presionActualBar }) }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar gas" /></SelectTrigger>
                    <SelectContent>
                      {gases.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: g.colorHex }} />
                            {g.nombre} ({g.codigo})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Propietario</Label>
                  <Input value={form.propietario} onChange={(e) => setForm({ ...form, propietario: e.target.value })} placeholder="ManejaDatos Districon" />
                </div>
                <div>
                  <Label className="text-xs">Estado actual</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (<SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* --- 2. Especificaciones de Diseño --- */}
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Especificaciones de Diseño</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Fabricante</Label>
                  <Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} placeholder="Ej: FAE, Luxfer" />
                </div>
                <div>
                  <Label className="text-xs">País de fabricación</Label>
                  <Input value={form.paisFabricacion} onChange={(e) => setForm({ ...form, paisFabricacion: e.target.value })} placeholder="Argentina" />
                </div>
                <div>
                  <Label className="text-xs">Marca UN</Label>
                  <Select value={form.marcaUN} onValueChange={(v) => setForm({ ...form, marcaUN: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Norma de fabricación</Label>
                  <Input value={form.normaFabricacion} onChange={(e) => setForm({ ...form, normaFabricacion: e.target.value })} placeholder="NTC 5719 / ISO 18119" />
                </div>
                <div>
                  <Label className="text-xs">Presión de trabajo (bar)</Label>
                  <Input type="number" value={form.presionTrabajoBar} onChange={(e) => setForm({ ...form, presionTrabajoBar: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Roscacilindro / Conexión</Label>
                  <Input value={form.roscacilindro} onChange={(e) => setForm({ ...form, roscacilindro: e.target.value })} placeholder="25E / G5/8" />
                </div>
                <div>
                  <Label className="text-xs">Espesor mínimo pared (mm)</Label>
                  <Input type="number" step="0.1" value={form.espesorMinParedMm} onChange={(e) => setForm({ ...form, espesorMinParedMm: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Material / Aleación</Label>
                  <Input value={form.materialAleacion} onChange={(e) => setForm({ ...form, materialAleacion: e.target.value })} placeholder="Acero / Aluminio" />
                </div>
              </div>
            </div>

            {/* --- 3. Pesos y Capacidades --- */}
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Pesos y Capacidades</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Capacidad (litros) *</Label>
                  <Select value={form.capacidadLitros} onValueChange={(v) => setForm({ ...form, capacidadLitros: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAPACIDADES_LITROS.map((c) => (<SelectItem key={c} value={String(c)}>{c} L</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Peso vacío (kg)</Label>
                  <Input type="number" step="0.1" value={form.pesoVacioKg} onChange={(e) => setForm({ ...form, pesoVacioKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Peso tara (kg)</Label>
                  <Input type="number" step="0.1" value={form.pesoTaraKg} onChange={(e) => setForm({ ...form, pesoTaraKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Peso máximo llenado (kg)</Label>
                  <Input type="number" step="0.1" value={form.pesoMaxLlenadoKg} onChange={(e) => setForm({ ...form, pesoMaxLlenadoKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Presión de ensayo (bar)</Label>
                  <Input type="number" value={form.presionEnsayoBar} onChange={(e) => setForm({ ...form, presionEnsayoBar: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Presión actual (bar)</Label>
                  <Input type="number" value={form.presionActualBar} onChange={(e) => setForm({ ...form, presionActualBar: e.target.value })} />
                </div>
              </div>
            </div>

            {/* --- 4. Inspección y Recalificación --- */}
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Inspección y Recalificación</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Fecha ensayo inicial</Label>
                  <Input type="date" value={form.fechaEnsayoInicial} onChange={(e) => setForm({ ...form, fechaEnsayoInicial: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Fecha último retest</Label>
                  <Input type="date" value={form.fechaUltimoRetest} onChange={(e) => setForm({ ...form, fechaUltimoRetest: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Próximo retest *</Label>
                  <Input type="date" value={form.fechaProximoRetest} onChange={(e) => setForm({ ...form, fechaProximoRetest: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Resultado inspección</Label>
                  <Select value={form.resultadoInspeccion} onValueChange={(v) => setForm({ ...form, resultadoInspeccion: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APROBADO">Aprobado</SelectItem>
                      <SelectItem value="CONDICIONAL">Condicional</SelectItem>
                      <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Inspector ID</Label>
                  <Input value={form.inspectorId} onChange={(e) => setForm({ ...form, inspectorId: e.target.value })} placeholder="N.º habilitación" />
                </div>
                <div>
                  <Label className="text-xs">Laboratorio</Label>
                  <Input value={form.laboratorio} onChange={(e) => setForm({ ...form, laboratorio: e.target.value })} placeholder="Laboratorio habilitado" />
                </div>
                <div>
                  <Label className="text-xs">Método de prueba</Label>
                  <Input value={form.metodoPrueba} onChange={(e) => setForm({ ...form, metodoPrueba: e.target.value })} placeholder="PH / Ultrasonido" />
                </div>
                <div>
                  <Label className="text-xs">Vida útil límite</Label>
                  <Input type="date" value={form.vidaUtilLimite} onChange={(e) => setForm({ ...form, vidaUtilLimite: e.target.value })} />
                </div>
              </div>
            </div>

            {/* --- 5. Campos Específicos (Disolución / Masa Porosa) --- */}
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Campos Específicos (Disolución / Masa Porosa)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Masa porosa ID / tipo</Label>
                  <Input value={form.masaPorosaId} onChange={(e) => setForm({ ...form, masaPorosaId: e.target.value })} placeholder="AEC / ACM" />
                </div>
                <div>
                  <Label className="text-xs">Tipo de solvente</Label>
                  <Input value={form.tipoSolvente} onChange={(e) => setForm({ ...form, tipoSolvente: e.target.value })} placeholder="Acetona / DMF" />
                </div>
                <div>
                  <Label className="text-xs">Solvente — masa (kg)</Label>
                  <Input type="number" step="0.1" value={form.solventeMasaKg} onChange={(e) => setForm({ ...form, solventeMasaKg: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Compatible H₂</Label>
                  <Select value={form.compatibleH2} onValueChange={(v) => setForm({ ...form, compatibleH2: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* --- 6. Observaciones --- */}
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Observaciones</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs">Reparaciones</Label>
                  <Input value={form.reparaciones} onChange={(e) => setForm({ ...form, reparaciones: e.target.value })} placeholder="Historial de reparaciones si aplica" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Observaciones</Label>
                  <Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Notas adicionales" />
                </div>
              </div>
            </div>

            {/* --- 7. Ubicación / Cliente --- */}
            <div>
              <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b pb-1">Ubicación y Cliente</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">Ubicación (ciudad) *</Label>
                  <Select value={form.ubicacionNombre} onValueChange={(v) => { const loc = locations.find((l) => l.nombre === v); if (loc) { setForm({ ...form, ubicacionNombre: loc.nombre, provincia: loc.provincia, ubicacionLat: String(loc.lat), ubicacionLng: String(loc.lng) }) } }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (<SelectItem key={l.id} value={l.nombre}>{l.esBase && '🏭 '} {l.nombre} ({l.provincia})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">Cliente / Destino</Label>
                  <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Nombre del cliente" />
                </div>
                <div className="hidden">
                  <Input value={form.ubicacionLat} readOnly />
                  <Input value={form.ubicacionLng} readOnly />
                  <Input value={form.provincia} readOnly />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={save} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Graph dialog */}
      <Dialog open={!!graphCylinder} onOpenChange={(o) => { if (!o) setGraphCylinder(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-600" />
              Grafo de relaciones — {graphCylinder?.numeroSerie}
            </DialogTitle>
            <DialogDescription>
              Nodos: {graphData?.nodes.length ?? 0} | Aristas: {graphData?.edges.length ?? 0}
              {graphData?.source === 'neo4j' ? <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-[10px]">Neo4j</Badge> : <Badge className="ml-2 bg-amber-100 text-amber-700 text-[10px]">SQLite</Badge>}
            </DialogDescription>
          </DialogHeader>

          {graphLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : !graphData || graphData.nodes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Sin datos de grafo para este tubo</div>
          ) : (
            <div className="space-y-4">
              {/* Visual graph */}
              <SimpleGraph nodes={graphData.nodes} edges={graphData.edges} />

              {/* Node table */}
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {graphData.nodes.map(n => (
                      <TableRow key={n.id}>
                        <TableCell>
                          <Badge variant="outline" style={{ background: NODE_COLORS[n.type]?.fill || '#f1f5f9', color: NODE_COLORS[n.type]?.text || '#475569', borderColor: NODE_COLORS[n.type]?.stroke || '#cbd5e1' }} className="text-[10px]">
                            {n.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{n.label}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-64 truncate">
                          {n.type === 'Cylinder' && `${n.properties.estado || ''} | ${n.properties.capacidad || ''}L | ${n.properties.presion || ''}bar`}
                          {n.type === 'Gas' && `${n.properties.codigo || ''}`}
                          {n.type === 'Cliente' && ''}
                          {n.type === 'Location' && `${n.properties.provincia || ''}`}
                          {n.type === 'Movimiento' && `${n.properties.tipo || ''} @ ${n.properties.ubicacion || ''}`}
                          {n.type === 'Mantenimiento' && `${n.properties.tipo || ''}${n.properties.tecnico ? ` por ${n.properties.tecnico}` : ''}`}
                          {!['Cylinder', 'Gas', 'Cliente', 'Location', 'Movimiento', 'Mantenimiento'].includes(n.type) && JSON.stringify(n.properties).slice(0, 60)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Edges */}
              <details>
                <summary className="text-sm font-medium text-slate-500 cursor-pointer">Aristas ({graphData.edges.length})</summary>
                <div className="overflow-x-auto rounded-lg border mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origen</TableHead>
                        <TableHead>Relación</TableHead>
                        <TableHead>Destino</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {graphData.edges.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{e.source}</TableCell>
                          <TableCell><Badge className="bg-purple-100 text-purple-700 text-[10px]">{e.type}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{e.target}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            </div>
          )}
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
  const [selectedParadas, setSelectedParadas] = useState<Location[]>([])
  const [optimizando, setOptimizando] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Distancia optimizada (OSRM)
  const [optDistance, setOptDistance] = useState<{ km: number; horas: number } | null>(null)

  // Geometría de ruta optimizada (OSRM)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null)

  // Navegación
  const [navegando, setNavegando] = useState<Ruta | null>(null)
  const [currentStopIdx, setCurrentStopIdx] = useState(0)

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

  function toggleParada(loc: Location) {
    setSelectedParadas((prev) => {
      const exists = prev.find((p) => p.id === loc.id)
      if (exists) return prev.filter((p) => p.id !== loc.id)
      return [...prev, loc]
    })
  }

  function moveParada(idx: number, direction: -1 | 1) {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= selectedParadas.length) return
    const arr = [...selectedParadas]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setSelectedParadas(arr)
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const arr = [...selectedParadas]
    ;[arr[dragIdx], arr[idx]] = [arr[idx], arr[dragIdx]]
    setSelectedParadas(arr)
    setDragIdx(idx)
  }

  async function optimizarRuta() {
    if (selectedParadas.length < 2) {
      toast({ title: 'Seleccioná al menos 2 paradas', variant: 'destructive' })
      return
    }
    if (!base) {
      toast({ title: 'Error', description: 'No se encontró la base', variant: 'destructive' })
      return
    }
    setOptimizando(true)
    try {
      const res = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: { lat: base.lat, lng: base.lng },
          points: selectedParadas.map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            nombre: p.nombre,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const reordered = data.optimized
        .map((o: any) => selectedParadas.find((p) => p.id === o.id))
        .filter(Boolean) as Location[]
      setSelectedParadas(reordered)
      if (data.geometry) {
        setRouteGeometry(data.geometry)
      }
      setOptDistance({ km: data.distanceTotal, horas: Math.round(data.durationMin / 60 * 10) / 10 })
      const modo = data.usaLiveMatrix ? 'OSRM' : 'Haversine'
      toast({
        title: `Ruta optimizada (${modo})`,
        description: `${data.distanceTotal} km totales, ~${data.durationMin} min`,
      })
    } catch {
      toast({ title: 'Error al optimizar', variant: 'destructive' })
    }
    setOptimizando(false)
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
    if (selectedParadas.length === 0) {
      toast({ title: 'Faltan paradas', description: 'Seleccione al menos una parada', variant: 'destructive' })
      return
    }

    const body: any = {
      nombre: nombreRuta,
      origenNombre: base.nombre,
      origenLat: base.lat,
      origenLng: base.lng,
      paradas: selectedParadas.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        nombre: p.nombre,
        provincia: p.provincia,
        cylinderIds: '',
        notas: '',
      })),
    }

    // Pass optimized real distance if available
    if (optDistance) {
      body.distanciaReal = optDistance.km
      body.duracionReal = optDistance.horas
    }

    if (routeGeometry && routeGeometry.length >= 2) {
      body.geometry = JSON.stringify(routeGeometry)
    }

    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      toast({ title: 'Error al crear ruta', variant: 'destructive' })
      return
    }

    toast({ title: 'Ruta creada', description: `${nombreRuta} con ${selectedParadas.length} paradas` })
    setNombreRuta('')
    setSelectedParadas([])
    setOptDistance(null)
    setRouteGeometry(null)
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
    toast({ title: `Ruta marcada como ${estado.replace('_', ' ')}` })
    load()
  }

  async function marcarEntregado(paradaId: string) {
    const r = navegando
    if (!r) return
    await fetch(`/api/routes/${r.id}/paradas/${paradaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'ENTREGADO', llegada: true }),
    })
    setCurrentStopIdx((prev) => Math.min(prev + 1, r.paradas.length))
    load()
  }

  function iniciarNavegacion(r: Ruta) {
    setNavegando(r)
    setCurrentStopIdx(r.paradas.findIndex((p) => p.estado !== 'ENTREGADO'))
    if (currentStopIdx < 0) setCurrentStopIdx(0)
  }

  // Mapa de la ruta seleccionada
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null)
  const rutaMarkers = useMemo(() => {
    const markers: MapMarker[] = []

    // Planning markers (selected paradas)
    if (base && selectedParadas.length > 0) {
      markers.push({
        id: 'base-planning',
        lat: base.lat,
        lng: base.lng,
        color: '#dc2626',
        label: base.nombre,
        isBase: true,
        popup: `<strong>Base Operativa</strong><br/>${base.nombre}`,
      })
      selectedParadas.forEach((p) => {
        markers.push({
          id: `planning-${p.id}`,
          lat: p.lat,
          lng: p.lng,
          color: '#3b82f6',
          label: p.nombre,
          popup: p.nombre,
        })
      })
    }

    // Selected saved route markers
    if (rutaSeleccionada && base) {
      const delivered = rutaSeleccionada.paradas.filter((p) => p.estado === 'ENTREGADO').length
      markers.push({
        id: 'base-saved',
        lat: base.lat,
        lng: base.lng,
        color: '#dc2626',
        label: base.nombre,
        isBase: true,
        popup: `<strong>Base Operativa</strong><br/>${base.nombre}<br/><span style="font-size:11px;color:#64748b;">${delivered}/${rutaSeleccionada.paradas.length} entregados</span>`,
      })
    }

    return markers
  }, [rutaSeleccionada, base, selectedParadas])

  const rutaRoutes = useMemo(() => {
    const routes: any[] = []

    // Planning route (selected paradas + optimized geometry)
    if (base && selectedParadas.length > 0) {
      const planningPoints = [
        { lat: base.lat, lng: base.lng, nombre: base.nombre },
        ...selectedParadas.map((p) => ({ lat: p.lat, lng: p.lng, nombre: p.nombre })),
      ]

      routes.push({
        id: 'planning',
        color: '#3b82f6',
        nombre: 'Planificación',
        distanciaKm: optDistance?.km,
        points: planningPoints,
        geometry: routeGeometry || undefined,
      })
    }

    // Selected saved route
    if (rutaSeleccionada && base) {
      let savedGeometry: [number, number][] | undefined
      if (rutaSeleccionada.geometry) {
        try {
          const parsed = JSON.parse(rutaSeleccionada.geometry)
          if (Array.isArray(parsed) && parsed.length >= 2) {
            savedGeometry = parsed
          }
        } catch { /* ignore */ }
      }
      routes.push({
        id: rutaSeleccionada.id,
        color: '#f97316',
        nombre: rutaSeleccionada.nombre,
        distanciaKm: rutaSeleccionada.distanciaKm,
        geometry: savedGeometry,
        points: [
          { lat: base.lat, lng: base.lng, nombre: base.nombre },
          ...rutaSeleccionada.paradas.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            nombre: p.nombre,
          })),
          { lat: base.lat, lng: base.lng, nombre: `Retorno a ${base.nombre}` },
        ],
      })
    }

    return routes
  }, [rutaSeleccionada, base, selectedParadas, optDistance, routeGeometry])

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
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Nombre de la ruta</Label>
              <Input
                placeholder="Ej: Ruta Litoral - Martes"
                value={nombreRuta}
                onChange={(e) => setNombreRuta(e.target.value)}
              />
            </div>

            {/* Ubicaciones disponibles */}
            <div>
              <Label className="text-xs">Ubicaciones disponibles</Label>
              <ScrollArea className="h-[200px] border border-slate-200 rounded-md">
                <div className="p-1.5 space-y-0.5">
                  {locations
                    .filter((l) => !l.esBase)
                    .map((l) => {
                      const selected = selectedParadas.some((p) => p.id === l.id)
                      return (
                        <label
                          key={l.id}
                          className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-xs ${
                            selected
                              ? 'bg-orange-50 border border-orange-200'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleParada(l)}
                            className="w-3.5 h-3.5 accent-orange-500"
                          />
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-medium">{l.nombre}</span>
                          <span className="text-[10px] text-slate-400 ml-auto">{l.provincia}</span>
                        </label>
                      )
                    })}
                </div>
              </ScrollArea>
            </div>

            {/* Orden de paradas (drag-and-drop) */}
            {selectedParadas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Orden de paradas ({selectedParadas.length})</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1"
                      onClick={optimizarRuta}
                      disabled={optimizando}
                    >
                      <RefreshCw className={`w-3 h-3 ${optimizando ? 'animate-spin' : ''}`} />
                      Optimizar
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md max-h-[220px] overflow-y-auto">
                  {selectedParadas.map((p, idx) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={() => setDragIdx(null)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 text-xs border-b last:border-b-0 cursor-grab active:cursor-grabbing ${
                        dragIdx === idx ? 'bg-orange-100 opacity-60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate flex-1">{p.nombre}</span>
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          disabled={idx === 0}
                          onClick={() => moveParada(idx, -1)}
                        >
                          ▲
                        </button>
                        <button
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          disabled={idx === selectedParadas.length - 1}
                          onClick={() => moveParada(idx, 1)}
                        >
                          ▼
                        </button>
                        <button
                          className="p-0.5 text-red-300 hover:text-red-500 ml-1"
                          onClick={() => setSelectedParadas((prev) => prev.filter((x) => x.id !== p.id))}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={crearRuta}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
              disabled={selectedParadas.length === 0}
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
              {loading ? 'Cargando...' : `${rutas.length} ruta(s) registrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : rutas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <RouteIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                No hay rutas creadas todavía
              </div>
            ) : (
              <div className="space-y-2">
                {rutas.map((r) => {
                  const total = r.paradas.length
                  const entregadas = r.paradas.filter((p) => p.estado === 'ENTREGADO').length
                  return (
                    <div key={r.id} className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate text-sm">{r.nombre}</h3>
                          <p className="text-[10px] text-slate-500">
                            {new Date(r.createdAt).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                        <Badge
                          variant={r.estado === 'COMPLETADA' ? 'default' : r.estado === 'EN_PROGRESO' ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {r.estado.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Progress bar for EN_PROGRESO */}
                      {r.estado === 'EN_PROGRESO' && (
                        <div className="mb-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>{entregadas} de {total} entregados</span>
                            <span>{total > 0 ? Math.round(entregadas / total * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${total > 0 ? entregadas / total * 100 : 0}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 text-[10px] mb-1.5 text-slate-600">
                        <span className="tabular-nums">{r.distanciaKm} km</span>
                        <span className="tabular-nums">{r.duracionHoras} h</span>
                        <span>{r.paradas.length} paradas</span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {r.paradas.map((p, idx) => (
                          <Badge
                            key={p.id}
                            variant={p.estado === 'ENTREGADO' ? 'default' : 'outline'}
                            className={`text-[9px] py-0 h-4 ${p.estado === 'ENTREGADO' ? 'bg-emerald-500' : ''}`}
                          >
                            {p.estado === 'ENTREGADO' ? '✓' : idx + 1}. {p.nombre}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 pt-1.5 border-t border-slate-100">
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setRutaSeleccionada(r)}>
                          <MapIcon className="w-3 h-3 mr-1" /> Mapa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px]"
                          onClick={() => cambiarEstado(r, 'EN_PROGRESO')}
                          disabled={r.estado === 'EN_PROGRESO' || r.estado === 'COMPLETADA'}
                        >
                          Iniciar
                        </Button>
                        {r.estado === 'EN_PROGRESO' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[10px]"
                            onClick={() => iniciarNavegacion(r)}
                          >
                            <Truck className="w-3 h-3 mr-1" /> Navegar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px]"
                          onClick={() => cambiarEstado(r, 'COMPLETADA')}
                          disabled={r.estado === 'COMPLETADA'}
                        >
                          Completar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-red-500 hover:bg-red-50 ml-auto"
                          onClick={() => eliminarRuta(r.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
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
                <CardTitle className="text-base">Mapa de Ruta: {rutaSeleccionada.nombre}</CardTitle>
                <CardDescription>
                  {rutaSeleccionada.distanciaKm} km · {rutaSeleccionada.duracionHoras} h ·{' '}
                  {rutaSeleccionada.paradas.length} paradas · Origen y retorno
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {rutaSeleccionada.estado === 'EN_PROGRESO' && (
                  <Button size="sm" onClick={() => iniciarNavegacion(rutaSeleccionada)}>
                    <Truck className="w-3 h-3 mr-1" /> Navegar
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setRutaSeleccionada(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MapView markers={rutaMarkers} routes={rutaRoutes} height="450px" />
          </CardContent>
        </Card>
      )}

      {/* Diálogo de navegación */}
      <Dialog open={!!navegando} onOpenChange={(o) => { if (!o) { setNavegando(null); setCurrentStopIdx(0); load() } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {navegando && (() => {
            const r = navegando
            const current = r.paradas[currentStopIdx]
            const restantes = r.paradas.filter((p) => p.estado !== 'ENTREGADO')
            const actual = restantes[0] || r.paradas[r.paradas.length - 1]

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-500" />
                    Navegando: {r.nombre}
                  </DialogTitle>
                </DialogHeader>

                {/* Parada actual */}
                {actual && (
                  <Card className="border-emerald-300 bg-emerald-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                          {restantes.indexOf(actual) + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-emerald-600 font-medium">PRÓXIMA PARADA</p>
                          <h3 className="font-bold text-lg">{actual.nombre}</h3>
                          <p className="text-xs text-slate-500">{actual.provincia}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de paradas */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">
                    Paradas ({restantes.length} restantes de {r.paradas.length})
                  </Label>
                  <div className="space-y-1">
                    {r.paradas.map((p, idx) => {
                      const delivered = p.estado === 'ENTREGADO'
                      const isCurrent = restantes.length > 0 && p.id === restantes[0].id && !delivered
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 p-2 rounded-md text-sm border ${
                            delivered
                              ? 'bg-emerald-50 border-emerald-200'
                              : isCurrent
                              ? 'bg-orange-50 border-orange-300'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            delivered ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {delivered ? '✓' : idx + 1}
                          </div>
                          <span className={`flex-1 ${delivered ? 'line-through text-slate-400' : ''}`}>{p.nombre}</span>
                          <span className="text-[10px] text-slate-400">{p.provincia}</span>
                          {!delivered && isCurrent && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => marcarEntregado(p.id)}
                            >
                              Entregado
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-slate-50 rounded-lg p-3 border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Distancia total</span>
                    <span className="font-mono">{r.distanciaKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duración estimada</span>
                    <span className="font-mono">{r.duracionHoras} h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entregados</span>
                    <span className="font-mono text-emerald-600">{r.paradas.filter((p) => p.estado === 'ENTREGADO').length} / {r.paradas.length}</span>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setNavegando(null); setCurrentStopIdx(0); load() }}>
                    Cerrar navegación
                  </Button>
                  {restantes.length === 0 && (
                    <Button onClick={() => cambiarEstado(r, 'COMPLETADA').then(() => { setNavegando(null); setCurrentStopIdx(0) })}>
                      Finalizar ruta
                    </Button>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
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
                identificación (norma IRAM 2588) y aplicaciones en soldadura.
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
                        <span className="text-slate-500">Riesgo SGA</span>
                        <SgaBadge peligro={g.peligro} />
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Color del tubo (IRAM 2588)</span>
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

// ============================================================
// 6. CLIENTES
// ============================================================
function ClientesTab() {
  const { toast } = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroTipologia, setFiltroTipologia] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')

  // Dialogs: tubos del cliente / historial
  const [viewCylindersCliente, setViewCylindersCliente] = useState<Cliente | null>(null)
  const [cylindersForCliente, setCylindersForCliente] = useState<Cylinder[]>([])
  const [loadingCylinders, setLoadingCylinders] = useState(false)
  const [viewHistoryCliente, setViewHistoryCliente] = useState<Cliente | null>(null)
  const [historyData, setHistoryData] = useState<{ gas: string; mes: string; cantidad: number }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  async function loadCylindersForCliente(clienteId: string) {
    setLoadingCylinders(true)
    try {
      const res = await fetch(`/api/cylinders?clienteId=${encodeURIComponent(clienteId)}`)
      const data = await res.json()
      setCylindersForCliente(Array.isArray(data) ? data : [])
    } catch { setCylindersForCliente([]) }
    finally { setLoadingCylinders(false) }
  }

  async function loadHistoryForCliente(clienteId: string) {
    setLoadingHistory(true)
    try {
      const cylRes = await fetch(`/api/cylinders?clienteId=${encodeURIComponent(clienteId)}`)
      const cyls: Cylinder[] = Array.isArray(await cylRes.json()) ? await cylRes.json() : []
      const histMap = new Map<string, number>()
      for (const cyl of cyls) {
        const movRes = await fetch(`/api/cylinders/${cyl.id}/movimientos`)
        const movs: any[] = Array.isArray(await movRes.json()) ? await movRes.json() : []
        for (const m of movs) {
          const d = new Date(m.fecha)
          const key = `${cyl.gas.nombre}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          histMap.set(key, (histMap.get(key) || 0) + 1)
        }
      }
      setHistoryData(
        Array.from(histMap.entries())
          .map(([k, cantidad]) => {
            const [gas, mes] = k.split('|')
            return { gas, mes, cantidad }
          })
          .sort((a, b) => a.mes.localeCompare(b.mes))
      )
    } catch { setHistoryData([]) }
    finally { setLoadingHistory(false) }
  }

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const emptyForm = {
    nombre: '',
    taxId: '',
    contacto: '',
    firmaDigital: '',
    tipologia: '',
    procesoSoldadura: '',
    materialesBase: '',
    parametrosIngenieria: '',
    modoEnvasado: '',
    gasesConsumo: '',
    serviciosEspecializados: '',
    nivelesStockCritico: '',
    contratoComodato: '',
    activosEnPosesion: '',
    fechaVencimientoContrato: '',
    historialDevoluciones: '',
    cargosRecurrentes: '',
    penalizacionesExtravio: '',
    estadoCuenta: '',
    ubicaciones: '',
    notas: '',
  }
  const [form, setForm] = useState({ ...emptyForm })

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroNombre) params.set('nombre', filtroNombre)
      if (filtroTipologia !== 'all') params.set('tipologia', filtroTipologia)
      if (filtroEstado === 'activos') params.set('activo', 'true')
      if (filtroEstado === 'inactivos') params.set('activo', 'false')
      const res = await fetch(`/api/clientes?${params}`)
      const data = await res.json()
      setClientes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filtroNombre, filtroTipologia, filtroEstado])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  function openCreate() {
    setEditId(null)
    setForm({ ...emptyForm, modoEnvasado: 'Cilindros' })
    setDialogOpen(true)
  }

  function openEdit(c: Cliente) {
    setEditId(c.id)
    setForm({
      nombre: c.nombre,
      taxId: c.taxId || '',
      contacto: c.contacto || '',
      firmaDigital: c.firmaDigital || '',
      tipologia: c.tipologia || '',
      procesoSoldadura: c.procesoSoldadura || '',
      materialesBase: c.materialesBase || '',
      parametrosIngenieria: c.parametrosIngenieria || '',
      modoEnvasado: c.modoEnvasado || '',
      gasesConsumo: c.gasesConsumo || '',
      serviciosEspecializados: c.serviciosEspecializados || '',
      nivelesStockCritico: c.nivelesStockCritico != null ? String(c.nivelesStockCritico) : '',
      contratoComodato: c.contratoComodato || '',
      activosEnPosesion: c.activosEnPosesion || '',
      fechaVencimientoContrato: c.fechaVencimientoContrato ? c.fechaVencimientoContrato.split('T')[0] : '',
      historialDevoluciones: c.historialDevoluciones || '',
      cargosRecurrentes: c.cargosRecurrentes || '',
      penalizacionesExtravio: c.penalizacionesExtravio || '',
      estadoCuenta: c.estadoCuenta || '',
      ubicaciones: c.ubicaciones || '',
      notas: c.notas || '',
    })
    setDialogOpen(true)
  }

  async function saveCliente() {
    try {
      const url = editId ? `/api/clientes/${editId}` : '/api/clientes'
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
        title: editId ? 'Cliente actualizado' : 'Cliente creado',
        description: form.nombre,
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

  async function removeCliente(c: Cliente) {
    if (!confirm(`¿Eliminar el cliente ${c.nombre}?`)) return
    try {
      const res = await fetch(`/api/clientes/${c.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast({ title: 'Cliente eliminado', description: c.nombre })
      load()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  const ESTADO_CUENTA_COLORS: Record<string, string> = {
    AL_DIA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDIENTE: 'bg-amber-100 text-amber-700 border-amber-200',
    MOROSO: 'bg-red-100 text-red-700 border-red-200',
  }

  const ESTADO_CUENTA_LABELS: Record<string, string> = {
    AL_DIA: 'Al día',
    PENDIENTE: 'Pendiente',
    MOROSO: 'Moroso',
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs flex items-center gap-1">
                <Search className="w-3 h-3" /> Nombre o razón social
              </Label>
              <Input
                placeholder="Buscar cliente..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
            </div>
            <div className="min-w-[180px]">
              <Label className="text-xs">Tipología</Label>
              <Select value={filtroTipologia} onValueChange={setFiltroTipologia}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tipologías</SelectItem>
                  {TIPOLOGIAS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 ml-auto"
            >
              <Plus className="w-4 h-4 mr-1" /> Nuevo Cliente
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
                Base de Clientes
              </CardTitle>
              <CardDescription>
                {loading
                  ? 'Cargando...'
                  : `${clientes.length} cliente(s) encontrado(s)`}
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
          ) : clientes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No se encontraron clientes
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-48">Razón Social</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead>Tipología</TableHead>
                    <TableHead className="text-center">Cilindros</TableHead>
                    <TableHead>Gases</TableHead>
                    <TableHead className="text-center">Stock Crítico</TableHead>
                    <TableHead>Estado Cuenta</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {c.nombre}
                            </div>
                            {c.contacto && (
                              <div className="text-xs text-slate-500">
                                <Contact className="w-3 h-3 inline mr-1" />
                                {c.contacto}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {c.taxId || '—'}
                      </TableCell>
                      <TableCell>
                        {c.tipologia ? (
                          <Badge variant="outline" className="text-xs bg-slate-50">
                            {c.tipologia}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold tabular-nums">
                          {c._count?.cylinders || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[180px] truncate">
                        {c.gasesConsumo || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.nivelesStockCritico != null ? (
                          <span className="font-medium tabular-nums">
                            {c.nivelesStockCritico}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {c.estadoCuenta ? (
                          <Badge
                            className={`text-xs border ${ESTADO_CUENTA_COLORS[c.estadoCuenta] || 'bg-slate-100 text-slate-600'}`}
                          >
                            {ESTADO_CUENTA_LABELS[c.estadoCuenta] || c.estadoCuenta}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-600"
                            onClick={() => { setViewCylindersCliente(c); loadCylindersForCliente(c.id) }}
                            title="Ver tubos del cliente">
                            <Package className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600"
                            onClick={() => { setViewHistoryCliente(c); loadHistoryForCliente(c.id) }}
                            title="Historial de uso por gas/mes">
                            <History className="w-4 h-4" />
                          </Button>
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
                            onClick={() => removeCliente(c)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de creación/edición */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? `Modificando ${form.nombre}`
                : 'Complete el perfil técnico y comercial del cliente'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* IDENTIFICACIÓN */}
            <div className="col-span-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <Building2 className="w-4 h-4" /> Identificación y Contacto
              </h3>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Nombre / Razón Social *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Razón social del cliente"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs flex items-center gap-1">
                <Hash className="w-3 h-3" /> Tax ID / CUIT
              </Label>
              <Input
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="30-12345678-9"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs flex items-center gap-1">
                <Contact className="w-3 h-3" /> Persona de Contacto
              </Label>
              <Input
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                placeholder="Nombre del contacto / receptor autorizado"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Firma Digital del Receptor</Label>
              <Input
                value={form.firmaDigital}
                onChange={(e) => setForm({ ...form, firmaDigital: e.target.value })}
                placeholder="Registro digital de aceptación"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Ubicaciones de Entrega</Label>
              <Input
                value={form.ubicaciones}
                onChange={(e) => setForm({ ...form, ubicaciones: e.target.value })}
                placeholder="Direcciones o coordenadas de plantas, tiendas o puntos de entrega"
              />
            </div>

            {/* PERFIL TÉCNICO */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <FlaskConical className="w-4 h-4" /> Perfil Técnico (Segmentación)
              </h3>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Tipología de Cliente</Label>
              <Select
                value={form.tipologia}
                onValueChange={(v) => setForm({ ...form, tipologia: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipología" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOLOGIAS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Procesos de Soldadura</Label>
              <Input
                value={form.procesoSoldadura}
                onChange={(e) => setForm({ ...form, procesoSoldadura: e.target.value })}
                placeholder="TIG, MIG/MAG, Oxicorte, Electrodo"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Materiales Base</Label>
              <Input
                value={form.materialesBase}
                onChange={(e) => setForm({ ...form, materialesBase: e.target.value })}
                placeholder="Acero, inoxidable, aluminio + espesores"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Parámetros de Ingeniería</Label>
              <Input
                value={form.parametrosIngenieria}
                onChange={(e) => setForm({ ...form, parametrosIngenieria: e.target.value })}
                placeholder="Homologaciones WPS críticas"
              />
            </div>

            {/* LOGÍSTICA Y SUMINISTRO */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <Truck className="w-4 h-4" /> Logística y Suministro
              </h3>
            </div>
            <div>
              <Label className="text-xs">Modo de Envasado</Label>
              <Select
                value={form.modoEnvasado}
                onValueChange={(v) => setForm({ ...form, modoEnvasado: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cilindros">Cilindros individuales</SelectItem>
                  <SelectItem value="Bloques">Bloques</SelectItem>
                  <SelectItem value="Microgranel">Microgranel</SelectItem>
                  <SelectItem value="Granel">Granel líquido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nivel de Stock Crítico</Label>
              <Input
                type="number"
                min="0"
                value={form.nivelesStockCritico}
                onChange={(e) => setForm({ ...form, nivelesStockCritico: e.target.value })}
                placeholder="Cantidad mínima para alerta"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Gases de Consumo</Label>
              <Input
                value={form.gasesConsumo}
                onChange={(e) => setForm({ ...form, gasesConsumo: e.target.value })}
                placeholder="AR, MIX-7525, CO2, O2, C2H2..."
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Servicios Especializados</Label>
              <Input
                value={form.serviciosEspecializados}
                onChange={(e) => setForm({ ...form, serviciosEspecializados: e.target.value })}
                placeholder="CryoEase®, Maxx®, Integra®"
              />
            </div>

            {/* COMODATOS */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <FileText className="w-4 h-4" /> Gestión de Comodatos
              </h3>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">N° Contrato de Comodato</Label>
              <Input
                value={form.contratoComodato}
                onChange={(e) => setForm({ ...form, contratoComodato: e.target.value })}
                placeholder="Número de contrato"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Vencimiento de Contrato</Label>
              <Input
                type="date"
                value={form.fechaVencimientoContrato}
                onChange={(e) => setForm({ ...form, fechaVencimientoContrato: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Activos en Posesión</Label>
              <Input
                value={form.activosEnPosesion}
                onChange={(e) => setForm({ ...form, activosEnPosesion: e.target.value })}
                placeholder="Números de serie o IDs de cilindros en poder del cliente"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Historial de Devoluciones</Label>
              <Input
                value={form.historialDevoluciones}
                onChange={(e) => setForm({ ...form, historialDevoluciones: e.target.value })}
                placeholder="Registro de activos devueltos"
              />
            </div>

            {/* CONTROL FINANCIERO */}
            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-1 mb-3">
                <DollarSign className="w-4 h-4" /> Control Financiero
              </h3>
            </div>
            <div>
              <Label className="text-xs">Estado de Cuenta</Label>
              <Select
                value={form.estadoCuenta}
                onValueChange={(v) => setForm({ ...form, estadoCuenta: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AL_DIA">Al día</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="MOROSO">Moroso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Penalizaciones por Extravío</Label>
              <Input
                value={form.penalizacionesExtravio}
                onChange={(e) => setForm({ ...form, penalizacionesExtravio: e.target.value })}
                placeholder="Cargos por cilindros no devueltos"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Cargos Recurrentes</Label>
              <Input
                value={form.cargosRecurrentes}
                onChange={(e) => setForm({ ...form, cargosRecurrentes: e.target.value })}
                placeholder="Facturación automática por alquiler o mantenimiento"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notas / Observaciones</Label>
              <Input
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Información adicional del cliente"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={saveCliente}
              disabled={!form.nombre.trim()}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tubos del cliente */}
      <Dialog open={!!viewCylindersCliente} onOpenChange={(o) => { if (!o) setViewCylindersCliente(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-600" />
              Tubos de {viewCylindersCliente?.nombre}
            </DialogTitle>
          </DialogHeader>
          {loadingCylinders ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : cylindersForCliente.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              Este cliente no tiene tubos asignados
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Serie</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>PH</TableHead>
                    <TableHead>Ubicación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cylindersForCliente.map((cyl) => (
                    <TableRow key={cyl.id}>
                      <TableCell className="font-mono text-xs font-semibold">{cyl.numeroSerie}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cyl.gas.colorHex }} />
                          <span className="text-sm">{cyl.gas.nombre}</span>
                          <SgaBadge peligro={cyl.gas.peligro} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${ESTADO_COLORS[cyl.estado] || 'bg-slate-100 text-slate-700'}`}>
                          {ESTADO_LABELS[cyl.estado] || cyl.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{cyl.capacidadLitros}L</TableCell>
                      <TableCell>
                        {(() => {
                          const d = daysUntil(cyl.fechaProximoRetest)
                          if (d < 0) return <Badge variant="destructive" className="text-[10px]">Vencida</Badge>
                          if (d <= 60) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">{d}d</Badge>
                          return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{formatDate(cyl.fechaProximoRetest)}</Badge>
                        })()}
                      </TableCell>
                      <TableCell className="text-xs">{cyl.ubicacionNombre}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial de uso por gas/mes */}
      <Dialog open={!!viewHistoryCliente} onOpenChange={(o) => { if (!o) setViewHistoryCliente(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" />
              Historial de uso — {viewHistoryCliente?.nombre}
            </DialogTitle>
            <DialogDescription>Movimientos de tubos agrupados por gas, mes y año</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              Sin movimientos registrados
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gas</TableHead>
                    <TableHead className="text-center">Mes / Año</TableHead>
                    <TableHead className="text-right">Movimientos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-2"><span className="text-sm font-medium">{h.gas}</span></div></TableCell>
                      <TableCell className="text-center font-mono text-sm">{h.mes}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono tabular-nums">{h.cantidad}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
// ============================================================
function LaboratorioTab() {
  return (
    <Tabs defaultValue="costo-km" className="w-full">
      <TabsList className="mb-6 h-auto">
        <TabsTrigger value="costo-km" className="flex items-center gap-2 py-2">
          <Truck className="w-4 h-4" /> Costo x KM
        </TabsTrigger>
        <TabsTrigger value="trazabilidad" className="flex items-center gap-2 py-2">
          <History className="w-4 h-4" /> Trazabilidad
        </TabsTrigger>
      </TabsList>

      <TabsContent value="costo-km">
        <CostoKmCalculator />
      </TabsContent>
      <TabsContent value="trazabilidad">
        <TrazabilidadPanel />
      </TabsContent>
    </Tabs>
  )
}

// ============================================================
// 7a. CALCULADORA COSTO POR KILÓMETRO
// ============================================================
function CostoKmCalculator() {
  const [kmMensuales, setKmMensuales] = useState(10000)
  const [factorRetorno, setFactorRetorno] = useState(1)

  // Costos Variables
  const [precioLitro, setPrecioLitro] = useState(1.00)
  const [rendimiento, setRendimiento] = useState(4)
  const [precioNeumatico, setPrecioNeumatico] = useState(400)
  const [cantNeumaticos, setCantNeumaticos] = useState(6)
  const [vidaNeumaticos, setVidaNeumaticos] = useState(80000)
  const [costoMantenimiento, setCostoMantenimiento] = useState(0.05)
  const [costoLubricantes, setCostoLubricantes] = useState(150)
  const [intervaloLubricantes, setIntervaloLubricantes] = useState(10000)

  // Costos Fijos
  const [sueldoBruto, setSueldoBruto] = useState(2000)
  const [cargasSociales, setCargasSociales] = useState(800)
  const [polizaSeguro, setPolizaSeguro] = useState(500)
  const [valorCompra, setValorCompra] = useState(80000)
  const [valorReventa, setValorReventa] = useState(20000)
  const [mesesVida, setMesesVida] = useState(120)
  const [impuestosAnuales, setImpuestosAnuales] = useState(1200)
  const [gastosOficina, setGastosOficina] = useState(3000)
  const [cantVehiculos, setCantVehiculos] = useState(5)
  const [valorVehiculo, setValorVehiculo] = useState(80000)
  const [tasaInteres, setTasaInteres] = useState(0.5)

  const calc = useMemo(() => {
    const km = kmMensuales || 1
    // Costos Variables
    const combustible = precioLitro / (rendimiento || 1)
    const neumaticos = (precioNeumatico * cantNeumaticos) / (vidaNeumaticos || 1)
    const mantenimiento = costoMantenimiento
    const lubricantes = costoLubricantes / (intervaloLubricantes || 1)
    const totalVariables = combustible + neumaticos + mantenimiento + lubricantes

    // Costos Fijos (mensuales)
    const salarios = sueldoBruto + cargasSociales
    const seguro = polizaSeguro
    const depreciacion = (valorCompra - valorReventa) / (mesesVida || 1)
    const impuestos = impuestosAnuales / 12
    const administrativos = gastosOficina / (cantVehiculos || 1)
    const financieros = (valorVehiculo * (tasaInteres / 100)) / (km || 1)
    const totalFijosMensuales = salarios + seguro + depreciacion + impuestos + administrativos

    // CPK
    const cpkBase = totalVariables + (totalFijosMensuales / km)
    const cpkAjustado = cpkBase * factorRetorno

    return {
      combustible,
      neumaticos,
      mantenimiento,
      lubricantes,
      totalVariables,
      salarios: salarios / km,
      seguro: seguro / km,
      depreciacion: depreciacion / km,
      impuestos: impuestos / km,
      administrativos: administrativos / km,
      financieros,
      totalFijos: totalFijosMensuales / km,
      cpkBase,
      cpkAjustado,
    }
  }, [
    kmMensuales, factorRetorno,
    precioLitro, rendimiento, precioNeumatico, cantNeumaticos,
    vidaNeumaticos, costoMantenimiento, costoLubricantes, intervaloLubricantes,
    sueldoBruto, cargasSociales, polizaSeguro, valorCompra, valorReventa,
    mesesVida, impuestosAnuales, gastosOficina, cantVehiculos,
    valorVehiculo, tasaInteres,
  ])

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Beaker className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold">Calculadora de Costo por Kilómetro</h2>
          </div>
          <p className="text-sm text-slate-300">
            Ingrese los datos del vehículo y operación para calcular el CPK (Costo por Kilómetro)
            real, desglosado en costos variables, fijos y financieros.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: formulario */}
        <div className="lg:col-span-2 space-y-4">
          {/* Parámetros Generales */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Parámetros Generales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Kilómetros recorridos al mes</Label>
                  <Input
                    type="number"
                    min="1"
                    value={kmMensuales}
                    onChange={(e) => setKmMensuales(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Factor de Retorno Vacío</Label>
                  <Select value={String(factorRetorno)} onValueChange={(v) => setFactorRetorno(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Sin retorno vacío (1x)</SelectItem>
                      <SelectItem value="1.25">25% retorno vacío (1.25x)</SelectItem>
                      <SelectItem value="1.5">50% retorno vacío (1.5x)</SelectItem>
                      <SelectItem value="2">100% retorno vacío (2x)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1">
                    Si el camión vuelve sin carga, el CPK se multiplica.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costos Variables */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Costos Variables
              </CardTitle>
              <CardDescription>Dependen de los kilómetros recorridos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Combustible — Precio del litro ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioLitro}
                    onChange={(e) => setPrecioLitro(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Combustible — Rendimiento (km/l)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={rendimiento}
                    onChange={(e) => setRendimiento(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Neumáticos — Precio unitario ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={precioNeumatico}
                    onChange={(e) => setPrecioNeumatico(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Neumáticos — Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={cantNeumaticos}
                    onChange={(e) => setCantNeumaticos(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Neumáticos — Vida útil (km)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={vidaNeumaticos}
                    onChange={(e) => setVidaNeumaticos(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Mantenimiento ($/km o % comb.)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={costoMantenimiento}
                    onChange={(e) => setCostoMantenimiento(Number(e.target.value))}
                  />
                  <p className="text-xs text-slate-400 mt-1">$/km o % del combustible</p>
                </div>
                <div>
                  <Label className="text-xs">Lubricantes — Costo entre cambios ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={costoLubricantes}
                    onChange={(e) => setCostoLubricantes(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Lubricantes — Intervalo (km)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={intervaloLubricantes}
                    onChange={(e) => setIntervaloLubricantes(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costos Fijos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Costos Fijos
              </CardTitle>
              <CardDescription>No dependen de los km, se prorratean mensualmente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Salarios — Sueldo bruto mensual ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={sueldoBruto}
                    onChange={(e) => setSueldoBruto(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Salarios — Cargas sociales ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={cargasSociales}
                    onChange={(e) => setCargasSociales(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Seguros — Póliza mensual ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={polizaSeguro}
                    onChange={(e) => setPolizaSeguro(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Depreciación — Valor de compra ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={valorCompra}
                    onChange={(e) => setValorCompra(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Depreciación — Valor de reventa ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={valorReventa}
                    onChange={(e) => setValorReventa(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Depreciación — Vida útil (meses)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={mesesVida}
                    onChange={(e) => setMesesVida(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Impuestos anuales ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={impuestosAnuales}
                    onChange={(e) => setImpuestosAnuales(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Gastos administrativos mensuales ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={gastosOficina}
                    onChange={(e) => setGastosOficina(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cantidad de vehículos en flota</Label>
                  <Input
                    type="number"
                    min="1"
                    value={cantVehiculos}
                    onChange={(e) => setCantVehiculos(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costos Financieros */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Costos Financieros
              </CardTitle>
              <CardDescription>Si el vehículo se compró con crédito o costo de oportunidad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Valor del vehículo ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={valorVehiculo}
                    onChange={(e) => setValorVehiculo(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tasa de interés mensual (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tasaInteres}
                    onChange={(e) => setTasaInteres(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: resultados */}
        <div className="space-y-4">
          {/* Resultado principal */}
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gauge className="w-5 h-5" /> CPK Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-1 tabular-nums">
                ${calc.cpkAjustado.toFixed(4)}
              </div>
              <p className="text-emerald-100 text-sm">por kilómetro recorrido</p>
              {factorRetorno > 1 && (
                <div className="mt-2 text-xs text-emerald-200">
                  CPK base: ${calc.cpkBase.toFixed(4)} × {factorRetorno}x (retorno vacío)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Desglose Variables */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Costos Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ResultRow label="Combustible" value={calc.combustible} />
              <ResultRow label="Neumáticos" value={calc.neumaticos} />
              <ResultRow label="Mantenimiento" value={calc.mantenimiento} />
              <ResultRow label="Lubricantes" value={calc.lubricantes} />
              <div className="border-t pt-2 mt-2">
                <ResultRow label="Total Variables" value={calc.totalVariables} bold />
              </div>
            </CardContent>
          </Card>

          {/* Desglose Fijos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Costos Fijos (por km)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ResultRow label="Salarios" value={calc.salarios} />
              <ResultRow label="Seguros" value={calc.seguro} />
              <ResultRow label="Depreciación" value={calc.depreciacion} />
              <ResultRow label="Impuestos" value={calc.impuestos} />
              <ResultRow label="Administrativos" value={calc.administrativos} />
              <ResultRow label="Financieros" value={calc.financieros} />
              <div className="border-t pt-2 mt-2">
                <ResultRow label="Total Fijos" value={calc.totalFijos} bold />
              </div>
            </CardContent>
          </Card>

          {/* Costos mensuales totales */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Costos mensuales totales:</p>
                <p>Variables: ${(calc.totalVariables * kmMensuales).toFixed(2)}</p>
                <p>Fijos: ${((calc.totalFijos * kmMensuales)).toFixed(2)}</p>
                <p className="font-bold text-sm mt-1">
                  Total: ${((calc.totalVariables * kmMensuales) + (calc.totalFijos * kmMensuales)).toFixed(2)}/mes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Referencia rápida */}
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 mb-1">Fórmulas aplicadas:</p>
                <p><b>Combustible:</b> PrecioLitro / Rendimiento</p>
                <p><b>Neumáticos:</b> (Precio × Cant) / VidaKm</p>
                <p><b>Salarios:</b> (Bruto + Cargas) / Km</p>
                <p><b>Depreciación:</b> (Compra − Reventa) / Meses / Km</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ResultRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? 'font-bold' : 'text-sm'}`}>
      <span className="text-slate-600">{label}</span>
      <span className={`tabular-nums ${bold ? 'text-slate-900' : 'text-slate-700'}`}>
        ${value.toFixed(4)}
      </span>
    </div>
  )
}

// ============================================================
// 7b. TRAZABILIDAD DE ACTIVOS
// ============================================================
interface Movimiento {
  id: string
  cylinderId: string
  fecha: string
  tipo: string
  descripcion: string
  usuario: string | null
  ubicacion: string | null
  latOrigen: number | null
  lngOrigen: number | null
  latDestino: number | null
  lngDestino: number | null
}

interface CylinderConMovimientos extends Cylinder {
  movimientos: Movimiento[]
}

interface CylinderSimple {
  id: string
  numeroSerie: string
  estado: string
  gas: Gas
  ubicacionNombre: string
  cliente: string | null
  fechaProximoRetest: string
}

function TrazabilidadPanel() {
  const [cargando, setCargando] = useState(true)
  const [todosLosCilindros, setTodosLosCilindros] = useState<CylinderSimple[]>([])
  const [todosLosMovimientos, setTodosLosMovimientos] = useState<Movimiento[]>([])

  // Buscador
  const [busqueda, setBusqueda] = useState('')
  const [cilindroSeleccionado, setCilindroSeleccionado] = useState<CylinderConMovimientos | null>(null)
  const [buscando, setBuscando] = useState(false)

  // Filtros del log
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')

  // Cargar datos iniciales
  useEffect(() => {
    async function load() {
      try {
        const [cylRes, statsRes] = await Promise.all([
          fetch('/api/cylinders'),
          fetch('/api/stats'),
        ])
        const cylinders: CylinderSimple[] = await cylRes.json()
        setTodosLosCilindros(Array.isArray(cylinders) ? cylinders : [])
      } finally {
        setCargando(false)
      }
    }
    load()
  }, [])

  // Buscar cilindro por serie
  async function buscarCilindro() {
    if (!busqueda.trim() || !Array.isArray(todosLosCilindros)) return
    setBuscando(true)
    setCilindroSeleccionado(null)
    try {
      const encontrado = todosLosCilindros.find((c) =>
        c.numeroSerie.toLowerCase().includes(busqueda.trim().toLowerCase())
      )
      if (!encontrado) {
        setCilindroSeleccionado(null)
        setBuscando(false)
        return
      }
      const res = await fetch(`/api/cylinders/${encontrado.id}`)
      if (res.ok) {
        const data: CylinderConMovimientos = await res.json()
        setCilindroSeleccionado(data)
        setTodosLosMovimientos(data.movimientos || [])
      }
    } finally {
      setBuscando(false)
    }
  }

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalTubos = todosLosCilindros.length
    const phProximas = todosLosCilindros.filter((c) => {
      if (!c.fechaProximoRetest) return false
      const dias = daysUntil(c.fechaProximoRetest)
      return dias >= 0 && dias <= 90
    }).length
    const phVencidas = todosLosCilindros.filter((c) => {
      if (!c.fechaProximoRetest) return false
      return daysUntil(c.fechaProximoRetest) < 0
    }).length
    return { totalTubos, phProximas, phVencidas, totalMovs: todosLosMovimientos.length }
  }, [todosLosCilindros, todosLosMovimientos])

  // Filtrar movimientos para el log
  const movimientosFiltrados = useMemo(() => {
    let list = todosLosMovimientos
    if (filtroTipo !== 'all') {
      list = list.filter((m) => m.tipo === filtroTipo)
    }
    if (filtroBusqueda.trim()) {
      const q = filtroBusqueda.toLowerCase()
      list = list.filter(
        (m) =>
          m.descripcion.toLowerCase().includes(q) ||
          (m.ubicacion && m.ubicacion.toLowerCase().includes(q)) ||
          (m.usuario && m.usuario.toLowerCase().includes(q))
      )
    }
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [todosLosMovimientos, filtroTipo, filtroBusqueda])

  const TIPOS_MOVIMIENTO = ['ALTA', 'CARGA', 'DESCARGA', 'TRASLADO', 'INSPECCION', 'REPARACION', 'BAJA']

  const TIPO_COLORS: Record<string, string> = {
    ALTA: 'bg-emerald-100 text-emerald-700',
    CARGA: 'bg-blue-100 text-blue-700',
    DESCARGA: 'bg-amber-100 text-amber-700',
    TRASLADO: 'bg-purple-100 text-purple-700',
    INSPECCION: 'bg-cyan-100 text-cyan-700',
    REPARACION: 'bg-red-100 text-red-700',
    BAJA: 'bg-slate-100 text-slate-700',
  }

  const TIPO_ICONOS: Record<string, string> = {
    ALTA: '🟢',
    CARGA: '🔵',
    DESCARGA: '🟡',
    TRASLADO: '🟣',
    INSPECCION: '🔷',
    REPARACION: '🔴',
    BAJA: '⚫',
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold">Trazabilidad de Activos</h2>
          </div>
          <p className="text-sm text-slate-300">
            Histórico de movimientos, control de vida útil y alertas de prueba hidráulica (PH)
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<History className="w-5 h-5" />}
          label="Eventos Registrados"
          value={String(kpis.totalMovs)}
          accent="from-orange-500 to-red-600"
        />
        <KpiCard
          icon={<Package className="w-5 h-5" />}
          label="Total de Tubos"
          value={String(kpis.totalTubos)}
          accent="from-emerald-500 to-teal-600"
        />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="PH por Vencer"
          value={`${kpis.phProximas} tubos`}
          accent="from-amber-500 to-yellow-600"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label="PH Vencidas"
          value={`${kpis.phVencidas} tubos`}
          accent="from-red-500 to-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Buscador + Timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="w-4 h-4" /> Buscar Cilindro
              </CardTitle>
              <CardDescription>Buscar por número de serie</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: SN-2024-0001"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarCilindro()}
                />
                <Button size="sm" onClick={buscarCilindro} disabled={buscando}>
                  {buscando ? '...' : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline del cilindro seleccionado */}
          {cilindroSeleccionado && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" /> Timeline:
                  <span className="font-mono">{cilindroSeleccionado.numeroSerie}</span>
                </CardTitle>
                <CardDescription>
                  {cilindroSeleccionado.gas.nombre} · {cilindroSeleccionado.ubicacionNombre} ·{' '}
                  <Badge className={`${ESTADO_COLORS[cilindroSeleccionado.estado]} text-white text-xs`}>
                    {ESTADO_LABELS[cilindroSeleccionado.estado]}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(!cilindroSeleccionado.movimientos || cilindroSeleccionado.movimientos.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    Sin movimientos registrados
                  </div>
                ) : (
                  <div className="space-y-0">
                    {cilindroSeleccionado.movimientos
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map((m, idx) => (
                        <div key={m.id} className="flex gap-3 pb-3 last:pb-0">
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mt-1.5" />
                            {idx < cilindroSeleccionado.movimientos.length - 1 && (
                              <div className="w-px flex-1 bg-slate-200" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${TIPO_COLORS[m.tipo] || 'bg-slate-100'}`}>
                                {TIPO_ICONOS[m.tipo] || '•'} {m.tipo}
                              </Badge>
                              <span className="text-xs text-slate-400 tabular-nums">
                                {formatDate(m.fecha)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 mt-0.5">{m.descripcion}</p>
                            {m.ubicacion && (
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> {m.ubicacion}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Si no se encontró */}
          {busqueda && !cilindroSeleccionado && !buscando && (
            <Card>
              <CardContent className="p-6 text-center text-slate-400">
                <p>No se encontró un cilindro con ese número de serie</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna derecha: Log de movimientos + Alertas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Log de movimientos */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" /> Registro de Eventos
                  </CardTitle>
                  <CardDescription>
                    {movimientosFiltrados.length} movimiento(s)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={buscarCilindro}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="min-w-[140px]">
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {TIPOS_MOVIMIENTO.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Input
                    placeholder="Buscar en descripción, ubicación o usuario..."
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {movimientosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2" />
                  {todosLosMovimientos.length === 0
                    ? 'Seleccione un cilindro para ver sus movimientos'
                    : 'No hay movimientos con los filtros aplicados'}
                </div>
              ) : (
                <ScrollArea className="h-[350px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-24">Fecha</TableHead>
                        <TableHead className="w-24">Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Usuario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientosFiltrados.map((m) => (
                        <TableRow key={m.id} className="hover:bg-slate-50">
                          <TableCell className="text-xs tabular-nums text-slate-500">
                            {formatDate(m.fecha)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${TIPO_COLORS[m.tipo] || 'bg-slate-100 text-slate-600'}`}>
                              {m.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate">
                            {m.descripcion}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {m.ubicacion || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {m.usuario || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Alertas de Prueba Hidráulica */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Estado de Pruebas Hidráulicas (PH)
              </CardTitle>
              <CardDescription>
                Control de vencimientos según normativa (renovación cada 5 años)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                    {todosLosCilindros.filter((c) => {
                      if (!c.fechaProximoRetest) return false
                      return daysUntil(c.fechaProximoRetest) > 90
                    }).length}
                  </div>
                  <div className="text-xs text-emerald-600">PH al día (&gt;90 días)</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700 tabular-nums">
                    {kpis.phProximas}
                  </div>
                  <div className="text-xs text-amber-600">PH próxima (&lt;90 días)</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700 tabular-nums">
                    {kpis.phVencidas}
                  </div>
                  <div className="text-xs text-red-600">PH vencida</div>
                </div>
              </div>

              {/* Lista de tubos en alerta */}
              {kpis.phProximas + kpis.phVencidas > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Tubos que requieren atención:
                  </p>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {todosLosCilindros
                        .filter((c) => {
                          if (!c.fechaProximoRetest) return false
                          return daysUntil(c.fechaProximoRetest) <= 90
                        })
                        .sort((a, b) => {
                          const da = daysUntil(a.fechaProximoRetest)
                          const db = daysUntil(b.fechaProximoRetest)
                          return da - db
                        })
                        .map((c) => {
                          const dias = daysUntil(c.fechaProximoRetest)
                          const vencido = dias < 0
                          return (
                            <div
                              key={c.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full ${vencido ? 'bg-red-500' : 'bg-amber-500'}`} />
                                <span className="font-mono text-sm font-medium">
                                  {c.numeroSerie}
                                </span>
                                <Badge className={`text-xs ${ESTADO_COLORS[c.estado]} text-white`}>
                                  {ESTADO_LABELS[c.estado]}
                                </Badge>
                              </div>
                              <span className={`text-xs font-semibold tabular-nums ${vencido ? 'text-red-600' : 'text-amber-600'}`}>
                                {vencido ? `Vencido (${Math.abs(dias)} días)` : `${dias} días`}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 8. CONFIGURACIÓN DE ALERTAS
// ============================================================
interface AlertConfigData {
  id: string
  gasId: string
  gas: Gas
  diasAlertaRetest: number
  diasMaxCliente: number
  alertaPH: boolean
  activo: boolean
}

function ConfiguracionTab() {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<AlertConfigData[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Record<string, { diasAlertaRetest: string; diasMaxCliente: string; alertaPH: boolean; activo: boolean }>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/config-alertas')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setConfigs(list)
      const ed: Record<string, { diasAlertaRetest: string; diasMaxCliente: string; alertaPH: boolean; activo: boolean }> = {}
      for (const c of list) {
        ed[c.gasId] = {
          diasAlertaRetest: String(c.diasAlertaRetest),
          diasMaxCliente: String(c.diasMaxCliente),
          alertaPH: c.alertaPH,
          activo: c.activo,
        }
      }
      setEditando(ed)
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la configuración', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  async function guardar(config: AlertConfigData) {
    const vals = editando[config.gasId]
    if (!vals) return
    try {
      const res = await fetch('/api/config-alertas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gasId: config.gasId,
          diasAlertaRetest: vals.diasAlertaRetest,
          diasMaxCliente: vals.diasMaxCliente,
          alertaPH: vals.alertaPH,
          activo: vals.activo,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Guardado', description: `Configuración de ${config.gas.nombre} actualizada` })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <Tabs defaultValue="alertas" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="alertas" className="flex items-center gap-1.5">
          <Bell className="w-4 h-4" /><span>Alertas por Gas</span>
        </TabsTrigger>
        <TabsTrigger value="precios" className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4" /><span>Precios de Gases</span>
        </TabsTrigger>
        <TabsTrigger value="empresa" className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4" /><span>Datos de la Empresa</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="alertas">
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-orange-500" />
            Configuración de Alertas por Gas
          </CardTitle>
          <CardDescription>
            Defina los umbrales de alerta para cada tipo de gas. Las alertas se mostrarán en el Dashboard principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gas</TableHead>
                  <TableHead className="text-center">Alertas activas</TableHead>
                  <TableHead className="text-center">Días antes del retest</TableHead>
                  <TableHead className="text-center">Días máx. cliente</TableHead>
                  <TableHead className="text-center">Alerta PH</TableHead>
                  <TableHead className="text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((cfg) => {
                  const vals = editando[cfg.gasId]
                  if (!vals) return null
                  return (
                    <TableRow key={cfg.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: cfg.gas.colorHex }} />
                          <span className="font-medium text-sm">{cfg.gas.nombre}</span>
                          <span className="text-xs text-slate-400">({cfg.gas.codigo})</span>
                          <SgaBadge peligro={cfg.gas.peligro} />
                        </div>
                      </td>
                      <td className="text-center">
                        <Select value={vals.activo ? 'true' : 'false'} onValueChange={(v) => setEditando({ ...editando, [cfg.gasId]: { ...vals, activo: v === 'true' } })}>
                          <SelectTrigger className="w-24 mx-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sí</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="text-center">
                        <Input
                          type="number"
                          className="w-20 text-center mx-auto"
                          value={vals.diasAlertaRetest}
                          onChange={(e) => setEditando({ ...editando, [cfg.gasId]: { ...vals, diasAlertaRetest: e.target.value } })}
                        />
                      </td>
                      <td className="text-center">
                        <Input
                          type="number"
                          className="w-20 text-center mx-auto"
                          value={vals.diasMaxCliente}
                          onChange={(e) => setEditando({ ...editando, [cfg.gasId]: { ...vals, diasMaxCliente: e.target.value } })}
                        />
                      </td>
                      <td className="text-center">
                        <Select value={vals.alertaPH ? 'true' : 'false'} onValueChange={(v) => setEditando({ ...editando, [cfg.gasId]: { ...vals, alertaPH: v === 'true' } })}>
                          <SelectTrigger className="w-24 mx-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sí</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="text-center">
                        <Button size="sm" onClick={() => guardar(cfg)} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
                          <Save className="w-3 h-3 mr-1" /> Guardar
                        </Button>
                      </td>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Vista previa de alertas actuales
          </CardTitle>
          <CardDescription>
            Resumen de alertas activas según la configuración actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No hay configuraciones</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {configs.filter((c) => c.activo).map((cfg) => (
                <div key={cfg.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                  <span className="w-3 h-3 rounded-full" style={{ background: cfg.gas.colorHex }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{cfg.gas.nombre}</span>
                      <SgaBadge peligro={cfg.gas.peligro} />
                    </div>
                    <div className="text-xs text-slate-500">
                      Alerta retest: {cfg.diasAlertaRetest}d · Cliente máx: {cfg.diasMaxCliente}d
                    </div>
                  </div>
                  <Badge className={cfg.alertaPH ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                    PH {cfg.alertaPH ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </TabsContent>

      <TabsContent value="precios">
        <GasPricingForm />
      </TabsContent>

      <TabsContent value="empresa">
        <ConfigEmpresaForm />
      </TabsContent>
    </Tabs>
  )
}

function GasPricingForm() {
  const { toast } = useToast()
  const [gases, setGases] = useState<Gas[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Record<string, { diario: string; mensual: string; venta: string }>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/gases')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setGases(list)
      const ed: Record<string, { diario: string; mensual: string; venta: string }> = {}
      for (const g of list) {
        ed[g.id] = {
          diario: g.precioAlquilerDiario?.toString() || '',
          mensual: g.precioAlquilerMensual?.toString() || '',
          venta: g.precioVenta?.toString() || '',
        }
      }
      setEditando(ed)
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los gases', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  async function guardar(gasId: string) {
    const vals = editando[gasId]
    if (!vals) return
    try {
      const res = await fetch(`/api/gases/${gasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precioAlquilerDiario: vals.diario,
          precioAlquilerMensual: vals.mensual,
          precioVenta: vals.venta,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Guardado', description: 'Precios actualizados correctamente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar los precios', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            Precios de Alquiler y Venta de Gases
          </CardTitle>
          <CardDescription>
            Configure las tarifas de alquiler diario, mensual y precio de venta de gas para cada tipo.
            Estos precios se usan al calcular automáticamente los conceptos de una factura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gas</TableHead>
                  <TableHead className="text-right">Alquiler diario ($)</TableHead>
                  <TableHead className="text-right">Alquiler mensual ($)</TableHead>
                  <TableHead className="text-right">Precio venta gas ($)</TableHead>
                  <TableHead className="text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {gases.map((g) => {
                  const vals = editando[g.id]
                  if (!vals) return null
                  return (
                    <TableRow key={g.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: g.colorHex }} />
                          <span className="font-medium text-sm">{g.nombre}</span>
                          <span className="text-xs text-slate-400">({g.codigo})</span>
                        </div>
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 text-right ml-auto"
                          value={vals.diario}
                          onChange={(e) => setEditando({ ...editando, [g.id]: { ...vals, diario: e.target.value } })}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 text-right ml-auto"
                          value={vals.mensual}
                          onChange={(e) => setEditando({ ...editando, [g.id]: { ...vals, mensual: e.target.value } })}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 text-right ml-auto"
                          value={vals.venta}
                          onChange={(e) => setEditando({ ...editando, [g.id]: { ...vals, venta: e.target.value } })}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="text-center">
                        <Button size="sm" onClick={() => guardar(g.id)} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
                          <Save className="w-3 h-3 mr-1" /> Guardar
                        </Button>
                      </td>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ConfigEmpresaForm() {
  const { toast } = useToast()
  const [form, setForm] = useState({
    company: { name: '', tagline: '', country: '', locale: '' },
    base: { name: '', province: '', lat: '', lng: '', tipo: '', address: '', phone: '' },
    map: { defaultCenterLat: '', defaultCenterLng: '', defaultZoom: '' },
    meta: { title: '', description: '', keywords: '', author: '' },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/config-empresa')
        const data = await res.json()
        setForm({
          company: { name: data.company?.name || '', tagline: data.company?.tagline || '', country: data.company?.country || '', locale: data.company?.locale || '' },
          base: { name: data.base?.name || '', province: data.base?.province || '', lat: String(data.base?.lat ?? ''), lng: String(data.base?.lng ?? ''), tipo: data.base?.tipo || '', address: data.base?.address || '', phone: data.base?.phone || '' },
          map: { defaultCenterLat: String(data.map?.defaultCenter?.[0] ?? ''), defaultCenterLng: String(data.map?.defaultCenter?.[1] ?? ''), defaultZoom: String(data.map?.defaultZoom ?? '') },
          meta: { title: data.meta?.title || '', description: data.meta?.description || '', keywords: Array.isArray(data.meta?.keywords) ? data.meta.keywords.join(', ') : (data.meta?.keywords || ''), author: data.meta?.author || '' },
        })
      } catch { /* use defaults */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    try {
      const body = {
        company: form.company,
        base: { ...form.base, lat: parseFloat(form.base.lat) || 0, lng: parseFloat(form.base.lng) || 0 },
        map: { defaultCenter: [parseFloat(form.map.defaultCenterLat) || 0, parseFloat(form.map.defaultCenterLng) || 0], defaultZoom: parseInt(form.map.defaultZoom) || 6 },
        meta: { ...form.meta, keywords: form.meta.keywords.split(',').map(s => s.trim()).filter(Boolean) },
      }
      const res = await fetch('/api/config-empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Configuración guardada', description: 'Los datos de la empresa se actualizaron correctamente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' })
    }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-500" />
            Datos de la Empresa
          </CardTitle>
          <CardDescription>Información corporativa que se muestra en la aplicación. Los cambios se guardan en <code>config.json</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Compañía</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Nombre</Label><Input value={form.company.name} onChange={e => setForm(f => ({ ...f, company: { ...f.company, name: e.target.value } }))} /></div>
              <div><Label>Tagline / Lema</Label><Input value={form.company.tagline} onChange={e => setForm(f => ({ ...f, company: { ...f.company, tagline: e.target.value } }))} /></div>
              <div><Label>País</Label><Input value={form.company.country} onChange={e => setForm(f => ({ ...f, company: { ...f.company, country: e.target.value } }))} /></div>
              <div><Label>Locale</Label><Input value={form.company.locale} onChange={e => setForm(f => ({ ...f, company: { ...f.company, locale: e.target.value } }))} /></div>
            </div>
          </div>

          {/* Base */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Base Operativa</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Nombre</Label><Input value={form.base.name} onChange={e => setForm(f => ({ ...f, base: { ...f.base, name: e.target.value } }))} /></div>
              <div><Label>Provincia</Label><Input value={form.base.province} onChange={e => setForm(f => ({ ...f, base: { ...f.base, province: e.target.value } }))} /></div>
              <div><Label>Tipo</Label><Input value={form.base.tipo} onChange={e => setForm(f => ({ ...f, base: { ...f.base, tipo: e.target.value } }))} /></div>
              <div><Label>Latitud</Label><Input type="number" step="any" value={form.base.lat} onChange={e => setForm(f => ({ ...f, base: { ...f.base, lat: e.target.value } }))} /></div>
              <div><Label>Longitud</Label><Input type="number" step="any" value={form.base.lng} onChange={e => setForm(f => ({ ...f, base: { ...f.base, lng: e.target.value } }))} /></div>
              <div><Label>Teléfono</Label><Input value={form.base.phone} onChange={e => setForm(f => ({ ...f, base: { ...f.base, phone: e.target.value } }))} /></div>
              <div className="sm:col-span-3"><Label>Dirección</Label><Input value={form.base.address} onChange={e => setForm(f => ({ ...f, base: { ...f.base, address: e.target.value } }))} /></div>
            </div>
          </div>

          {/* Map */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><MapIcon className="w-3.5 h-3.5" /> Mapa</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Centro Lat</Label><Input type="number" step="any" value={form.map.defaultCenterLat} onChange={e => setForm(f => ({ ...f, map: { ...f.map, defaultCenterLat: e.target.value } }))} /></div>
              <div><Label>Centro Lng</Label><Input type="number" step="any" value={form.map.defaultCenterLng} onChange={e => setForm(f => ({ ...f, map: { ...f.map, defaultCenterLng: e.target.value } }))} /></div>
              <div><Label>Zoom</Label><Input type="number" value={form.map.defaultZoom} onChange={e => setForm(f => ({ ...f, map: { ...f.map, defaultZoom: e.target.value } }))} /></div>
            </div>
          </div>

          {/* Meta */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Meta / SEO</h4>
            <div className="grid grid-cols-1 gap-3">
              <div><Label>Título</Label><Input value={form.meta.title} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, title: e.target.value } }))} /></div>
              <div><Label>Descripción</Label><Input value={form.meta.description} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, description: e.target.value } }))} /></div>
              <div><Label>Keywords (separadas por coma)</Label><Input value={form.meta.keywords} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, keywords: e.target.value } }))} /></div>
              <div><Label>Autor</Label><Input value={form.meta.author} onChange={e => setForm(f => ({ ...f, meta: { ...f.meta, author: e.target.value } }))} /></div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-orange-500 to-red-600 gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// 9. PEDIDOS
// ============================================================
interface Pedido {
  id: string
  fecha: string
  cliente: string
  clienteId: string | null
  estadoCuenta: string | null
  gasId: string
  gas: Gas
  operacionEnvase: string
  phVigente: boolean | null
  phObservacion: string | null
  total: number
  estado: string
  observaciones: string | null
  items: PedidoItem[]
  cilindros: PedidoCilindro[]
  createdAt: string
}

interface PedidoItem {
  id: string
  concepto: string
  monto: number
}

interface PedidoCilindro {
  id: string
  pedidoId: string
  numeroSerie: string
  gasCodigo: string | null
  verified: boolean
  createdAt: string
}

interface RenglonPedido {
  id: string
  gasId: string
  operacionEnvase: string
  cantidad: number
  phFecha: string
}

interface PedidoCilindroEntry {
  id: string
  numeroSerie: string
  gasCodigo: string
  verified: boolean
}

const PRECIOS_GAS: Record<string, number> = {
  AR: 15000, C2H2: 22000, O2: 12000, CO2: 18000, N2: 10000,
  'MIX-7525': 16000, HE: 28000, 'AR-HE': 24000, H2: 35000,
}

const ESTADOS_PEDIDO = ['PENDIENTE', 'COMPLETADO', 'CANCELADO'] as const

function PedidosTab() {
  const { toast } = useToast()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [clientes, setClientes] = useState<{ id: string; nombre: string; estadoCuenta: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewPedido, setViewPedido] = useState<Pedido | null>(null)
  const [scannerPedidoId, setScannerPedidoId] = useState<string | null>(null)
  const [scannerInput, setScannerInput] = useState('')
  const [scannerCilindros, setScannerCilindros] = useState<PedidoCilindro[]>([])

  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [clienteId, setClienteId] = useState('')
  const [estadoCuenta, setEstadoCuenta] = useState('OK')
  const [observaciones, setObservaciones] = useState('')

  const renglonIdRef = useRef(0)

  const [renglones, setRenglones] = useState<RenglonPedido[]>([
    { id: `r_${++renglonIdRef.current}`, gasId: '', operacionEnvase: 'CANJE', cantidad: 1, phFecha: new Date().toISOString().split('T')[0] },
  ])

  function resetForm() {
    setFecha(new Date().toISOString().split('T')[0])
    setClienteId(''); setEstadoCuenta('OK'); setObservaciones(''); setEditingId(null)
    setRenglones([{ id: `r_${++renglonIdRef.current}`, gasId: '', operacionEnvase: 'CANJE', cantidad: 1, phFecha: new Date().toISOString().split('T')[0] }])
  }

  function openEdit(p: Pedido) {
    setFecha(p.fecha ? p.fecha.split('T')[0] : new Date().toISOString().split('T')[0])
    setClienteId(p.clienteId || '')
    setEstadoCuenta(p.estadoCuenta || 'OK')
    setObservaciones(p.observaciones || '')
    setEditingId(p.id)
    setRenglones(p.items.filter((i) => i.concepto.includes('Carga')).map((i, idx) => {
      const gas = gases.find((g) => i.concepto.startsWith(g.nombre))
      const cantMatch = i.concepto.match(/× (\d+)/)
      return {
        id: `r_${++renglonIdRef.current}`,
        gasId: gas?.id || '',
        operacionEnvase: 'CANJE',
        cantidad: cantMatch ? parseInt(cantMatch[1]) : 1,
        phFecha: new Date().toISOString().split('T')[0],
      }
    }))
    setShowForm(true)
  }

  function agregarRenglon() {
    setRenglones((prev) => [...prev, { id: `r_${++renglonIdRef.current}`, gasId: '', operacionEnvase: 'CANJE', cantidad: 1, phFecha: new Date().toISOString().split('T')[0] }])
  }

  function actualizarRenglon(id: string, campo: keyof RenglonPedido, valor: string | number) {
    setRenglones((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)))
  }

  function eliminarRenglon(id: string) {
    setRenglones((prev) => prev.filter((r) => r.id !== id))
  }

  const clienteSel = clientes.find((c) => c.id === clienteId)

  function phVencida(phFecha: string): boolean | null {
    if (!phFecha) return null
    const d = new Date(phFecha); const hace5 = new Date(); hace5.setFullYear(hace5.getFullYear() - 5)
    return d < hace5
  }

  const totalCalc = useMemo(() => {
    let t = 0
    for (const r of renglones) {
      const gas = gases.find((g) => g.id === r.gasId)
      if (!gas) continue
      t += (PRECIOS_GAS[gas.codigo] || 15000) * r.cantidad
      if (r.operacionEnvase === 'VENTA_NUEVO') t += 45000 * r.cantidad
      if (r.operacionEnvase === 'CANJE' && phVencida(r.phFecha) === true) t += 8500 * r.cantidad
    }
    return t
  }, [renglones, gases])

  const subtotalRenglon = useCallback((r: RenglonPedido) => {
    const gas = gases.find((g) => g.id === r.gasId)
    if (!gas) return 0
    let s = (PRECIOS_GAS[gas.codigo] || 15000) * r.cantidad
    if (r.operacionEnvase === 'VENTA_NUEVO') s += 45000 * r.cantidad
    if (r.operacionEnvase === 'CANJE' && phVencida(r.phFecha) === true) s += 8500 * r.cantidad
    return s
  }, [gases])

  const load = useCallback(async () => {
    try {
      const [pRes, gRes, cRes] = await Promise.all([
        fetch('/api/pedidos'),
        fetch('/api/gases'),
        fetch('/api/clientes?activo=true'),
      ])
      const pData = await pRes.json(); setPedidos(Array.isArray(pData) ? pData : [])
      const gData = await gRes.json(); setGases(Array.isArray(gData) ? gData : [])
      const cData = await cRes.json()
      setClientes(Array.isArray(cData) ? cData.map((c: any) => ({ id: c.id, nombre: c.nombre, estadoCuenta: c.estadoCuenta || 'AL_DIA' })) : [])
    } catch { /* ok */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function guardarPedido() {
    if (!clienteId || renglones.length === 0 || renglones.every((r) => !r.gasId)) {
      toast({ title: 'Faltan datos', description: 'Seleccioná un cliente y al menos un gas', variant: 'destructive' }); return
    }
    try {
      const body = {
        fecha,
        cliente: clienteSel?.nombre,
        clienteId,
        estadoCuenta,
        renglones: renglones.filter((r) => r.gasId).map((r) => ({
          gasId: r.gasId,
          operacionEnvase: r.operacionEnvase,
          cantidad: r.cantidad,
          phVigente: r.operacionEnvase === 'CANJE' ? !phVencida(r.phFecha) : null,
        })),
        observaciones: observaciones.trim() || null,
      }

      const res = editingId
        ? await fetch(`/api/pedidos/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast({ title: editingId ? 'Pedido actualizado' : 'Pedido creado', description: `$${totalCalc.toLocaleString()}` })
      setShowForm(false); resetForm(); load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    }
  }

  async function cambiarEstado(id: string, estado: string) {
    await fetch(`/api/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) })
    toast({ title: 'Estado actualizado' }); load()
  }

  async function eliminarPedido(id: string) {
    if (!confirm('¿Eliminar este pedido?')) return
    await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
    toast({ title: 'Pedido eliminado' }); load()
  }

  // Scanner de cilindros
  async function openScanner(pedido: Pedido) {
    setScannerPedidoId(pedido.id)
    setScannerInput('')
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}/cilindros`)
      const data = await res.json()
      setScannerCilindros(Array.isArray(data) ? data : [])
    } catch { setScannerCilindros([]) }
  }

  async function agregarCilindroScan() {
    if (!scannerInput.trim() || !scannerPedidoId) return
    try {
      const res = await fetch(`/api/pedidos/${scannerPedidoId}/cilindros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroSerie: scannerInput.trim() }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      const nuevo = await res.json()
      setScannerCilindros((prev) => [...prev, nuevo])
      setScannerInput('')
      toast({ title: 'Cilindro agregado', description: scannerInput.trim() })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    }
  }

  async function eliminarCilindroScan(id: string) {
    if (!confirm('Quitar este cilindro del pedido?')) return
    await fetch(`/api/pedidos/${scannerPedidoId}/cilindros?cilindroId=${id}`, { method: 'DELETE' })
    setScannerCilindros((prev) => prev.filter((c) => c.id !== id))
    toast({ title: 'Cilindro quitado' })
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <span className="text-xs text-slate-400">({pedidos.length} registros)</span>
        </div>
        <Button onClick={() => { if (showForm) resetForm(); setShowForm(!showForm) }} className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90">
          <Plus className="w-4 h-4 mr-1" /> {showForm ? 'Cancelar' : 'Nuevo Pedido'}
        </Button>
      </div>

      {/* FORM: Nuevo / Editar */}
      {showForm && (
        <Card className="border-orange-200 shadow-md print:hidden">
          <CardContent className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-orange-800 uppercase tracking-wider text-sm">{editingId ? 'Editar Pedido' : 'Orden de Pedido'}</span>
                </div>
                <Badge variant="outline" className="bg-white text-orange-700 border-orange-300 text-xs">{editingId ? 'Editando' : 'Nuevo'}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Fecha del pedido</Label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-white text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Cliente *</Label>
                  <Select value={clienteId} onValueChange={(v) => {
                    setClienteId(v)
                    const c = clientes.find((cl) => cl.id === v)
                    if (c) setEstadoCuenta(c.estadoCuenta === 'MOROSO' ? 'DEUDA_PENDIENTE' : 'OK')
                  }}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.nombre}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Estado de cuenta</Label>
                  <Select value={estadoCuenta} onValueChange={setEstadoCuenta}>
                    <SelectTrigger className={`bg-white ${estadoCuenta === 'DEUDA_PENDIENTE' ? 'border-red-400' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK">Ok — Sin deuda</SelectItem>
                      <SelectItem value="DEUDA_PENDIENTE">Deuda pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  {estadoCuenta === 'DEUDA_PENDIENTE' && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] text-red-600">Cliente con deuda — verificar condiciones de pago</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Observaciones</Label>
                  <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas del pedido" className="bg-white text-sm" />
                </div>
              </div>
            </div>

            {/* Renglones */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold tracking-wide">Detalle del pedido</span>
                </div>
                <span className="text-xs text-slate-400">{renglones.filter((r) => r.gasId).length} ítem(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                      <th className="px-3 py-2.5 text-left font-semibold w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[160px]">Gas</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[130px]">Operación</th>
                      <th className="px-3 py-2.5 text-center font-semibold w-16">Cant.</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[140px]">PH (Canje)</th>
                      <th className="px-3 py-2.5 text-right font-semibold w-28">P. Unit.</th>
                      <th className="px-3 py-2.5 text-right font-semibold w-28">Subtotal</th>
                      <th className="px-3 py-2.5 text-center w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {renglones.map((r, idx) => {
                      const gas = gases.find((g) => g.id === r.gasId)
                      const phCheck = phVencida(r.phFecha)
                      const sub = subtotalRenglon(r)
                      const pUnit = gas ? (PRECIOS_GAS[gas.codigo] || 15000) : 0
                      return (
                        <tr key={r.id} className={`border-t border-slate-100 ${!r.gasId ? 'bg-slate-50/40' : 'bg-white'} hover:bg-orange-50/30 transition-colors`}>
                          <td className="px-3 py-2 text-xs font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <Select value={r.gasId} onValueChange={(v) => actualizarRenglon(r.id, 'gasId', v)}>
                              <SelectTrigger className={`h-9 text-sm border-0 bg-transparent ${!r.gasId ? 'text-slate-400' : ''} hover:bg-slate-50 focus:ring-1`}>
                                <SelectValue placeholder="— Seleccionar gas —" />
                              </SelectTrigger>
                              <SelectContent>
                                {gases.map((g) => (
                                  <SelectItem key={g.id} value={g.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: g.colorHex }} />
                                      <span className="font-medium">{g.nombre}</span>
                                      <span className="text-slate-400 text-xs">({g.codigo})</span>
                                      <SgaBadge peligro={g.peligro} />
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select value={r.operacionEnvase} onValueChange={(v) => actualizarRenglon(r.id, 'operacionEnvase', v)}>
                              <SelectTrigger className="h-9 text-sm border-0 bg-transparent hover:bg-slate-50 focus:ring-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CANJE"><div className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-blue-500" /><span>Canje (mano a mano)</span></div></SelectItem>
                                <SelectItem value="VENTA_NUEVO"><div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-emerald-600" /><span>Venta de cilindro nuevo</span></div></SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { if (r.cantidad > 1) actualizarRenglon(r.id, 'cantidad', r.cantidad - 1) }}>
                                <span className="text-sm font-bold text-slate-500">−</span>
                              </Button>
                              <span className="w-8 text-center text-sm font-semibold tabular-nums">{r.cantidad}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => actualizarRenglon(r.id, 'cantidad', r.cantidad + 1)}>
                                <span className="text-sm font-bold text-slate-500">+</span>
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {r.operacionEnvase === 'CANJE' ? (
                              <div>
                                <Input type="date" value={r.phFecha} onChange={(e) => actualizarRenglon(r.id, 'phFecha', e.target.value)}
                                  className="h-9 text-xs bg-transparent border-0 hover:bg-slate-50 focus:ring-1" />
                                {phCheck === true && <p className="text-[10px] text-red-600 mt-0.5">PH vencida (+$8.500 c/u)</p>}
                                {phCheck === false && <p className="text-[10px] text-emerald-600 mt-0.5">PH vigente</p>}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {gas ? <span className="text-sm font-mono font-semibold tabular-nums">${pUnit.toLocaleString()}</span>
                              : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-sm font-bold font-mono tabular-nums text-orange-700">${sub.toLocaleString()}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50"
                              onClick={() => eliminarRenglon(r.id)} disabled={renglones.length === 1}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 px-4 py-2 flex items-center justify-between bg-slate-50">
                <Button type="button" variant="ghost" size="sm" onClick={agregarRenglon} className="text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar renglón
                </Button>
              </div>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-orange-200 pb-2">Resumen</p>
                {renglones.filter((r) => r.gasId).map((r) => {
                  const gas = gases.find((g) => g.id === r.gasId)
                  if (!gas) return null
                  const sub = subtotalRenglon(r)
                  return (
                    <div key={r.id} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate">{gas.nombre} × {r.cantidad}
                        <span className="text-slate-400 ml-1">({r.operacionEnvase === 'CANJE' ? 'Canje' : 'Nuevo'})</span>
                      </span>
                      <span className="font-mono font-semibold tabular-nums">${sub.toLocaleString()}</span>
                    </div>
                  )
                })}
                <div className="border-t border-orange-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">Total</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-orange-600">${totalCalc.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <Select onValueChange={(v) => cambiarEstado(editingId, v)}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Cambiar estado..." /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PEDIDO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={guardarPedido} disabled={!clienteId || renglones.every((r) => !r.gasId)}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 px-8">
                <ShoppingCart className="w-4 h-4 mr-2" /> {editingId ? 'Actualizar Pedido' : 'Confirmar Pedido'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardContent className="p-0">
          {pedidos.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No hay pedidos registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead>Envase</TableHead>
                    <TableHead className="text-center">PH</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Tubos</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{p.cliente}</div>
                        {p.estadoCuenta === 'DEUDA_PENDIENTE' && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">Deuda</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.gas.colorHex }} />
                          <span className="text-sm">{p.gas.nombre}</span>
                          <SgaBadge peligro={p.gas.peligro} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.operacionEnvase === 'CANJE' ? 'Canje' : 'Venta nueva'}</TableCell>
                      <TableCell className="text-center">
                        {p.phVigente === true && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Vigente</Badge>}
                        {p.phVigente === false && <Badge variant="destructive" className="text-xs">Vencida</Badge>}
                        {p.phVigente === null && <span className="text-xs text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">${p.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${p.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : p.estado === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{p.fecha ? formatDate(p.fecha) : formatDate(p.createdAt)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openScanner(p)} title="Gestionar tubos del pedido">
                          <Package className="w-3.5 h-3.5" />
                        </Button>
                        {p.cilindros && p.cilindros.length > 0 && (
                          <span className="text-[10px] text-slate-400 block -mt-1">{p.cilindros.length}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPedido(p)} title="Ver detalle">
                            <Search className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} title="Editar">
                            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewPedido(p); setTimeout(() => window.print(), 300) }} title="Imprimir / PDF">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => eliminarPedido(p.id)} title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Ver detalle / Imprimir */}
      <Dialog open={!!viewPedido} onOpenChange={(o) => { if (!o) setViewPedido(null) }}>
        <DialogContent className="max-w-3xl print:max-w-full print:shadow-none print:border-0">
          {viewPedido && <PedidoDetalle pedido={viewPedido} />}
        </DialogContent>
      </Dialog>

      {/* Modal: Scanner de cilindros */}
      <Dialog open={!!scannerPedidoId} onOpenChange={(o) => { if (!o) setScannerPedidoId(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Gestionar tubos del pedido
            </DialogTitle>
            <DialogDescription>
              Escaneá el QR o ingresá manualmente el número de serie del tubo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={scannerInput} onChange={(e) => setScannerInput(e.target.value)}
                placeholder="N° de serie del tubo (QR o manual)" className="flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarCilindroScan() } }} />
              <Button onClick={agregarCilindroScan} disabled={!scannerInput.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>📷 Escaneá con lector QR — el número aparece acá automáticamente</span>
            </div>
            {scannerCilindros.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {scannerCilindros.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">{c.numeroSerie}</span>
                      {c.gasCodigo && <Badge variant="outline" className="text-[10px]">{c.gasCodigo}</Badge>}
                      {c.verified
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verificado</Badge>
                        : <Badge variant="destructive" className="text-[10px]">No en inv.</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminarCilindroScan(c.id)}>
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                No hay tubos asignados a este pedido
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PedidoDetalle({ pedido }: { pedido: Pedido }) {
  const fecha = pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'
  return (
    <div className="space-y-6 print:space-y-4">
      {/* Encabezado imprimible */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Orden de Pedido</h1>
        <p className="text-sm text-slate-500">Control Digital ManejaDatos Districon</p>
      </div>

      <DialogHeader className="print:hidden">
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          Pedido — {pedido.cliente}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-slate-500 text-xs">Cliente</span><p className="font-semibold">{pedido.cliente}</p></div>
        <div><span className="text-slate-500 text-xs">Fecha</span><p className="font-semibold">{fecha}</p></div>
        <div><span className="text-slate-500 text-xs">Estado</span>
          <p><Badge className={`text-xs ${pedido.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : pedido.estado === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{pedido.estado}</Badge></p>
        </div>
        <div><span className="text-slate-500 text-xs">Estado de cuenta</span>
          <p>{pedido.estadoCuenta === 'DEUDA_PENDIENTE' ? <span className="text-red-600 font-semibold">Deuda pendiente</span> : 'Ok'}</p>
        </div>
      </div>

      {pedido.observaciones && (
        <div className="text-sm bg-slate-50 p-2 rounded"><span className="text-slate-500 text-xs">Observaciones:</span><p>{pedido.observaciones}</p></div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">Detalle de ítems</div>
        <div className="divide-y">
          {pedido.items.map((i) => (
            <div key={i.id} className="flex justify-between px-4 py-2 text-sm">
              <span>{i.concepto}</span>
              <span className="font-mono font-semibold">${i.monto.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="bg-orange-50 flex justify-between px-4 py-3 font-bold text-base border-t-2 border-orange-200">
          <span>Total</span>
          <span className="text-orange-700 font-mono">${pedido.total.toLocaleString()}</span>
        </div>
      </div>

      {/* Tubos asignados */}
      {pedido.cilindros && pedido.cilindros.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-700 text-white px-4 py-2 text-sm font-semibold">Tubos asignados</div>
          <div className="divide-y">
            {pedido.cilindros.map((c) => (
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

      {/* Botón de impresión (solo en pantalla) */}
      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <FileText className="w-4 h-4" /> Imprimir / PDF
        </Button>
      </div>
    </div>
  )
}

// Colores para nodos del grafo (hex para SVG)
const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  Cylinder: { fill: '#f3e8ff', stroke: '#a855f7', text: '#6b21a8' },
  Gas: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  Cliente: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' },
  Location: { fill: '#d1fae5', stroke: '#10b981', text: '#065f46' },
  Movimiento: { fill: '#e0f2fe', stroke: '#0ea5e9', text: '#075985' },
  Mantenimiento: { fill: '#ffe4e6', stroke: '#f43f5e', text: '#9f1239' },
}

// Simple SVG graph visualization
function SimpleGraph({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const W = 700, H = 400, CX = W / 2, CY = H / 2, R = 140

  // Position center node (Cylinder) at center, others in a circle
  const cylNode = nodes.find(n => n.type === 'Cylinder')
  const others = nodes.filter(n => n.type !== 'Cylinder')
  const positioned = new Map<string, { x: number; y: number }>()
  if (cylNode) positioned.set(cylNode.id, { x: CX, y: CY })
  others.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2
    positioned.set(n.id, { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) })
  })

  // Build mini-label for tooltip
  function miniLabel(n: any): string {
    if (n.type === 'Cylinder') return `#${n.label}`
    return n.label || n.id
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 250 }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const s = positioned.get(e.source)
          const t = positioned.get(e.target)
          if (!s || !t) return null
          return (
            <g key={i}>
              <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="#94a3b8" strokeWidth={1.5} />
              <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 4}
                textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
                {e.type}
              </text>
            </g>
          )
        })}
        {/* Nodes */}
        {nodes.map(n => {
          const p = positioned.get(n.id)
          if (!p) return null
          const c = NODE_COLORS[n.type] || NODE_COLORS.Cylinder
          const isCyl = n.type === 'Cylinder'
          const w = isCyl ? 120 : 100
          return (
            <g key={n.id}>
              <title>{miniLabel(n)}</title>
              <rect x={p.x - w / 2} y={p.y - 14} width={w} height={28} rx={14}
                fill={c.fill} stroke={c.stroke} strokeWidth={2} />
              <text x={p.x} y={p.y + 4.5} textAnchor="middle"
                fill={c.text} fontSize="10" fontFamily="monospace" fontWeight="600">
                {isCyl ? `#${n.label}` : n.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// 10. MANTENIMIENTO
// ============================================================
const TIPOS_MANT: Record<string, string> = {
  CAMBIO_VALVULA: 'Cambio Válvula',
  PINTURA: 'Pintura',
  CAMBIO_GAS: 'Cambio Gas',
  REPARACION: 'Reparación',
  INSPECCION: 'Inspección',
  OTRO: 'Otro',
}

// ===== REMITOS / ENTREGA TAB =====
interface RemitoItemData {
  id?: string
  cylinderId?: string
  numeroSerie?: string
  gasId: string
  gasCodigo: string
  tipoOperacion: string
  cantidad: number
  fechaDevolucion?: string
  diasAlquiler?: number
  precioUnitario?: number
  subtotal?: number
}

interface Remito {
  id: string; numero: number; clienteId: string; cliente: string; fecha: string
  tipo: string; estado: string; tecnico?: string; observaciones?: string
  items: RemitoItemData[]
}

function RemitosTab() {
  const { toast } = useToast()
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')

  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState('ENTREGA')
  const [tecnico, setTecnico] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<any[]>([{ gasId: '', gasCodigo: '', tipoOperacion: 'ALQUILER', cantidad: 1 }])

  function resetForm() {
    setClienteId(''); setTipo('ENTREGA'); setTecnico(''); setObservaciones('')
    setItems([{ gasId: '', gasCodigo: '', tipoOperacion: 'ALQUILER', cantidad: 1 }])
    setEditingId(null)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, cRes, gRes, cylRes] = await Promise.all([
        fetch('/api/remitos'), fetch('/api/clientes'), fetch('/api/gases'), fetch('/api/cylinders'),
      ])
      const rData = await rRes.json(); setRemitos(Array.isArray(rData) ? rData : [])
      const cData = await cRes.json(); setClientes(Array.isArray(cData) ? cData : [])
      const gData = await gRes.json(); setGases(Array.isArray(gData) ? gData : [])
      const cylData = await cylRes.json(); setCylinders(Array.isArray(cylData) ? cylData : [])
    } catch { toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' }) }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function guardar() {
    if (!clienteId) { toast({ title: 'Error', description: 'Seleccioná un cliente', variant: 'destructive' }); return }
    const cliente = clientes.find((c: any) => c.id === clienteId)
    const payload = { clienteId, cliente: cliente?.nombre || '', tipo, tecnico, observaciones, items: items.filter((i) => i.gasId) }
    try {
      if (editingId) {
        await fetch(`/api/remitos/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/remitos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      toast({ title: 'OK', description: editingId ? 'Remito actualizado' : 'Remito creado' })
      setShowForm(false); resetForm(); load()
    } catch { toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' }) }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este remito?')) return
    try {
      await fetch(`/api/remitos/${id}`, { method: 'DELETE' })
      toast({ title: 'Eliminado' }); load()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  function openEdit(r: Remito) {
    setClienteId(r.clienteId); setTipo(r.tipo); setTecnico(r.tecnico || ''); setObservaciones(r.observaciones || '')
    setItems(r.items.map((i) => ({ ...i, cylinderId: i.cylinderId || '', numeroSerie: i.numeroSerie || '' })))
    setEditingId(r.id); setShowForm(true)
  }

  const clienteSel = clientes.find((c: any) => c.id === clienteId)
  const filtrados = remitos.filter((r) => (filtroTipo === 'all' || r.tipo === filtroTipo) && (filtroEstado === 'all' || r.estado === filtroEstado))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="ENTREGA">Entrega</option>
            <option value="DEVOLUCION">Devolución</option>
            <option value="CAMBIO">Cambio</option>
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="COMPLETADO">Completado</option>
            <option value="PARCIAL">Parcial</option>
          </select>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="w-4 h-4 mr-1" />Nuevo Remito</Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay remitos registrados</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Remito N°</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">#{r.numero}</TableCell>
                  <TableCell>{r.cliente}</TableCell>
                  <TableCell className="text-sm text-slate-500">{new Date(r.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.tipo === 'DEVOLUCION' ? 'secondary' : r.tipo === 'CAMBIO' ? 'outline' : 'default'}>{r.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.estado === 'COMPLETADO' ? 'default' : r.estado === 'PARCIAL' ? 'secondary' : 'outline'}>{r.estado}</Badge>
                  </TableCell>
                  <TableCell>{r.items?.length || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit3 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => eliminar(r.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Remito' : 'Nuevo Remito'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Tipo</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="ENTREGA">Entrega</option>
                  <option value="DEVOLUCION">Devolución</option>
                  <option value="CAMBIO">Cambio</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Técnico</Label>
                <Input value={tecnico} onChange={(e) => setTecnico(e.target.value)} placeholder="Nombre del técnico" />
              </div>
              <div>
                <Label>Gas / Cilindro</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={items[0]?.gasId || ''} onChange={(e) => {
                  const gas = gases.find((g) => g.id === e.target.value)
                  const newItems = [{ gasId: e.target.value, gasCodigo: gas?.codigo || '', tipoOperacion: 'ALQUILER', cantidad: 1 }]
                  setItems(newItems)
                }}>
                  <option value="">Seleccionar gas...</option>
                  {gases.map((g) => <option key={g.id} value={g.id}>{g.nombre} ({g.codigo})</option>)}
                </select>
              </div>
            </div>
            {items[0]?.gasId && (
              <div className="border rounded-lg p-3 bg-slate-50">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <span>Items del remito</span>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <select className="border rounded px-2 py-1 text-sm flex-1" value={it.tipoOperacion} onChange={(e) => {
                      const newItems = [...items]; newItems[idx].tipoOperacion = e.target.value; setItems(newItems)
                    }}>
                      <option value="ALQUILER">Alquiler</option>
                      <option value="VENTA">Venta</option>
                      <option value="CAMBIO">Cambio</option>
                      <option value="DEVOLUCION">Devolución</option>
                    </select>
                    <Input type="number" min={1} className="w-20 text-sm" value={it.cantidad} onChange={(e) => {
                      const newItems = [...items]; newItems[idx].cantidad = parseInt(e.target.value) || 1; setItems(newItems)
                    }} />
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (items.length > 1) { const newItems = items.filter((_, i) => i !== idx); setItems(newItems) }
                    }}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-1" onClick={() => setItems([...items, { gasId: items[0]?.gasId || '', gasCodigo: items[0]?.gasCodigo || '', tipoOperacion: 'ALQUILER', cantidad: 1 }])}>
                  + Agregar item
                </Button>
              </div>
            )}
            <div>
              <Label>Observaciones</Label>
              <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
            <div className="text-sm text-slate-500">
              {clienteSel && <span>Estado cuenta: <strong>{clienteSel.estadoCuenta || 'N/D'}</strong></span>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={guardar}>{editingId ? 'Actualizar' : 'Crear Remito'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===== FACTURACIÓN TAB =====
interface FacturaItem {
  id?: string
  concepto: string
  tipo?: string
  remitoItemId?: string
  cylinderId?: string
  numeroSerie?: string
  diasFacturados?: number
  cantidad: number
  precioUnitario: number
  subtotal: number
}

interface Factura {
  id: string; numero: number; clienteId: string; cliente: string
  fecha: string; fechaVencimiento?: string
  fechaDesde?: string; fechaHasta?: string; tipoPeriodo?: string
  remitoIds: string
  subtotal?: number; descuento?: number; impuestos?: number
  total: number; estado: string
  saldoAnterior?: number; notasCredito?: number; pagosAplicados?: number
  totalGeneral?: number
  observaciones?: string
  items: FacturaItem[]
}

function FacturacionTab() {
  const { toast } = useToast()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [gases, setGases] = useState<Gas[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [previewFactura, setPreviewFactura] = useState<Factura | null>(null)

  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])
  const [tipoPeriodo, setTipoPeriodo] = useState('MENSUAL')
  const [fechaVencimiento, setFechaVencimiento] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1)
    return d.toISOString().split('T')[0]
  })
  const [observaciones, setObservaciones] = useState('')
  const [selectedRemitoIds, setSelectedRemitoIds] = useState<string[]>([])
  const [facturaItems, setFacturaItems] = useState<FacturaItem[]>([])
  const [descuento, setDescuento] = useState(0)
  const [impuestos, setImpuestos] = useState(0)
  const [saldoAnterior, setSaldoAnterior] = useState(0)
  const [notasCredito, setNotasCredito] = useState(0)
  const [pagosAplicados, setPagosAplicados] = useState(0)
  const [estado, setEstado] = useState('PENDIENTE')

  function resetForm() {
    const now = new Date()
    setClienteId('')
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    setFechaDesde(d.toISOString().split('T')[0])
    setFechaHasta(now.toISOString().split('T')[0])
    setTipoPeriodo('MENSUAL')
    const v = new Date(); v.setMonth(v.getMonth() + 1)
    setFechaVencimiento(v.toISOString().split('T')[0])
    setObservaciones('')
    setSelectedRemitoIds([])
    setFacturaItems([])
    setDescuento(0)
    setImpuestos(0)
    setSaldoAnterior(0)
    setNotasCredito(0)
    setPagosAplicados(0)
    setEstado('PENDIENTE')
    setEditingId(null)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fRes, cRes, rRes, gRes] = await Promise.all([
        fetch('/api/facturas'), fetch('/api/clientes'), fetch('/api/remitos'), fetch('/api/gases'),
      ])
      const fData = await fRes.json(); setFacturas(Array.isArray(fData) ? fData : [])
      const cData = await cRes.json(); setClientes(Array.isArray(cData) ? cData : [])
      const rData = await rRes.json(); setRemitos(Array.isArray(rData) ? rData : [])
      const gData = await gRes.json(); setGases(Array.isArray(gData) ? gData : [])
    } catch { toast({ title: 'Error', description: 'No se pudieron cargar datos', variant: 'destructive' }) }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  const remitosCliente = remitos.filter((r) => r.clienteId === clienteId)
  const remitosEnPeriodo = remitosCliente.filter((r) => {
    const rf = new Date(r.fecha)
    const fd = new Date(fechaDesde)
    const fh = new Date(fechaHasta)
    fh.setHours(23, 59, 59, 999)
    return rf >= fd && rf <= fh
  })

  const total = facturaItems.reduce((s, it) => s + it.subtotal, 0)
  const totalGeneral = total + saldoAnterior - notasCredito - pagosAplicados

  async function calcularAlquiler() {
    if (!clienteId) {
      toast({ title: 'Error', description: 'Seleccioná un cliente primero', variant: 'destructive' })
      return
    }
    setCalculando(true)
    try {
      const res = await fetch('/api/facturas/calcular-alquiler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          fechaDesde,
          fechaHasta,
          incluirFacturados: editingId !== null,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        setFacturaItems(data.items)
        // Auto-select remitos from items
        const remitoIds = new Set<string>()
        for (const r of remitosEnPeriodo) {
          const match = data.items.some((it: any) => r.items.some((ri: any) => ri.id === it.remitoItemId))
          if (match) remitoIds.add(r.id)
        }
        setSelectedRemitoIds([...remitoIds])
        toast({ title: 'Cálculo completado', description: `${data.items.length} ítem(es) generados` })
      } else {
        toast({ title: 'Sin ítems', description: 'No se encontraron conceptos facturables en el período' })
        setFacturaItems([])
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo calcular alquiler', variant: 'destructive' })
    }
    setCalculando(false)
  }

  async function guardar() {
    if (!clienteId) { toast({ title: 'Error', description: 'Seleccioná un cliente', variant: 'destructive' }); return }
    if (facturaItems.length === 0) { toast({ title: 'Error', description: 'Agregá al menos un ítem', variant: 'destructive' }); return }
    const cliente = clientes.find((c: any) => c.id === clienteId)
    const payload = {
      clienteId,
      cliente: cliente?.nombre || '',
      fechaVencimiento,
      fechaDesde,
      fechaHasta,
      tipoPeriodo,
      remitoIds: selectedRemitoIds,
      items: facturaItems.filter((i) => i.concepto),
      subtotal: total,
      descuento,
      impuestos,
      total: total,
      saldoAnterior,
      notasCredito,
      pagosAplicados,
      totalGeneral,
      estado,
      observaciones,
    }
    try {
      if (editingId) {
        await fetch(`/api/facturas/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/facturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      toast({ title: 'OK', description: editingId ? 'Factura actualizada' : 'Factura creada' })
      setShowForm(false)
      resetForm()
      load()
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    }
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    try {
      await fetch(`/api/facturas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      toast({ title: `Factura marcada como ${nuevoEstado}` })
      load()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta factura permanentemente?')) return
    try {
      await fetch(`/api/facturas/${id}`, { method: 'DELETE' })
      toast({ title: 'Eliminada' })
      load()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  function openEdit(f: Factura) {
    setClienteId(f.clienteId)
    setFechaDesde(f.fechaDesde?.split('T')[0] || '')
    setFechaHasta(f.fechaHasta?.split('T')[0] || '')
    setTipoPeriodo(f.tipoPeriodo || 'MENSUAL')
    setFechaVencimiento(f.fechaVencimiento?.split('T')[0] || '')
    setObservaciones(f.observaciones || '')
    setSelectedRemitoIds(f.remitoIds ? f.remitoIds.split(',').filter(Boolean) : [])
    setFacturaItems(f.items.map((i) => ({ ...i })))
    setDescuento(f.descuento ?? 0)
    setImpuestos(f.impuestos ?? 0)
    setSaldoAnterior(f.saldoAnterior ?? 0)
    setNotasCredito(f.notasCredito ?? 0)
    setPagosAplicados(f.pagosAplicados ?? 0)
    setEstado(f.estado)
    setEditingId(f.id)
    setShowForm(true)
  }

  const filtradas = facturas.filter((f) => {
    if (filtroEstado !== 'all' && f.estado !== filtroEstado) return false
    if (filtroCliente && !f.cliente.toLowerCase().includes(filtroCliente.toLowerCase())) return false
    return true
  })

  // Gas price lookup helper
  const gasPriceOf = (codigo: string) => {
    const g = gases.find((g) => g.codigo === codigo)
    return {
      diario: g?.precioAlquilerDiario || 0,
      mensual: g?.precioAlquilerMensual || 0,
      venta: g?.precioVenta || 0,
      nombre: g?.nombre || codigo,
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADA">Pagada</option>
            <option value="VENCIDA">Vencida</option>
            <option value="BORRADOR">Borrador</option>
            <option value="ANULADA">Anulada</option>
          </select>
          <Input
            className="w-48"
            placeholder="Buscar cliente..."
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1" />Nueva Factura
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-200" />
          No hay facturas registradas
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((f) => {
                const totalGral = f.totalGeneral ?? f.total
                return (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => setPreviewFactura(f)}>
                    <TableCell className="font-medium">#{f.numero}</TableCell>
                    <TableCell className="max-w-32 truncate">{f.cliente}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {f.fechaDesde ? `${new Date(f.fechaDesde).toLocaleDateString()} - ${new Date(f.fechaHasta || f.fecha).toLocaleDateString()}` : new Date(f.fecha).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {f.fechaVencimiento ? new Date(f.fechaVencimiento).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-right">${f.total.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-right text-xs">
                      <span className={totalGral > f.total ? 'text-amber-600' : ''}>
                        ${totalGral.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.estado === 'PAGADA' ? 'default' : f.estado === 'VENCIDA' ? 'destructive' : f.estado === 'ANULADA' ? 'secondary' : f.estado === 'BORRADOR' ? 'outline' : 'outline'}>
                        {f.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500">{f.items?.length || 0}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {f.estado === 'PENDIENTE' && (
                        <>
                          <Button variant="outline" size="sm" className="mr-1 h-7 text-xs" onClick={() => cambiarEstado(f.id, 'PAGADA')}>
                            Cobrar
                          </Button>
                          <Button variant="outline" size="sm" className="mr-1 h-7 text-xs" onClick={() => cambiarEstado(f.id, 'VENCIDA')}>
                            Vencer
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7" onClick={() => openEdit(f)}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 text-red-500" onClick={() => eliminar(f.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFactura} onOpenChange={(o) => { if (!o) setPreviewFactura(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewFactura && <InvoicePreview factura={previewFactura} />}
        </DialogContent>
      </Dialog>

      {/* New/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm() } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              {editingId ? 'Editar Factura' : 'Nueva Factura'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Fila: Cliente + Estado */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Cliente</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="BORRADOR">Borrador</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PAGADA">Pagada</option>
                </select>
              </div>
            </div>

            {/* Período de facturación */}
            {clienteId && (
              <div className="bg-slate-50 rounded-lg p-3 border">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Período de facturación
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <select className="w-full border rounded px-2 py-1.5 text-sm" value={tipoPeriodo} onChange={(e) => setTipoPeriodo(e.target.value)}>
                      <option value="DIARIO">Diario</option>
                      <option value="SEMANAL">Semanal</option>
                      <option value="QUINCENAL">Quincenal</option>
                      <option value="MENSUAL">Mensual</option>
                      <option value="PERSONALIZADO">Personalizado</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Desde</Label>
                    <Input type="date" className="h-8 text-sm" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Hasta</Label>
                    <Input type="date" className="h-8 text-sm" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Vencimiento</Label>
                    <Input type="date" className="h-8 text-sm" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Calcular alquileres */}
            {clienteId && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={calcularAlquiler}
                  disabled={calculando}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${calculando ? 'animate-spin' : ''}`} />
                  {calculando ? 'Calculando...' : 'Calcular alquileres del período'}
                </Button>
                <span className="text-xs text-slate-400">
                  {remitosEnPeriodo.length} remito(s) en el período para este cliente
                </span>
              </div>
            )}

            {/* Remitos a facturar */}
            {clienteId && selectedRemitoIds.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500">Remitos incluidos ({selectedRemitoIds.length})</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {remitosCliente
                    .filter((r) => selectedRemitoIds.includes(r.id))
                    .map((r) => (
                      <Badge key={r.id} variant="outline" className="text-[10px]">
                        #{r.numero} · {new Date(r.fecha).toLocaleDateString()} · {r.tipo}
                        <button
                          className="ml-1.5 hover:text-red-500"
                          onClick={() => setSelectedRemitoIds((prev) => prev.filter((id) => id !== r.id))}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Items */}
            {facturaItems.length > 0 && (
              <div>
                <Label>Detalle de conceptos a facturar</Label>
                <div className="border rounded-lg overflow-hidden mt-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Tipo</TableHead>
                        <TableHead className="text-[10px]">Concepto</TableHead>
                        <TableHead className="text-[10px] w-16">Tubo</TableHead>
                        <TableHead className="text-[10px] w-12">Días</TableHead>
                        <TableHead className="text-[10px] w-14 text-center">Cant</TableHead>
                        <TableHead className="text-[10px] w-20 text-right">P.Unit</TableHead>
                        <TableHead className="text-[10px] w-20 text-right">Subtotal</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturaItems.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {it.tipo || 'ALQUILER'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="text-xs h-7 min-w-32"
                              value={it.concepto}
                              onChange={(e) => {
                                const n = [...facturaItems]
                                n[idx].concepto = e.target.value
                                setFacturaItems(n)
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                          <TableCell className="text-center text-xs">{it.diasFacturados || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={1}
                              className="w-14 text-xs h-7 text-center"
                              value={it.cantidad}
                              onChange={(e) => {
                                const n = [...facturaItems]
                                n[idx].cantidad = parseInt(e.target.value) || 1
                                n[idx].subtotal = n[idx].cantidad * n[idx].precioUnitario
                                setFacturaItems(n)
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-20 text-xs h-7 text-right"
                              value={it.precioUnitario}
                              onChange={(e) => {
                                const n = [...facturaItems]
                                n[idx].precioUnitario = parseFloat(e.target.value) || 0
                                n[idx].subtotal = n[idx].cantidad * n[idx].precioUnitario
                                setFacturaItems(n)
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            ${it.subtotal.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-red-400 hover:text-red-600"
                              onClick={() => setFacturaItems((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Saldos y ajustes */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Saldo anterior</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={saldoAnterior}
                  onChange={(e) => setSaldoAnterior(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Notas de crédito</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={notasCredito}
                  onChange={(e) => setNotasCredito(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Pagos aplicados</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={pagosAplicados}
                  onChange={(e) => setPagosAplicados(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Descuento</Label>
                <Input
                  type="number"
                  step={0.01}
                  className="text-sm h-8"
                  value={descuento}
                  onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Resumen financiero */}
            {facturaItems.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 border">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Resumen financiero</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal (período actual)</span>
                    <span className="font-mono">${total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Saldo anterior</span>
                    <span className="font-mono">${saldoAnterior.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Notas de crédito</span>
                    <span className="font-mono text-emerald-600">- ${notasCredito.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pagos aplicados</span>
                    <span className="font-mono text-emerald-600">- ${pagosAplicados.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Descuento</span>
                    <span className="font-mono text-emerald-600">- ${descuento.toLocaleString()}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total general adeudado</span>
                    <span className="font-mono">${totalGeneral.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <Label>Observaciones</Label>
              <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas internas, condiciones de pago, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={facturaItems.length === 0}>
              <Save className="w-4 h-4 mr-1" />
              {editingId ? 'Actualizar' : 'Crear Factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Invoice preview component - shows full spec-compliant invoice view
function InvoicePreview({ factura }: { factura: Factura }) {
  const totalGral = factura.totalGeneral ?? factura.total
  const subtotal = factura.subtotal ?? factura.total
  const desc = factura.descuento ?? 0

  const itemsGrouped = {
    ALQUILER: factura.items.filter((i) => (i.tipo || 'ALQUILER') === 'ALQUILER'),
    GAS: factura.items.filter((i) => i.tipo === 'GAS'),
    OTRO: factura.items.filter((i) => i.tipo !== 'GAS' && (i.tipo || 'ALQUILER') !== 'ALQUILER'),
  }

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">BORRADOR DE FACTURA</h2>
        <p className="text-xs text-slate-400">Documento interno - No válido como comprobante fiscal</p>
      </div>

      {/* A. Datos del emisor */}
      <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-0.5">
        <span className="font-semibold text-sm block mb-1">A. Datos del emisor</span>
        <div className="grid grid-cols-2 gap-1 text-slate-600">
          <span>Razón social: Control Digital ManejaDatos Districon</span>
          <span>San Nicolás de los Arroyos, Buenos Aires</span>
        </div>
      </div>

      {/* B. Datos del cliente */}
      <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-0.5">
        <span className="font-semibold text-sm block mb-1">B. Datos del cliente</span>
        <div className="grid grid-cols-2 gap-1 text-slate-600">
          <span>Cliente: {factura.cliente}</span>
          <span>Factura N°: {factura.numero}</span>
        </div>
      </div>

      {/* C. Período */}
      <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-0.5">
        <span className="font-semibold text-sm block mb-1">C. Período facturado</span>
        <div className="grid grid-cols-3 gap-1 text-slate-600">
          <span>Desde: {factura.fechaDesde ? new Date(factura.fechaDesde).toLocaleDateString() : '-'}</span>
          <span>Hasta: {factura.fechaHasta ? new Date(factura.fechaHasta).toLocaleDateString() : '-'}</span>
          <span>Tipo: {factura.tipoPeriodo || 'No especificado'}</span>
          <span>Emisión: {new Date(factura.fecha).toLocaleDateString()}</span>
          <span>Vencimiento: {factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString() : '-'}</span>
        </div>
      </div>

      {/* D. Detalle de conceptos */}
      <div>
        <span className="font-semibold text-sm block mb-1">D. Detalle de conceptos</span>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Ítem</TableHead>
                <TableHead className="text-[10px]">Concepto</TableHead>
                <TableHead className="text-[10px] w-16">N° Serie</TableHead>
                <TableHead className="text-[10px] w-12">Días</TableHead>
                <TableHead className="text-[10px] w-14 text-center">Cant</TableHead>
                <TableHead className="text-[10px] w-20 text-right">P.Unit</TableHead>
                <TableHead className="text-[10px] w-20 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factura.items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell className="text-[10px]">{i + 1}</TableCell>
                  <TableCell className="text-xs">{it.concepto}</TableCell>
                  <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                  <TableCell className="text-center text-xs">{it.diasFacturados || '-'}</TableCell>
                  <TableCell className="text-center text-xs">{it.cantidad}</TableCell>
                  <TableCell className="text-right text-xs font-mono">${it.precioUnitario.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs font-mono">${it.subtotal.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* E. Detalle de alquiler por tubo */}
      {itemsGrouped.ALQUILER.length > 0 && (
        <div>
          <span className="font-semibold text-sm block mb-1">E. Detalle de alquiler por tubo</span>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Tubo</TableHead>
                  <TableHead className="text-[10px]">Concepto</TableHead>
                  <TableHead className="text-[10px] text-center">Días</TableHead>
                  <TableHead className="text-[10px] text-right">Tarifa</TableHead>
                  <TableHead className="text-[10px] text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsGrouped.ALQUILER.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                    <TableCell className="text-xs">{it.concepto}</TableCell>
                    <TableCell className="text-center text-xs">{it.diasFacturados || '-'}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${(it.precioUnitario / (it.diasFacturados || 1)).toFixed(2)}/d</TableCell>
                    <TableCell className="text-right text-xs font-mono">${it.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* F. Gases */}
      {itemsGrouped.GAS.length > 0 && (
        <div>
          <span className="font-semibold text-sm block mb-1">F. Gases facturados</span>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Gas</TableHead>
                  <TableHead className="text-[10px]">Concepto</TableHead>
                  <TableHead className="text-[10px] w-14">Cant</TableHead>
                  <TableHead className="text-[10px] w-20 text-right">P.Unit</TableHead>
                  <TableHead className="text-[10px] w-20 text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsGrouped.GAS.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-[10px]">{it.numeroSerie || '-'}</TableCell>
                    <TableCell className="text-xs">{it.concepto}</TableCell>
                    <TableCell className="text-center text-xs">{it.cantidad}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${it.precioUnitario.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${it.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* I. Saldos y deuda */}
      <div>
        <span className="font-semibold text-sm block mb-1">I. Resumen financiero</span>
        <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal (período)</span>
            <span className="font-mono">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Descuento</span>
            <span className="font-mono text-emerald-600">- ${desc.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Saldo anterior</span>
            <span className="font-mono">${(factura.saldoAnterior ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Notas de crédito</span>
            <span className="font-mono text-emerald-600">- ${(factura.notasCredito ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Pagos aplicados</span>
            <span className="font-mono text-emerald-600">- ${(factura.pagosAplicados ?? 0).toLocaleString()}</span>
          </div>
          <hr />
          <div className="flex justify-between font-bold text-base">
            <span>Total general adeudado</span>
            <span className="font-mono">${totalGral.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* J. Remitos incluidos */}
      <div>
        <span className="font-semibold text-sm block mb-1">J. Remitos incluidos</span>
        <p className="text-xs text-slate-500">
          Remitos: {factura.remitoIds || 'No especificados'}
        </p>
      </div>

      {/* Observaciones */}
      {factura.observaciones && (
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs">
          <span className="font-semibold">Observaciones:</span> {factura.observaciones}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 border-t pt-3">
        Borrador administrativo - Emisión fiscal debe realizarse en el sistema autorizado por la autoridad tributaria.
      </div>
    </div>
  )
}

function MantenimientoTab() {
  const { toast } = useToast()
  const [records, setRecords] = useState<any[]>([])
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCylinder, setFiltroCylinder] = useState('all')
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroGas, setFiltroGas] = useState('all')
  const [gases, setGases] = useState<Gas[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    cylinderId: '', tipo: '', descripcion: '', tecnico: '',
    costo: '', fecha: new Date().toISOString().split('T')[0],
  })

  async function loadData() {
    setLoading(true)
    try {
      const [cylRes, gasRes] = await Promise.all([
        fetch('/api/cylinders'),
        fetch('/api/gases'),
      ])
      const cyls: Cylinder[] = await cylRes.json()
      const allRecords: any[] = []
      for (const cyl of cyls) {
        const mRes = await fetch(`/api/cylinders/${cyl.id}/mantenimiento`)
        const mData = await mRes.json()
        if (Array.isArray(mData)) {
          for (const r of mData) allRecords.push({ ...r, cylinder: cyl })
        }
      }
      allRecords.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      setRecords(allRecords)
      setCylinders(cyls)
      setGases(await gasRes.json())
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filtered = records.filter(r => {
    if (filtroCylinder !== 'all' && r.cylinderId !== filtroCylinder) return false
    if (filtroTipo !== 'all' && r.tipo !== filtroTipo) return false
    if (filtroGas !== 'all' && r.cylinder.gasId !== filtroGas) return false
    return true
  })

  async function saveMantenimiento() {
    if (!form.cylinderId || !form.tipo) return
    try {
      const res = await fetch(`/api/cylinders/${form.cylinderId}/mantenimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Mantenimiento registrado', variant: 'default' })
      setDialogOpen(false)
      setForm({ cylinderId: '', tipo: '', descripcion: '', tecnico: '', costo: '', fecha: new Date().toISOString().split('T')[0] })
      loadData()
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  async function deleteMantenimiento(mantId: string, cylinderId: string) {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return
    try {
      const res = await fetch(`/api/cylinders/${cylinderId}/mantenimiento?mantenimientoId=${mantId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Registro eliminado', variant: 'default' })
      loadData()
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-500" />
          Mantenimiento de Tubos
        </h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-orange-500 to-red-600 gap-2">
          <Wrench className="w-4 h-4" /> Nuevo Registro
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={filtroCylinder} onValueChange={setFiltroCylinder}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Todos los tubos" /></SelectTrigger>
          <SelectContent>{cylinders.map(cyl => <SelectItem key={cyl.id} value={cyl.id}>{cyl.numeroSerie} — {cyl.gas.nombre}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(TIPOS_MANT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroGas} onValueChange={setFiltroGas}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Todos los gases" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los gases</SelectItem>
            {gases.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Sin registros de mantenimiento</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tubo</TableHead>
                <TableHead>Gas</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-center w-16">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono">{formatDate(r.fecha)}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">{r.cylinder.numeroSerie}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.cylinder.gas.colorHex }} />
                      <span className="text-xs">{r.cylinder.gas.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{TIPOS_MANT[r.tipo] || r.tipo}</Badge></TableCell>
                  <TableCell className="text-xs max-w-48 truncate">{r.descripcion || '—'}</TableCell>
                  <TableCell className="text-xs">{r.tecnico || '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono tabular-nums">{r.costo != null ? `$${r.costo.toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                      onClick={() => deleteMantenimiento(r.id, r.cylinderId)} title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Nuevo mantenimiento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              Nuevo Registro de Mantenimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tubo</Label>
              <Select value={form.cylinderId} onValueChange={v => setForm(f => ({ ...f, cylinderId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tubo" /></SelectTrigger>
                <SelectContent>
                  {cylinders.map(cyl => (
                    <SelectItem key={cyl.id} value={cyl.id}>{cyl.numeroSerie} — {cyl.gas.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_MANT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Técnico</Label>
                <Input value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} placeholder="Nombre" />
              </div>
              <div>
                <Label>Costo ($)</Label>
                <Input type="number" step="0.01" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
            <Button onClick={saveMantenimiento} disabled={!form.cylinderId || !form.tipo}
              className="bg-gradient-to-r from-orange-500 to-red-600">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// 11. TABLAS (CRUD Gases, Location, AlertConfig)
// ============================================================
const TABLAS_DISPONIBLES = [
  { key: 'gases', label: 'Gases', icon: 'FlaskConical' },
  { key: 'locations', label: 'Ubicaciones', icon: 'MapPin' },
  { key: 'usuarios', label: 'Usuarios', icon: 'Users' },
  { key: 'alertconfig', label: 'Alertas', icon: 'Bell' },
] as const

function TablasTab() {
  const { toast } = useToast()
  const [tablaActiva, setTablaActiva] = useState('gases')
  const [gases, setGases] = useState<Gas[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Gases form
  const emptyGas = { codigo: '', nombre: '', descripcion: '', presionBar: '200', colorHex: '#cccccc', usoPrincipal: '', categoria: '', peligro: 'GAS_PRESION' }
  const [gasForm, setGasForm] = useState(emptyGas)

  // Locations form
  const emptyLoc = { nombre: '', provincia: '', lat: '', lng: '', tipo: 'BASE', esBase: false, direccion: '', telefono: '' }
  const [locForm, setLocForm] = useState(emptyLoc)

  // Alert form (usa campos de AlertConfig: diasAlertaRetest, diasMaxCliente, alertaPH, activo)
  const emptyAlert = { gasId: '', diasAlertaRetest: '60', diasMaxCliente: '90', alertaPH: true, activo: true }
  const [alertForm, setAlertForm] = useState(emptyAlert)

  // Users form
  const emptyUsuario = { nombre: '', usuario: '', password: '', password2: '', direccion: '', telefono: '', ciudad: '', provincia: '', lat: '', lng: '', email: '', nivelAcceso: '1', activo: true }
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [userForm, setUserForm] = useState(emptyUsuario)

  async function loadAll() {
    setLoading(true)
    try {
      const [gRes, lRes, uRes, aRes] = await Promise.all([
        fetch('/api/gases'),
        fetch('/api/locations'),
        fetch('/api/usuarios'),
        fetch('/api/config-alertas'),
      ])
      const [gData, lData, uData, aData] = await Promise.all([
        gRes.json().catch(() => []),
        lRes.json().catch(() => []),
        uRes.json().catch(() => []),
        aRes.json().catch(() => []),
      ])
      setGases(Array.isArray(gData) ? gData : [])
      setLocations(Array.isArray(lData) ? lData : [])
      setUsuarios(Array.isArray(uData) ? uData : [])
      setAlerts(Array.isArray(aData) ? aData : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  // --- Gases CRUD ---
  async function saveGas() {
    const body = { ...gasForm, presionBar: parseFloat(gasForm.presionBar) }
    try {
      const res = await fetch(`/api/gases${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: editId ? 'Gas actualizado' : 'Gas creado' })
      closeAndReload()
    } catch { toast({ title: 'Error al guardar gas', variant: 'destructive' }) }
  }

  async function deleteGas(id: string) {
    if (!confirm('¿Eliminar este gas?')) return
    try {
      const res = await fetch(`/api/gases/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Gas eliminado' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openGas(gas?: Gas) {
    if (gas) { setEditId(gas.id); setGasForm({ codigo: gas.codigo, nombre: gas.nombre, descripcion: gas.descripcion, presionBar: String(gas.presionBar), colorHex: gas.colorHex, usoPrincipal: gas.usoPrincipal, categoria: gas.categoria, peligro: gas.peligro }) }
    else { setEditId(null); setGasForm(emptyGas) }
    setDialogOpen(true)
  }

  // --- Locations CRUD ---
  async function saveLocation() {
    const body = { ...locForm, lat: parseFloat(locForm.lat), lng: parseFloat(locForm.lng) }
    try {
      const res = await fetch(`/api/locations${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: editId ? 'Ubicación actualizada' : 'Ubicación creada' })
      closeAndReload()
    } catch { toast({ title: 'Error al guardar ubicación', variant: 'destructive' }) }
  }

  async function deleteLocation(id: string) {
    if (!confirm('¿Eliminar esta ubicación?')) return
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Ubicación eliminada' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openLocation(loc?: Location) {
    if (loc) { setEditId(loc.id); setLocForm({ nombre: loc.nombre, provincia: loc.provincia, lat: String(loc.lat), lng: String(loc.lng), tipo: loc.tipo || 'BASE', esBase: loc.esBase || false, direccion: loc.direccion || '', telefono: loc.telefono || '' }) }
    else { setEditId(null); setLocForm(emptyLoc) }
    setDialogOpen(true)
  }

  // --- Usuarios CRUD ---
  async function saveUsuario() {
    if (userForm.password !== userForm.password2) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    const body: Record<string, any> = {
      nombre: userForm.nombre,
      usuario: userForm.usuario,
      direccion: userForm.direccion,
      telefono: userForm.telefono,
      ciudad: userForm.ciudad,
      provincia: userForm.provincia,
      lat: userForm.lat,
      lng: userForm.lng,
      email: userForm.email,
      nivelAcceso: userForm.nivelAcceso,
      activo: userForm.activo,
      password: userForm.password,
    }
    if (!editId) {
      if (!userForm.password) {
        toast({ title: 'La contraseña es requerida', variant: 'destructive' })
        return
      }
    }
    try {
      const res = await fetch(`/api/usuarios${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar')
      }
      toast({ title: editId ? 'Usuario actualizado' : 'Usuario creado' })
      closeAndReload()
    } catch (e: any) {
      toast({ title: e.message || 'Error al guardar usuario', variant: 'destructive' })
    }
  }

  async function deleteUsuario(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Usuario eliminado' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openUsuario(u?: any) {
    if (u) {
      setEditId(u.id)
      setUserForm({
        nombre: u.nombre || '',
        usuario: u.usuario || '',
        password: '',
        password2: '',
        direccion: u.direccion || '',
        telefono: u.telefono || '',
        ciudad: u.ciudad || '',
        provincia: u.provincia || '',
        lat: u.lat != null ? String(u.lat) : '',
        lng: u.lng != null ? String(u.lng) : '',
        email: u.email || '',
        nivelAcceso: String(u.nivelAcceso || '1'),
        activo: u.activo !== false,
      })
    } else {
      setEditId(null)
      setUserForm(emptyUsuario)
    }
    setDialogOpen(true)
  }

  // --- Alerts CRUD (usa /api/config-alertas, upsert por gasId) ---
  async function saveAlert() {
    const body = {
      gasId: alertForm.gasId,
      diasAlertaRetest: parseInt(alertForm.diasAlertaRetest),
      diasMaxCliente: parseInt(alertForm.diasMaxCliente),
      alertaPH: alertForm.alertaPH,
      activo: alertForm.activo,
    }
    try {
      const res = await fetch('/api/config-alertas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: editId ? 'Alerta actualizada' : 'Alerta creada' })
      closeAndReload()
    } catch { toast({ title: 'Error al guardar alerta', variant: 'destructive' }) }
  }

  async function deleteAlert(id: string) {
    if (!confirm('¿Eliminar esta configuración de alerta?')) return
    try {
      const res = await fetch(`/api/config-alertas/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Alerta eliminada' })
      loadAll()
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  function openAlert(alert?: any) {
    if (alert) { setEditId(alert.id); setAlertForm({ gasId: alert.gasId, diasAlertaRetest: String(alert.diasAlertaRetest), diasMaxCliente: String(alert.diasMaxCliente), alertaPH: alert.alertaPH, activo: alert.activo }) }
    else { setEditId(null); setAlertForm(emptyAlert) }
    setDialogOpen(true)
  }

  function closeAndReload() {
    setDialogOpen(false)
    setEditId(null)
    loadAll()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5 text-orange-500" />
        Tablas de Referencia
      </h2>

      {/* Pestañas de tablas */}
      <div className="flex gap-1 border-b pb-1">
        {TABLAS_DISPONIBLES.map(t => (
          <button key={t.key}
            onClick={() => { setTablaActiva(t.key); setDialogOpen(false) }}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${tablaActiva === t.key ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <>
          {/* Gases */}
          {tablaActiva === 'gases' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openGas()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nuevo Gas
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Presión (Bar)</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Peligro</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gases.map(g => (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-xs font-semibold">{g.codigo}</TableCell>
                        <TableCell className="text-sm">{g.nombre}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded border" style={{ background: g.colorHex }} />
                            <span className="text-[10px] text-slate-400">{g.colorHex}</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">{g.presionBar}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{g.categoria}</Badge></TableCell>
                        <TableCell><SgaBadge peligro={g.peligro} /></TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openGas(g)}>
                              <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteGas(g.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Locations */}
          {tablaActiva === 'locations' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openLocation()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nueva Ubicación
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Lat</TableHead>
                      <TableHead>Lng</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map(loc => (
                      <TableRow key={loc.id}>
                        <TableCell className="text-sm font-medium">{loc.nombre}</TableCell>
                        <TableCell className="text-xs">{loc.provincia}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{loc.tipo}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{loc.lat}</TableCell>
                        <TableCell className="font-mono text-xs">{loc.lng}</TableCell>
                        <TableCell>{loc.esBase ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : '—'}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLocation(loc)}>
                              <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteLocation(loc.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Usuarios */}
          {tablaActiva === 'usuarios' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openUsuario()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nuevo Usuario
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead className="text-center">Nivel</TableHead>
                      <TableHead className="text-center">Activo</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs font-semibold">{u.usuario}</TableCell>
                        <TableCell className="text-sm">{u.nombre}</TableCell>
                        <TableCell className="text-xs">{u.email || '—'}</TableCell>
                        <TableCell className="text-xs">{u.ciudad || '—'}</TableCell>
                        <TableCell className="text-xs">{u.provincia || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.nivelAcceso >= 4 ? 'default' : 'outline'} className="text-[10px]">
                            {u.nivelAcceso}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{u.activo ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : <Badge className="bg-red-100 text-red-700 text-[10px]">No</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openUsuario(u)}>
                              <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteUsuario(u.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* AlertConfig */}
          {tablaActiva === 'alertconfig' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => openAlert()} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Plus className="w-4 h-4" /> Nueva Alerta
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gas</TableHead>
                      <TableHead className="text-right">Días Alerta Retest</TableHead>
                      <TableHead className="text-right">Días Max Cliente</TableHead>
                      <TableHead className="text-center">Alerta PH</TableHead>
                      <TableHead className="text-center">Activo</TableHead>
                      <TableHead className="text-center w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map(a => {
                      const gas = gases.find(g => g.id === a.gasId)
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: gas?.colorHex || '#ccc' }} />
                              <span className="text-sm">{gas?.nombre || a.gasId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{a.diasAlertaRetest}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{a.diasMaxCliente}</TableCell>
                          <TableCell className="text-center">{a.alertaPH ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : '—'}</TableCell>
                          <TableCell className="text-center">{a.activo ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Sí</Badge> : <Badge className="bg-red-100 text-red-700 text-[10px]">No</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAlert(a)}>
                                <Pencil className="w-3.5 h-3.5 text-sky-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteAlert(a.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog: formulario dinámico según tabla activa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-w-lg ${tablaActiva === 'gases' ? '' : 'max-w-md'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editId ? 'Editar' : 'Nuevo'} {TABLAS_DISPONIBLES.find(t => t.key === tablaActiva)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tablaActiva === 'gases' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Código</Label><Input value={gasForm.codigo} onChange={e => setGasForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: N2" /></div>
                  <div><Label>Nombre</Label><Input value={gasForm.nombre} onChange={e => setGasForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nitrógeno" /></div>
                </div>
                <div><Label>Descripción</Label><Input value={gasForm.descripcion} onChange={e => setGasForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Presión (Bar)</Label><Input type="number" value={gasForm.presionBar} onChange={e => setGasForm(f => ({ ...f, presionBar: e.target.value }))} /></div>
                  <div><Label>Color Hex</Label><div className="flex gap-2 items-center"><Input value={gasForm.colorHex} onChange={e => setGasForm(f => ({ ...f, colorHex: e.target.value }))} /><input type="color" value={gasForm.colorHex} onChange={e => setGasForm(f => ({ ...f, colorHex: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" /></div></div>
                  <div><Label>Categoría</Label><Select value={gasForm.categoria} onValueChange={v => setGasForm(f => ({ ...f, categoria: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alta Presión">Alta Presión</SelectItem><SelectItem value="Baja Presión">Baja Presión</SelectItem><SelectItem value="Disuelto">Disuelto</SelectItem><SelectItem value="Líquido Criogénico">Líquido Criogénico</SelectItem><SelectItem value="Mezcla">Mezcla</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Uso Principal</Label><Input value={gasForm.usoPrincipal} onChange={e => setGasForm(f => ({ ...f, usoPrincipal: e.target.value }))} /></div>
                  <div><Label>Peligro SGA</Label><Select value={gasForm.peligro} onValueChange={v => setGasForm(f => ({ ...f, peligro: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INFLAMABLE">Inflamable</SelectItem><SelectItem value="COMBURENTE">Comburente</SelectItem><SelectItem value="GAS_PRESION">Gas a Presión</SelectItem><SelectItem value="NINGUNO">Sin Riesgo</SelectItem></SelectContent></Select></div>
                </div>
              </>
            )}
            {tablaActiva === 'locations' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre</Label><Input value={locForm.nombre} onChange={e => setLocForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Base Central" /></div>
                  <div><Label>Provincia</Label><Input value={locForm.provincia} onChange={e => setLocForm(f => ({ ...f, provincia: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Latitud</Label><Input type="number" step="any" value={locForm.lat} onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))} /></div>
                  <div><Label>Longitud</Label><Input type="number" step="any" value={locForm.lng} onChange={e => setLocForm(f => ({ ...f, lng: e.target.value }))} /></div>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  {locForm.lat && locForm.lng && !isNaN(parseFloat(locForm.lat)) && !isNaN(parseFloat(locForm.lng)) ? (
                    <LocationPicker
                      lat={parseFloat(locForm.lat)}
                      lng={parseFloat(locForm.lng)}
                      onChange={(lat, lng) => setLocForm(f => ({ ...f, lat: String(lat), lng: String(lng) }))}
                    />
                  ) : (
                    <div className="h-[250px] flex items-center justify-center bg-slate-50 text-slate-400 text-sm rounded-lg">
                      Ingresá latitud y longitud para ver el mapa
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label><Select value={locForm.tipo} onValueChange={v => setLocForm(f => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BASE">Base</SelectItem><SelectItem value="CLIENTE">Cliente</SelectItem><SelectItem value="SUCURSAL">Sucursal</SelectItem><SelectItem value="ALIADO">Aliado</SelectItem></SelectContent></Select></div>
                  <div className="flex items-end pb-2">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={locForm.esBase} onChange={e => setLocForm(f => ({ ...f, esBase: e.target.checked }))} className="rounded" />
                      Es Base
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Dirección</Label><Input value={locForm.direccion} onChange={e => setLocForm(f => ({ ...f, direccion: e.target.value }))} /></div>
                  <div><Label>Teléfono</Label><Input value={locForm.telefono} onChange={e => setLocForm(f => ({ ...f, telefono: e.target.value }))} /></div>
                </div>
              </>
            )}
            {tablaActiva === 'usuarios' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre</Label><Input value={userForm.nombre} onChange={e => setUserForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" /></div>
                  <div><Label>Usuario</Label><Input value={userForm.usuario} onChange={e => setUserForm(f => ({ ...f, usuario: e.target.value }))} placeholder="nombre de usuario" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contraseña {editId ? '(dejar vacío para no cambiar)' : '*'}</Label>
                    <Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                  </div>
                  <div>
                    <Label>Confirmar contraseña</Label>
                    <Input type="password" value={userForm.password2} onChange={e => setUserForm(f => ({ ...f, password2: e.target.value }))} placeholder="••••••••" className={userForm.password && userForm.password !== userForm.password2 ? 'border-red-400' : ''} />
                  </div>
                </div>
                {userForm.password && userForm.password !== userForm.password2 && (
                  <div className="text-xs text-red-500">Las contraseñas no coinciden</div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ejemplo.com" /></div>
                  <div><Label>Teléfono</Label><Input value={userForm.telefono} onChange={e => setUserForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+54 336 4567890" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Dirección</Label><Input value={userForm.direccion} onChange={e => setUserForm(f => ({ ...f, direccion: e.target.value }))} /></div>
                  <div><Label>Ciudad</Label><Input value={userForm.ciudad} onChange={e => setUserForm(f => ({ ...f, ciudad: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Provincia</Label><Input value={userForm.provincia} onChange={e => setUserForm(f => ({ ...f, provincia: e.target.value }))} /></div>
                  <div><Label>Nivel de Acceso (1-5)</Label><Input type="number" min={1} max={5} value={userForm.nivelAcceso} onChange={e => setUserForm(f => ({ ...f, nivelAcceso: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Latitud</Label><Input type="number" step="any" value={userForm.lat} onChange={e => setUserForm(f => ({ ...f, lat: e.target.value }))} /></div>
                  <div><Label>Longitud</Label><Input type="number" step="any" value={userForm.lng} onChange={e => setUserForm(f => ({ ...f, lng: e.target.value }))} /></div>
                </div>
                <div>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={userForm.activo} onChange={e => setUserForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                    Activo
                  </Label>
                </div>
              </>
            )}
            {tablaActiva === 'alertconfig' && (
              <>
                <div><Label>Gas</Label><Select value={alertForm.gasId} onValueChange={v => setAlertForm(f => ({ ...f, gasId: v }))}><SelectTrigger><SelectValue placeholder="Seleccionar gas" /></SelectTrigger><SelectContent>{gases.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Días Alerta Retest</Label><Input type="number" value={alertForm.diasAlertaRetest} onChange={e => setAlertForm(f => ({ ...f, diasAlertaRetest: e.target.value }))} /></div>
                  <div><Label>Días Max Cliente</Label><Input type="number" value={alertForm.diasMaxCliente} onChange={e => setAlertForm(f => ({ ...f, diasMaxCliente: e.target.value }))} /></div>
                </div>
                <div className="flex items-center gap-6">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={alertForm.alertaPH} onChange={e => setAlertForm(f => ({ ...f, alertaPH: e.target.checked }))} className="rounded" />
                    Alerta PH
                  </Label>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={alertForm.activo} onChange={e => setAlertForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                    Activo
                  </Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
            <Button onClick={() => {
              if (tablaActiva === 'gases') saveGas()
              else if (tablaActiva === 'locations') saveLocation()
              else if (tablaActiva === 'usuarios') saveUsuario()
              else saveAlert()
            }}
              className="bg-gradient-to-r from-orange-500 to-red-600">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
