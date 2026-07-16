'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Save, ShieldCheck, Trash2, Unplug } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type StoredConfig = {
  clientId: string
  redirectUri: string
  hasClientSecret: boolean
  hasAccessToken: boolean
  hasRefreshToken: boolean
  hasWebhookSecret: boolean
  tokenExpiresAt: string | null
  updatedAt: string | null
}

type SecretName = 'clientSecret' | 'accessToken' | 'refreshToken' | 'webhookSecret'

const EMPTY_CONFIG: StoredConfig = {
  clientId: '',
  redirectUri: '',
  hasClientSecret: false,
  hasAccessToken: false,
  hasRefreshToken: false,
  hasWebhookSecret: false,
  tokenExpiresAt: null,
  updatedAt: null,
}

async function responseData(response: Response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'La operación no pudo completarse')
  return data
}

export default function MercadoPagoConfig() {
  const [config, setConfig] = useState<StoredConfig>(EMPTY_CONFIG)
  const [clientId, setClientId] = useState('')
  const [redirectUri, setRedirectUri] = useState('')
  const [secrets, setSecrets] = useState<Record<SecretName, string>>({
    clientSecret: '', accessToken: '', refreshToken: '', webhookSecret: '',
  })
  const [authCode, setAuthCode] = useState('')
  const [authUrl, setAuthUrl] = useState('')
  const [authState, setAuthState] = useState('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'error' | 'info'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const data = await responseData(await fetch('/api/gerencia/mercadopago/config', { cache: 'no-store' })) as StoredConfig
      setConfig(data)
      setClientId(data.clientId || '')
      setRedirectUri(data.redirectUri || '')
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar la configuración' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const setSecret = (name: SecretName, value: string) => {
    setSecrets(current => ({ ...current, [name]: value }))
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setBusy('save')
    setStatus(null)
    try {
      const data = await responseData(await fetch('/api/gerencia/mercadopago/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, redirectUri, ...secrets }),
      })) as StoredConfig
      setConfig(data)
      setSecrets({ clientSecret: '', accessToken: '', refreshToken: '', webhookSecret: '' })
      setStatus({ kind: 'ok', text: 'Credenciales guardadas y cifradas correctamente.' })
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar' })
    } finally {
      setBusy(null)
    }
  }

  const testConnection = async () => {
    setBusy('test')
    setStatus({ kind: 'info', text: 'Probando la conexión con Mercado Pago…' })
    try {
      const data = await responseData(await fetch('/api/gerencia/mercadopago/test', { method: 'POST' }))
      setStatus({ kind: 'ok', text: `Conexión exitosa${data.account ? `: ${data.account}` : ''}.` })
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'Falló la conexión' })
    } finally {
      setBusy(null)
    }
  }

  const clear = async () => {
    if (!window.confirm('¿Eliminar todas las credenciales de Mercado Pago?')) return
    setBusy('clear')
    try {
      await responseData(await fetch('/api/gerencia/mercadopago/config', { method: 'DELETE' }))
      setConfig(EMPTY_CONFIG)
      setClientId('')
      setRedirectUri('')
      setSecrets({ clientSecret: '', accessToken: '', refreshToken: '', webhookSecret: '' })
      setAuthCode('')
      setAuthUrl('')
      setAuthState('')
      setStatus({ kind: 'ok', text: 'Credenciales eliminadas.' })
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudieron eliminar' })
    } finally {
      setBusy(null)
    }
  }

  const generateUrl = async () => {
    setBusy('url')
    try {
      const data = await responseData(await fetch('/api/gerencia/mercadopago/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authorization-url' }),
      }))
      setAuthUrl(data.url)
      setAuthState(data.state)
      setStatus({ kind: 'info', text: 'URL de autorización generada.' })
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo generar la URL' })
    } finally {
      setBusy(null)
    }
  }

  const exchangeCode = async () => {
    setBusy('exchange')
    try {
      await responseData(await fetch('/api/gerencia/mercadopago/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange-code', code: authCode }),
      }))
      setAuthCode('')
      await loadConfig()
      setStatus({ kind: 'ok', text: 'Tokens obtenidos y guardados de forma segura.' })
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo canjear el código' })
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando configuración…</div>
  }

  const secretInput = (
    name: SecretName,
    label: string,
    placeholder: string,
    description: string,
    configured: boolean,
    required = false,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`mp-${name}`}>{label}{required && <span className="text-red-500">*</span>}</Label>
        {configured && <Badge variant="outline" className="border-green-200 bg-green-50 text-[10px] text-green-700"><CheckCircle2 className="mr-1 h-3 w-3" />Configurado</Badge>}
      </div>
      <Input
        id={`mp-${name}`}
        type="password"
        autoComplete="new-password"
        value={secrets[name]}
        onChange={event => setSecret(name, event.target.value)}
        placeholder={configured ? 'Dejar vacío para conservar el valor actual' : placeholder}
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-blue-600" />Credenciales de Mercado Pago</CardTitle>
          <p className="text-sm text-muted-foreground">Conectá el dashboard con la cuenta real. Los secretos se cifran antes de guardarse y nunca vuelven a mostrarse.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={save}>
            <section className="space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Datos de la App (MP Developers)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mp-client-id">Client ID <span className="text-red-500">*</span></Label>
                  <Input id="mp-client-id" value={clientId} onChange={event => setClientId(event.target.value)} placeholder="123456789" />
                  <p className="text-xs text-muted-foreground">Disponible en tu aplicación de Mercado Pago Developers.</p>
                </div>
                {secretInput('clientSecret', 'Client Secret', 'APP_USR-…', 'Se conserva el valor actual si dejás este campo vacío.', config.hasClientSecret, true)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-redirect-uri">Redirect URI</Label>
                <Input id="mp-redirect-uri" value={redirectUri} onChange={event => setRedirectUri(event.target.value)} placeholder="https://tudominio.com/callback" />
                <p className="text-xs text-muted-foreground">Debe coincidir exactamente con la URL configurada en Mercado Pago.</p>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Tokens de acceso</h3>
              {secretInput('accessToken', 'Access Token (APP_USR-…)', 'APP_USR-xxxxxxxx-…', 'Token de producción utilizado por los servicios de Gerencia.', config.hasAccessToken, true)}
              {secretInput('refreshToken', 'Refresh Token (TG-…)', 'TG-xxxxxxxx-…', 'Permite renovar el Access Token.', config.hasRefreshToken)}
              {secretInput('webhookSecret', 'Webhook Secret', 'Tu webhook secret', 'Clave usada para validar la firma de las notificaciones.', config.hasWebhookSecret)}
              {config.tokenExpiresAt && <p className="text-xs text-muted-foreground">Vencimiento del token: {new Date(config.tokenExpiresAt).toLocaleString('es-AR')}</p>}
            </section>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={Boolean(busy)}><Save className="mr-2 h-4 w-4" />{busy === 'save' ? 'Guardando…' : 'Guardar credenciales'}</Button>
              <Button type="button" variant="outline" onClick={testConnection} disabled={Boolean(busy) || !config.hasAccessToken}><Unplug className="mr-2 h-4 w-4" />{busy === 'test' ? 'Probando…' : 'Probar conexión'}</Button>
              <Button type="button" variant="destructive" onClick={clear} disabled={Boolean(busy)}><Trash2 className="mr-2 h-4 w-4" />Limpiar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {status && (
        <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${status.kind === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : status.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
          {status.text}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-5 w-5 text-violet-600" />Autorización OAuth</CardTitle>
          <p className="text-sm text-muted-foreground">Generá el enlace para autorizar un vendedor y canjeá el código recibido por tokens.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mp-auth-code">Authorization Code</Label>
            <Input id="mp-auth-code" value={authCode} onChange={event => setAuthCode(event.target.value)} placeholder="Pegá aquí el code recibido en la redirect" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={generateUrl} disabled={Boolean(busy) || !config.clientId}>{busy === 'url' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}Generar URL de autorización</Button>
            <Button type="button" onClick={exchangeCode} disabled={Boolean(busy) || !authCode.trim()}>{busy === 'exchange' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Canjear código por token</Button>
          </div>
          {authUrl && (
            <div className="space-y-2 rounded-lg border bg-slate-50 p-3 text-xs">
              <a href={authUrl} target="_blank" rel="noreferrer" className="break-all font-medium text-blue-700 underline">Abrir autorización de Mercado Pago</a>
              <p className="break-all text-muted-foreground"><strong>State:</strong> {authState}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
