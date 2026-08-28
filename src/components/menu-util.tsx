'use client'

import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, ClipboardList, FileText, Barcode, History, Users, ShoppingCart, Download, Printer, X, LayoutDashboard,
  Calculator, StickyNote, Navigation, Calendar, ArrowLeftRight, CheckSquare, FolderOpen, CloudSun,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const NAV_ITEMS = [
  { id: 'remitos', icon: ClipboardList, label: 'Entrega/Remitos', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700', action: 'tab', tab: 'remitos' },
  { id: 'comprobantes', icon: FileText, label: 'Comprobantes', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700', action: 'tab', tab: 'comprobantes' },
  { id: 'impresion-cb', icon: Barcode, label: 'Impresión CB', color: 'bg-teal-50 hover:bg-teal-100 text-teal-700', action: 'dialog' },
  { id: 'historicos', icon: History, label: 'Históricos', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700', action: 'dialog' },
  { id: 'clientes', icon: Users, label: 'Clientes', color: 'bg-green-50 hover:bg-green-100 text-green-700', action: 'tab', tab: 'clientes' },
  { id: 'pedidos', icon: ShoppingCart, label: 'Pedidos', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700', action: 'tab', tab: 'pedidos' },
  { id: 'descargas', icon: Download, label: 'Descargas', color: 'bg-rose-50 hover:bg-rose-100 text-rose-700', action: 'link', link: '/descargas' },
  { id: 'reportes', icon: Printer, label: 'Reportes', color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700', action: 'tab', tab: 'reportes' },
  { id: 'grafana', icon: LayoutDashboard, label: 'Dashboards', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700', action: 'dialog' },
] as const

const TOOL_ITEMS = [
  { id: 'calc', icon: Calculator, label: 'Calculadora', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700', action: 'dialog' },
  { id: 'notas', icon: StickyNote, label: 'Bloc de Notas', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700', action: 'dialog' },
  { id: 'navegar', icon: Navigation, label: 'Navegar', color: 'bg-green-50 hover:bg-green-100 text-green-700', action: 'dialog' },
  { id: 'calendario', icon: Calendar, label: 'Calendario', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700', action: 'dialog' },
  { id: 'conversor', icon: ArrowLeftRight, label: 'Conversor', color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700', action: 'dialog' },
  { id: 'todos', icon: CheckSquare, label: 'Recordatorios', color: 'bg-rose-50 hover:bg-rose-100 text-rose-700', action: 'dialog' },
  { id: 'explorador', icon: FolderOpen, label: 'Explorador', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700', action: 'dialog' },
  { id: 'clima-hist', icon: CloudSun, label: 'Clima Hist.', color: 'bg-sky-50 hover:bg-sky-100 text-sky-700', action: 'dialog' },
] as const

type NavItem = typeof NAV_ITEMS[number]
type ToolItem = typeof TOOL_ITEMS[number]
type AnyItem = NavItem | ToolItem
type DialogId = NavItem['id'] | ToolItem['id']

const MODULES: Record<string, { path: string; title: string; size: string }> = {
  'impresion-cb': { path: './floating-utils/impresion-cb', title: 'Impresión de CB', size: 'sm:max-w-md' },
  historicos: { path: './comprobantes-historicos', title: 'Consulta de Históricos', size: 'sm:max-w-4xl' },
  grafana: { path: './grafana-dashboard', title: 'Dashboards Grafana', size: 'sm:max-w-6xl' },
  calc: { path: './floating-utils/calc', title: 'Calculadora', size: 'sm:max-w-sm' },
  notas: { path: './floating-utils/notas', title: 'Bloc de Notas', size: 'sm:max-w-lg' },
  navegar: { path: './floating-utils/navegar', title: 'Navegar', size: 'sm:max-w-md' },
  calendario: { path: './floating-utils/calendario', title: 'Calendario', size: 'sm:max-w-sm' },
  conversor: { path: './floating-utils/conversor', title: 'Conversor', size: 'sm:max-w-sm' },
  todos: { path: './floating-utils/todos', title: 'Recordatorios', size: 'sm:max-w-md' },
  explorador: { path: './floating-utils/explorador', title: 'Explorador de Archivos', size: 'sm:max-w-xl' },
  'clima-hist': { path: './floating-utils/clima-hist', title: 'Clima Histórico', size: 'sm:max-w-2xl' },
}

const LABELS: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS.map(i => [i.id, i.label])),
  ...Object.fromEntries(TOOL_ITEMS.map(i => [i.id, i.label])),
}

function UtilDialog({ dialogId, onClose }: { dialogId: DialogId | null; onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    if (!dialogId) return
    setComp(null)
    const load = async () => {
      try {
        const mod = await import(MODULES[dialogId].path)
        setComp(() => mod.default)
      } catch { setComp(null) }
    }
    load()
  }, [dialogId])

  const meta = dialogId ? MODULES[dialogId] : null

  return (
    <Dialog open={!!dialogId} onOpenChange={open => !open && onClose()}>
      <DialogContent className={`w-[95vw] rounded-2xl ${meta?.size || 'sm:max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-lg">{dialogId ? LABELS[dialogId] || meta?.title || '' : ''}</DialogTitle>
        </DialogHeader>
        {Comp ? (
          <div className={dialogId === 'historicos' ? 'max-h-[75vh] overflow-y-auto -mx-6 px-6' : ''}>
            <Comp />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Cargando...</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function MenuUtil() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<DialogId | null>(null)
  const [visible, setVisible] = useState(false)
  const [isGerencia, setIsGerencia] = useState(false)
  const [tab, setTab] = useState<'nav' | 'tools'>('nav')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => {
      const saved = sessionStorage.getItem('opencode_user')
      setVisible(!!saved)
      if (saved) {
        const u = JSON.parse(saved)
        setIsGerencia(u.nivelAcceso === 0 && u.rol?.nombre === 'gerencia')
      }
    }
    check()
    const interval = setInterval(check, 500)
    window.addEventListener('storage', check)
    return () => { clearInterval(interval); window.removeEventListener('storage', check) }
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleClick(item: AnyItem) {
    setOpen(false)
    if (item.action === 'tab') {
      window.dispatchEvent(new CustomEvent('menu-util:nav', { detail: (item as NavItem).tab }))
    } else if (item.action === 'dialog') {
      setActiveDialog(item.id as DialogId)
    } else if (item.action === 'link') {
      router.push((item as NavItem & { link: string }).link)
    }
  }

  if (!visible) return null

  const filteredNav = NAV_ITEMS.filter(item => item.id !== 'grafana' || isGerencia)
  const currentItems = tab === 'nav' ? filteredNav : TOOL_ITEMS

  return (
    <>
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[70]" ref={menuRef}>
        <button
          onClick={() => setOpen(o => !o)}
          className={`
            flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3
            rounded-2xl shadow-lg border border-indigo-200
            bg-indigo-600 text-white
            hover:bg-indigo-700 hover:shadow-xl
            active:scale-95
            transition-all duration-200
            text-sm sm:text-base font-medium
            touch-manipulation select-none
            ${open ? 'bg-indigo-700 shadow-xl ring-2 ring-indigo-300' : ''}
          `}
          aria-label="Menú Útil"
        >
          {open ? (
            <X className="w-5 h-5 sm:w-5 sm:h-5" />
          ) : (
            <Zap className="w-5 h-5 sm:w-5 sm:h-5" />
          )}
          <span className="hidden sm:inline">Utilidades</span>
          <span className="inline sm:hidden text-xs">Utils</span>
        </button>

        {open && (
          <div
            className={`
              absolute bottom-full right-0 mb-3
              w-64 sm:w-72
              bg-white rounded-2xl shadow-xl border border-slate-200
              overflow-hidden z-[70]
              animate-in slide-in-from-bottom-2 fade-in
              duration-150
            `}
          >
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setTab('nav')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${tab === 'nav' ? 'text-indigo-700 bg-indigo-50 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Navegación
              </button>
              <button
                onClick={() => setTab('tools')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${tab === 'tools' ? 'text-indigo-700 bg-indigo-50 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Herramientas
              </button>
            </div>
            <div className="p-2 grid grid-cols-2 gap-1 max-h-[50vh] overflow-y-auto">
              {currentItems.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    className={`
                      flex flex-col items-center gap-1.5 p-3 rounded-xl
                      transition-all duration-150
                      active:scale-95 touch-manipulation
                      ${item.color}
                    `}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[11px] sm:text-xs font-medium leading-tight text-center">
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <UtilDialog dialogId={activeDialog} onClose={() => setActiveDialog(null)} />
    </>
  )
}
