'use client'

import { CircleHelp, ExternalLink } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function HeaderHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="text-slate-400 hover:text-orange-500 transition-colors"
          title="Manual de usuario"
        >
          <CircleHelp className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0" showCloseButton={false}>
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <DialogTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <CircleHelp className="w-4 h-4 text-orange-500" />
            Manual de Usuario — Control Digital
          </DialogTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/manual.html', '_blank')}
              className="text-xs text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1"
              title="Abrir en nueva pestaña"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Nueva pestaña</span>
            </button>
            <DialogClose className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </div>
        </div>
        <iframe src="/manual.html" className="w-full flex-1 border-none" title="Manual de Usuario" />
      </DialogContent>
    </Dialog>
  )
}
