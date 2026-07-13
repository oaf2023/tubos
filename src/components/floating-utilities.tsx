'use client'

import { useEffect, useState, useRef } from 'react'
import {
  LayoutGrid, Calculator, StickyNote, Navigation, Calendar,
  ArrowLeftRight, CheckSquare, FolderOpen, X,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const MENU_ITEMS = [
  { id: 'calc', icon: Calculator, label: 'Calculadora', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
  { id: 'notas', icon: StickyNote, label: 'Bloc de Notas', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
  { id: 'navegar', icon: Navigation, label: 'Navegar', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
  { id: 'calendario', icon: Calendar, label: 'Calendario', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
  { id: 'conversor', icon: ArrowLeftRight, label: 'Conversor', color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700' },
  { id: 'todos', icon: CheckSquare, label: 'Recordatorios', color: 'bg-rose-50 hover:bg-rose-100 text-rose-700' },
  { id: 'explorador', icon: FolderOpen, label: 'Explorador', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' },
] as const

type UtilId = typeof MENU_ITEMS[number]['id']

function UtilDialog({ utilId, onClose }: { utilId: UtilId | null; onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    if (!utilId) return
    const load = async () => {
      try {
        const mod = await import(`./floating-utils/${utilId}`)
        setComp(() => mod.default)
      } catch { setComp(null) }
    }
    load()
  }, [utilId])

  const labels: Record<string, string> = {
    calc: 'Calculadora',
    notas: 'Bloc de Notas',
    navegar: 'Navegar',
    calendario: 'Calendario',
    conversor: 'Conversor',
    todos: 'Recordatorios',
    explorador: 'Explorador de Archivos',
  }

  const sizes: Record<string, string> = {
    calc: 'sm:max-w-sm',
    notas: 'sm:max-w-lg',
    navegar: 'sm:max-w-md',
    calendario: 'sm:max-w-sm',
    conversor: 'sm:max-w-sm',
    todos: 'sm:max-w-md',
    explorador: 'sm:max-w-xl',
  }

  return (
    <Dialog open={!!utilId} onOpenChange={open => !open && onClose()}>
      <DialogContent className={`w-[95vw] rounded-2xl ${sizes[utilId || 'calc'] || 'sm:max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-lg">{utilId ? labels[utilId] : ''}</DialogTitle>
        </DialogHeader>
        {Comp ? <Comp /> : (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Cargando...</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function FloatingUtilities() {
  const [open, setOpen] = useState(false)
  const [activeUtil, setActiveUtil] = useState<UtilId | null>(null)
  const [authed, setAuthed] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('opencode_user')
    setAuthed(!!saved)
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

  // Escuchar cambios de usuario (login/logout)
  useEffect(() => {
    const check = () => {
      const saved = sessionStorage.getItem('opencode_user')
      setAuthed(!!saved)
    }
    window.addEventListener('storage', check)
    const orig = Storage.prototype.setItem
    // eslint-disable-next-line @typescript-eslint/unbound-method
    Storage.prototype.setItem = function (k, v) {
      orig.call(this, k, v)
      if (k === 'opencode_user') check()
    }
    return () => { window.removeEventListener('storage', check) }
  }, [])

  if (!authed) return null

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50" ref={menuRef}>
        <button
          onClick={() => setOpen(o => !o)}
          className={`
            flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3
            rounded-2xl shadow-lg border border-amber-200
            bg-amber-50 text-amber-800
            hover:bg-amber-100 hover:shadow-xl
            active:scale-95
            transition-all duration-200
            text-sm sm:text-base font-medium
            touch-manipulation select-none
            ${open ? 'bg-amber-100 shadow-xl ring-2 ring-amber-300' : ''}
          `}
          aria-label="Utilidades"
        >
          {open ? (
            <X className="w-5 h-5 sm:w-5 sm:h-5" />
          ) : (
            <LayoutGrid className="w-5 h-5 sm:w-5 sm:h-5" />
          )}
          <span className="hidden sm:inline">Utilidades</span>
          <span className="inline sm:hidden text-xs">Utils</span>
        </button>

        {/* Menu dropdown */}
        {open && (
          <div
            className={`
              absolute bottom-full right-0 mb-3
              w-56 sm:w-64
              bg-white rounded-2xl shadow-xl border border-slate-200
              overflow-hidden
              animate-in slide-in-from-bottom-2 fade-in
              duration-150
            `}
          >
            <div className="p-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-400 px-2 py-1">Utilidades</p>
            </div>
            <div className="p-2 grid grid-cols-2 gap-1">
              {MENU_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveUtil(item.id); setOpen(false) }}
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

      {/* Utility dialog */}
      <UtilDialog utilId={activeUtil} onClose={() => setActiveUtil(null)} />
    </>
  )
}
