'use client'

import dynamic from 'next/dynamic'
import { Component, useEffect, useState } from 'react'

class TabErrorBoundary extends Component<{ children: React.ReactNode; name: string }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: any) { console.error(`Error in ${this.props.name}:`, error, info) }
  render() {
    if (this.state.error) {
      return <div className="p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
        <h3 className="font-bold mb-2">Error en {this.props.name}</h3>
        <pre className="text-sm whitespace-pre-wrap">{this.state.error.message}</pre>
      </div>
    }
    return this.props.children
  }
}
import {
  Activity,
  Map as MapIcon,
  Package,
  Route as RouteIcon,
  BookOpen,
  Factory,
  MapPin,
  Truck,
  Users,
  Beaker,
  Settings2,
  ShoppingCart,
  Receipt,
  ClipboardList,
  Wrench,
  FileText,
  Printer,
  Eye,
  RefreshCw,
  Warehouse,
  ScanLine,
  BarChart3,
  Wallet,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/toaster'
import HeaderClock from '@/components/header-clock'
import HeaderWeather from '@/components/header-weather'
import HeaderHelp from '@/components/header-help'
import HeaderInstall from '@/components/header-install'

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

const LoginPage = dynamic(() => import('@/components/login-page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
    </div>
  ),
})

const DashboardTab = dynamic(() => import('@/components/dashboard-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const MapaTab = dynamic(() => import('@/components/mapa-tab'), { ssr: false, loading: () => <Skeleton className="h-[600px] rounded-xl" /> })
const InventarioTab = dynamic(() => import('@/components/inventario-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const RutasTab = dynamic(() => import('@/components/rutas-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const CatalogoTab = dynamic(() => import('@/components/catalogo-tab'), { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> })
const ClientesTab = dynamic(() => import('@/components/clientes-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const LaboratorioTab = dynamic(() => import('@/components/laboratorio-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const ConfiguracionTab = dynamic(() => import('@/components/configuracion-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const PedidosTab = dynamic(() => import('@/components/pedidos-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const FacturacionTab = dynamic(() => import('@/components/facturacion-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const RemitosTab = dynamic(() => import('@/components/remitos-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const MantenimientoTab = dynamic(() => import('@/components/mantenimiento-tab'), { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> })
const TablasTab = dynamic(() => import('@/components/tablas-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const ReportesTab = dynamic(() => import('@/components/reportes-tab'), { ssr: false, loading: () => <Skeleton className="h-[600px] rounded-xl" /> })
const ObservacionesTab = dynamic(() => import('@/components/observaciones-tab'), { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> })
const VehiculosTab = dynamic(() => import('@/components/vehiculos-tab'), { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> })
const LogisticaTab = dynamic(() => import('@/components/logistica-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const DepositoTab = dynamic(() => import('@/components/deposito-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const CabinaTab = dynamic(() => import('@/components/cabina-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const FinanzasTab = dynamic(() => import('@/components/finanzas-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const AnalisisTab = dynamic(() => import('@/components/analisis-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const TableroTab = dynamic(() => import('@/components/tablero-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })
const ClientePedidoTab = dynamic(() => import('@/components/cliente-pedido-tab'), { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> })

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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
    sessionStorage.removeItem('opencode_user')
  }

  if (!authReady) return null

  if (!user) {
    return <LoginPage onLogin={(u) => { setUser(u); sessionStorage.setItem('opencode_user', JSON.stringify(u)) }} />
  }

  const esCliente = user.tipo === 'cliente'

  if (esCliente) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Control Digital
                </h1>
                <p className="text-xs text-slate-500">Portal de Clientes</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <HeaderClock />
              <HeaderWeather />
              <HeaderHelp />
              <HeaderInstall />
              <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                {user.nombre}
              </Badge>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                title="Cerrar sesión"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <ClientePedidoTab clienteId={user.clienteId} clienteNombre={user.nombre} />
        </main>
        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
            Control Digital · Portal de Clientes · ManejaDatos Districon · San Nicolás de los Arroyos (Buenos Aires)
          </div>
        </footer>
        <Toaster />
      </div>
    )
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
            <TabsTrigger value="vehiculos" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Truck className="w-4 h-4" /><span>Vehículos</span>
            </TabsTrigger>
            <TabsTrigger value="logistica" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Package className="w-4 h-4" /><span>Logística</span>
            </TabsTrigger>
            <TabsTrigger value="deposito" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Warehouse className="w-4 h-4" /><span>Depósito</span>
            </TabsTrigger>
            <TabsTrigger value="cabina" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <ScanLine className="w-4 h-4" /><span>Cabina</span>
            </TabsTrigger>
            <TabsTrigger value="finanzas" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <Wallet className="w-4 h-4" /><span>Finanzas</span>
            </TabsTrigger>
            <TabsTrigger value="analisis" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4" /><span>Análisis</span>
            </TabsTrigger>
            <TabsTrigger value="tablero" className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4" /><span>Tablero</span>
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
          <TabsContent value="vehiculos">
            <VehiculosTab />
          </TabsContent>
          <TabsContent value="logistica">
            <LogisticaTab />
          </TabsContent>
          <TabsContent value="deposito">
            <DepositoTab />
          </TabsContent>
          <TabsContent value="cabina">
            <CabinaTab />
          </TabsContent>
          <TabsContent value="finanzas">
            <TabErrorBoundary name="Finanzas">
              <FinanzasTab />
            </TabErrorBoundary>
          </TabsContent>
          <TabsContent value="analisis">
            <AnalisisTab />
          </TabsContent>
          <TabsContent value="tablero">
            <TableroTab />
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
        <div className="flex items-center gap-1 sm:gap-2">
          <HeaderClock />
          <HeaderWeather />
          <HeaderHelp />
          <HeaderInstall />
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
