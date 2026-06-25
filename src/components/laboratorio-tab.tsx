'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Truck,
  History,
  Beaker,
  Settings2,
  TrendingUp,
  Wrench,
  DollarSign,
  Gauge,
  Package,
  AlertTriangle,
  Clock,
  Search,
  MapPin,
  RefreshCw,
  ShieldAlert,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import type { Cylinder, Gas } from '@/lib/tab-types'
import { ESTADO_COLORS, ESTADO_LABELS, formatDate, daysUntil, SgaBadge } from '@/lib/tab-constants'
import { ESTADOS } from '@/lib/catalogo'

// ============================================================
// Interfaces
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

// ============================================================
// Helper components
// ============================================================
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
// 7a. CALCULADORA COSTO POR KILÓMETRO
// ============================================================
function CostoKmCalculator() {
  const [kmMensuales, setKmMensuales] = useState(10000)
  const [factorRetorno, setFactorRetorno] = useState(1)

  const [precioLitro, setPrecioLitro] = useState(1.00)
  const [rendimiento, setRendimiento] = useState(4)
  const [precioNeumatico, setPrecioNeumatico] = useState(400)
  const [cantNeumaticos, setCantNeumaticos] = useState(6)
  const [vidaNeumaticos, setVidaNeumaticos] = useState(80000)
  const [costoMantenimiento, setCostoMantenimiento] = useState(0.05)
  const [costoLubricantes, setCostoLubricantes] = useState(150)
  const [intervaloLubricantes, setIntervaloLubricantes] = useState(10000)

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
    const combustible = precioLitro / (rendimiento || 1)
    const neumaticos = (precioNeumatico * cantNeumaticos) / (vidaNeumaticos || 1)
    const mantenimiento = costoMantenimiento
    const lubricantes = costoLubricantes / (intervaloLubricantes || 1)
    const totalVariables = combustible + neumaticos + mantenimiento + lubricantes

    const salarios = sueldoBruto + cargasSociales
    const seguro = polizaSeguro
    const depreciacion = (valorCompra - valorReventa) / (mesesVida || 1)
    const impuestos = impuestosAnuales / 12
    const administrativos = gastosOficina / (cantVehiculos || 1)
    const financieros = (valorVehiculo * (tasaInteres / 100)) / (km || 1)
    const totalFijosMensuales = salarios + seguro + depreciacion + impuestos + administrativos

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
        <div className="lg:col-span-2 space-y-4">
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

        <div className="space-y-4">
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

// ============================================================
// 7b. TRAZABILIDAD DE ACTIVOS
// ============================================================
function TrazabilidadPanel() {
  const [cargando, setCargando] = useState(true)
  const [todosLosCilindros, setTodosLosCilindros] = useState<CylinderSimple[]>([])
  const [todosLosMovimientos, setTodosLosMovimientos] = useState<Movimiento[]>([])

  const [busqueda, setBusqueda] = useState('')
  const [cilindroSeleccionado, setCilindroSeleccionado] = useState<CylinderConMovimientos | null>(null)
  const [buscando, setBuscando] = useState(false)

  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [cylRes] = await Promise.all([
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

          {busqueda && !cilindroSeleccionado && !buscando && (
            <Card>
              <CardContent className="p-6 text-center text-slate-400">
                <p>No se encontró un cilindro con ese número de serie</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
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
// 7. LABORATORIO TAB (exported)
// ============================================================
export default function LaboratorioTab() {
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
