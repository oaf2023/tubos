'use client'

import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import {
  Activity, Map as MapIcon, Package, Users, LayoutGrid,
  Gauge, FileBarChart, Route as RouteIcon, BookOpen, Factory,
  Beaker, Settings2, ShoppingCart, Receipt, FileText, ClipboardList,
  Wrench, Table2, Printer, Eye, Truck, Boxes, Warehouse, Smartphone,
  ScanLine, Wallet, PieChart, TrendingUp, Layers, BarChart3,
} from 'lucide-react'

const ALL_TABS = [
  { id: 'gerencia', icon: BarChart3, label: 'Gerencia', group: 'principal', gerenciaOnly: true },
  { id: 'dashboard', icon: Activity, label: 'Dashboard', group: 'principal' },
  { id: 'dashboard-gases', icon: Gauge, label: 'Dash. Gases', group: 'principal' },
  { id: 'dashboard-articulos', icon: FileBarChart, label: 'Dash. Artículos', group: 'principal' },
  { id: 'mapa', icon: MapIcon, label: 'Mapa', group: 'principal' },
  { id: 'inventario', icon: Package, label: 'Inventario', group: 'principal' },
  { id: 'articulos', icon: Layers, label: 'Artículos', group: 'inventario' },
  { id: 'rutas', icon: RouteIcon, label: 'Rutas', group: 'logistica' },
  { id: 'catalogo', icon: BookOpen, label: 'Catálogo', group: 'ventas' },
  { id: 'proveedores', icon: Factory, label: 'Proveedores', group: 'compras' },
  { id: 'clientes', icon: Users, label: 'Clientes', group: 'ventas' },
  { id: 'laboratorio', icon: Beaker, label: 'Laboratorio', group: 'calidad' },
  { id: 'configuracion', icon: Settings2, label: 'Config.', group: 'sistema' },
  { id: 'pedidos', icon: ShoppingCart, label: 'Pedidos', group: 'ventas' },
  { id: 'facturacion', icon: Receipt, label: 'Facturación', group: 'ventas' },
  { id: 'comprobantes', icon: FileText, label: 'Comprobantes', group: 'ventas' },
  { id: 'remitos', icon: ClipboardList, label: 'Remitos', group: 'logistica' },
  { id: 'mantenimiento', icon: Wrench, label: 'Mant.', group: 'operaciones' },
  { id: 'tablas', icon: Table2, label: 'Tablas', group: 'sistema' },
  { id: 'reportes', icon: Printer, label: 'Reportes', group: 'sistema' },
  { id: 'observaciones', icon: Eye, label: 'Observ.', group: 'operaciones' },
  { id: 'vehiculos', icon: Truck, label: 'Vehículos', group: 'logistica' },
  { id: 'logistica', icon: Boxes, label: 'Logística', group: 'logistica' },
  { id: 'deposito', icon: Warehouse, label: 'Depósito', group: 'operaciones' },
  { id: 'lectura', icon: Smartphone, label: 'Lectura', group: 'operaciones' },
  { id: 'cabina', icon: ScanLine, label: 'Cabina', group: 'operaciones' },
  { id: 'finanzas', icon: Wallet, label: 'Finanzas', group: 'finanzas' },
  { id: 'analisis', icon: PieChart, label: 'Análisis', group: 'finanzas' },
  { id: 'tablero', icon: TrendingUp, label: 'Tablero', group: 'finanzas' },
] as const

const MAIN_TABS = ['dashboard', 'mapa', 'inventario', 'clientes', 'pedidos']

interface MobileBottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: any
}

export default function MobileBottomNav({ activeTab, onTabChange, user }: MobileBottomNavProps) {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!isMobile) return null

  const mainItems = ALL_TABS.filter(t => MAIN_TABS.includes(t.id))
  const extraItems = ALL_TABS.filter(t => !MAIN_TABS.includes(t.id) && (!t.gerenciaOnly || (user.nivelAcceso === 0 && user.rol?.nombre === 'gerencia')))

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {mainItems.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl
                  transition-all duration-150 min-w-0 flex-1
                  ${isActive
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : ''}`} />
                <span className="text-[10px] font-medium leading-tight truncate">{tab.label}</span>
              </button>
            )
          })}

          {/* Más button */}
          <button
            onClick={() => setSheetOpen(true)}
            className={`
              flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl
              transition-all duration-150 min-w-0 flex-1
              ${!MAIN_TABS.includes(activeTab)
                ? 'text-indigo-700 bg-indigo-50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">Más</span>
          </button>
        </div>
      </nav>

      {/* Sheet con todos los tabs */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetTitle className="text-base font-semibold mb-3">Navegación</SheetTitle>
          <div className="overflow-y-auto h-full pb-8">
            {renderGroup('Principal', extraItems.filter(t => t.group === 'principal'))}
            {renderGroup('Inventario', extraItems.filter(t => t.group === 'inventario'))}
            {renderGroup('Ventas', extraItems.filter(t => t.group === 'ventas'))}
            {renderGroup('Logística', extraItems.filter(t => t.group === 'logistica'))}
            {renderGroup('Compras', extraItems.filter(t => t.group === 'compras'))}
            {renderGroup('Operaciones', extraItems.filter(t => t.group === 'operaciones'))}
            {renderGroup('Calidad', extraItems.filter(t => t.group === 'calidad'))}
            {renderGroup('Finanzas', extraItems.filter(t => t.group === 'finanzas'))}
            {renderGroup('Sistema', extraItems.filter(t => t.group === 'sistema'))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )

  function renderGroup(title: string, items: typeof extraItems) {
    if (items.length === 0) return null
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{title}</p>
        <div className="grid grid-cols-4 gap-2">
          {items.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { onTabChange(tab.id); setSheetOpen(false) }}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-xl
                  transition-all duration-150 active:scale-95
                  ${isActive
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : ''}`} />
                <span className="text-[10px] font-medium leading-tight text-center">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
}
