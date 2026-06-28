'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Monitor, Smartphone, Tablet, X, CheckCircle2 } from 'lucide-react'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''
const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='

type Platform = 'pc' | 'android' | 'iphone'

export default function HeaderInstall() {
  const [open, setOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [tab, setTab] = useState<Platform>('pc')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => setInstalled(true)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setInstalled(true)
      setDeferredPrompt(null)
    }
  }

  const platforms: { key: Platform; label: string; icon: typeof Monitor }[] = [
    { key: 'pc', label: 'PC / Windows', icon: Monitor },
    { key: 'android', label: 'Android', icon: Smartphone },
    { key: 'iphone', label: 'iPhone / iOS', icon: Tablet },
  ]

  if (installed) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-slate-400 hover:text-orange-500 transition-colors"
        title="Instalar aplicación"
      >
        <Download className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Instalar aplicación</h3>
                <p className="text-[10px] text-slate-500">Escaneá el QR desde tu celular</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-200">
              {platforms.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    tab === key ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 px-4 py-5">
              <img
                src={`${QR_API}${encodeURIComponent(APP_URL)}&size=300x300`}
                alt="QR"
                className="w-52 h-52 rounded-xl border border-slate-200 shadow-sm"
              />

              {tab === 'pc' && (
                <>
                  <p className="text-[11px] text-slate-500 text-center leading-relaxed">Escaneá con el celular o instalá directo</p>
                  {deferredPrompt ? (
                    <button onClick={handleInstall} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                      <Download className="w-3.5 h-3.5" />
                      Instalar en PC
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-500 text-[11px] rounded-lg border border-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Ya instalado
                    </div>
                  )}
                </>
              )}

              {tab === 'android' && (
                <>
                  <p className="text-[11px] text-slate-500 text-center leading-relaxed">Escané con la cámara o seguí estos pasos</p>
                  <ol className="text-[10px] text-slate-600 space-y-1 list-decimal pl-4 w-full max-w-[260px]">
                    <li>Abrí la URL en <strong>Chrome</strong></li>
                    <li>Tocá el menú <strong>⋮</strong> → <strong>"Instalar aplicación"</strong></li>
                  </ol>
                  {deferredPrompt && (
                    <button onClick={handleInstall} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                      <Download className="w-3.5 h-3.5" />
                      Instalar ahora
                    </button>
                  )}
                </>
              )}

              {tab === 'iphone' && (
                <>
                  <p className="text-[11px] text-slate-500 text-center leading-relaxed">Escané con la cámara o seguí estos pasos</p>
                  <ol className="text-[10px] text-slate-600 space-y-1 list-decimal pl-4 w-full max-w-[260px]">
                    <li>Abrí la URL en <strong>Safari</strong></li>
                    <li>Tocá <strong>Compartir</strong> → <strong>"Agregar a pantalla de inicio"</strong></li>
                  </ol>
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 text-[10px] rounded-lg border border-amber-200 w-full max-w-[260px]">
                    ⚠️ iPhone requiere Safari
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
