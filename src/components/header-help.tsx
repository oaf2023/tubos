'use client'

import { useState } from 'react'
import { BookOpen, CircleHelp, ExternalLink, Loader2, Search, Keyboard } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function HeaderHelp() {
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) setLoaded(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="relative text-slate-400 hover:text-orange-500 transition-colors group"
          title="Manual de usuario"
        >
          <CircleHelp className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-slate-200/80"
        showCloseButton={false}
      >
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shrink-0">
          <div className="flex items-center justify-between px-5 py-3">
            <DialogTitle className="text-sm font-bold flex items-center gap-2.5">
              <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm">Manual de Usuario</span>
                <span className="text-[10px] text-orange-100/80 block font-normal leading-tight">
                  Control Digital · GasTrack AR
                </span>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => window.open('/manual.html', '_blank')}
                className="text-[11px] text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-all px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Abrir en pestaña</span>
              </button>
              <DialogClose className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-all p-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="sr-only">Cerrar</span>
              </DialogClose>
            </div>
          </div>
          {/* Barra de acceso rápido */}
          <div className="px-5 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-orange-100/70">
              <span className="flex items-center gap-1"><Search className="w-3 h-3" /> Buscar temas</span>
              <span className="hidden sm:flex items-center gap-1"><Keyboard className="w-3 h-3" /> Ctrl+F</span>
            </div>
            <span className="text-[10px] text-orange-100/50">Actualizado 2026</span>
          </div>
        </div>

        {/* Cuerpo: iframe con loader */}
        <div className="flex-1 relative bg-white">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium">Cargando manual...</p>
              </div>
            </div>
          )}
          <iframe
            src="/manual.html"
            className={`w-full h-full border-none transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            title="Manual de Usuario"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
