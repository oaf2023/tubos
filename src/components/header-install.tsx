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
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800">Instalar aplicación</h3>
                <p className="text-xs text-slate-500 mt-0.5">Elegí tu plataforma</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200">
              {platforms.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                    tab === key ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'pc' && (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={`${QR_API}${encodeURIComponent(APP_URL)}&size=200x200`}
                    alt="QR para PC"
                    className="w-44 h-44 rounded-xl border border-slate-200"
                  />
                  <p className="text-xs text-slate-500 text-center">Escaneá el código QR o instalá directamente</p>
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstall}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-4 h-4" />
                      Instalar en PC
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-500 text-sm rounded-lg border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Ya instalado o abrí desde Chrome/Edge
                    </div>
                  )}
                </div>
              )}

              {tab === 'android' && (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={`${QR_API}${encodeURIComponent(APP_URL)}&size=200x200`}
                    alt="QR para Android"
                    className="w-44 h-44 rounded-xl border border-slate-200"
                  />
                  <p className="text-xs text-slate-500 text-center">Escaneá con la cámara o abrí en Chrome</p>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 w-full">
                    <li>Abrí la URL en <strong>Chrome</strong></li>
                    <li>Tocá el menú ⋮ (tres puntos)</li>
                    <li>Seleccioná <strong>"Instalar aplicación"</strong></li>
                    <li>O escaneá el QR desde otro dispositivo</li>
                  </ol>
                  {deferredPrompt && (
                    <button
                      onClick={handleInstall}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-4 h-4" />
                      Instalar ahora
                    </button>
                  )}
                </div>
              )}

              {tab === 'iphone' && (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={`${QR_API}${encodeURIComponent(APP_URL)}&size=200x200`}
                    alt="QR para iPhone"
                    className="w-44 h-44 rounded-xl border border-slate-200"
                  />
                  <p className="text-xs text-slate-500 text-center">Escaneá con la cámara o seguí estos pasos</p>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 w-full">
                    <li>Abrí la URL en <strong>Safari</strong></li>
                    <li>Tocá el botón <strong>Compartir</strong> 􀈂</li>
                    <li>Desplazate y seleccioná <strong>"Agregar a pantalla de inicio"</strong></li>
                    <li>Personalizá el nombre y tocá <strong>"Agregar"</strong></li>
                  </ol>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-200 w-full">
                    ⚠️ iPhone requiere Safari para instalar PWAs
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
