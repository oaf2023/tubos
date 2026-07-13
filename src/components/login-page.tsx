'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FallingDistriconCards from '@/components/falling-districon-cards'

interface LoginPageProps {
  onLogin: (user: any) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [tab, setTab] = useState<'usuario' | 'cliente' | 'gerencia'>('usuario')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!usuario || !password) {
      setError('Completá todos los campos')
      return
    }
    setLoading(true)
    setError('')
    try {
      const endpoint = tab === 'usuario' ? '/api/auth/login' : tab === 'gerencia' ? '/api/auth/login-gerencia' : '/api/auth/login-cliente'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || (res.status === 500 ? 'Error interno del servidor' : 'Credenciales inválidas'))
        return
      }
      onLogin(data.user)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      <FallingDistriconCards />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-[calc(100%-2rem)] max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Control Digital</h1>
          <p className="text-sm text-slate-400 mt-1">ManejaDatos Districon</p>
        </div>

        <div className="bg-slate-900/85 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
          {/* Tabs */}
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => { setTab('usuario'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'usuario' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Usuarios
            </button>
            <button
              onClick={() => { setTab('cliente'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'cliente' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Clientes
            </button>
            <button
              onClick={() => { setTab('gerencia'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'gerencia' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Gerencia
            </button>
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">
            {tab === 'usuario' ? 'Acceso interno' : tab === 'gerencia' ? 'Acceso Gerencia' : 'Acceso clientes'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {tab === 'usuario' ? 'Ingresá tus credenciales de empleado' : tab === 'gerencia' ? 'Panel ejecutivo — solo personal autorizado' : 'Ingresá con tu usuario de cliente'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300 text-xs font-medium">Usuario</Label>
              <Input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder={tab === 'usuario' ? 'tu usuario' : tab === 'gerencia' ? 'usuario gerencia' : 'usuario cliente'}
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs font-medium">Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-2.5 shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>

          {tab !== 'usuario' && (
            <p className="text-center text-xs text-slate-500 mt-6">
              {tab === 'cliente' ? '¿No tenés usuario? Solicitá tus credenciales en la empresa' : 'Acceso restringido a nivel gerencial'}
            </p>
          )}
          <p className="text-center text-xs text-slate-500 mt-2">
            Sistema de Gestión de Tubos de Gas
          </p>
        </div>
      </div>
    </div>
  )
}
