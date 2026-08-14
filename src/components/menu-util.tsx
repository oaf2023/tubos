'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, ClipboardList, FileText, Barcode, History, Users, ShoppingCart, Download, Printer, X,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const MENU_ITEMS = [
  { id: 'remitos', icon: ClipboardList, label: 'Entrega/Remitos', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700', action: 'tab', tab: 'remitos' },
  { id: 'comprobantes', icon: FileText, label: 'Comprobantes', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700', action: 'tab', tab: 'comprobantes' },
  { id: 'impresion-cb', icon: Barcode, label: 'Impresión CB', color: 'bg-teal-50 hover:bg-teal-100 text-teal-700', action: 'dialog' },
  { id: 'historicos', icon: History, label: 'Históricos', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700', action: 'dialog' },
  { id: 'clientes', icon: Users, label: 'Clientes', color: 'bg-green-50 hover:bg-green-100 text-green-700', action: 'tab', tab: 'clientes' },
  { id: 'pedidos', icon: ShoppingCart, label: 'Pedidos', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700', action: 'tab', tab: 'pedidos' },
  { id: 'descargas', icon: Download, label: 'Descargas', color: 'bg-rose-50 hover:bg-rose-100 text-rose-700', action: 'link', link: '/descargas' },
  { id: 'reportes', icon: Printer, label: 'Reportes', color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700', action: 'tab', tab: 'reportes' },
] as const

type UtilItem = typeof MENU_ITEMS[number]
type UtilId = UtilItem['id']

const MODULES: Record<string, { path: string; title: string; size: string }> = {
  'impresion-cb': { path: './floating-utils/impresion-cb', title: 'Impresión de CB', size: 'sm:max-w-md' },
  historicos: { path: './comprobantes-historicos', title: 'Consulta de Históricos', size: 'sm:max-w-4xl' },
}

function UtilDialog({ utilId, onClose }: { utilId: UtilId | null; onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    if (!utilId) return
    const load = async () => {
      try {
        const mod = await import(MODULES[utilId].path)
        setComp(() => mod.default)
      } catch { setComp(null) }
    }
    load()
  }, [utilId])

  const meta = utilId ? MODULES[utilId] : null

  return (
    <Dialog open={!!utilId} onOpenChange={open => !open && onClose()}>
      <DialogContent className={`w-[95vw] rounded-2xl ${meta?.size || 'sm:max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-lg">{meta?.title || ''}</DialogTitle>
        </DialogHeader>
        {Comp ? (
          <div className={utilId === 'historicos' ? 'max-h-[75vh] overflow-y-auto -mx-6 px-6' : ''}>
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
  const [activeUtil, setActiveUtil] = useState<UtilId | null>(null)
  const [visible, setVisible] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => {
      const saved = sessionStorage.getItem('opencode_user')
      setVisible(!!saved)
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

  function handleClick(item: UtilItem) {
    setOpen(false)
    if (item.action === 'tab') {
      window.dispatchEvent(new CustomEvent('menu-util:nav', { detail: item.tab }))
    } else if (item.action === 'dialog') {
      setActiveUtil(item.id)
    } else if (item.action === 'link') {
      router.push(item.link)
    }
  }

  if (!visible) return null

  return (
    <>
      <div className="fixed bottom-40 right-4 sm:bottom-40 sm:right-6 z-50" ref={menuRef}>
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
          <span className="hidden sm:inline">Menú Útil</span>
          <span className="inline sm:hidden text-xs">Útil</span>
        </button>

        {open && (
          <div
            className={`
              absolute bottom-full right-0 mb-3
              w-56 sm:w-72
              bg-white rounded-2xl shadow-xl border border-slate-200
              overflow-hidden
              animate-in slide-in-from-bottom-2 fade-in
              duration-150
            `}
          >
            <div className="p-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-400 px-2 py-1">Menú Útil</p>
            </div>
            <div className="p-2 grid grid-cols-2 gap-1">
              {MENU_ITEMS.map(item => {
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

      <UtilDialog utilId={activeUtil} onClose={() => setActiveUtil(null)} />
    </>
  )
}