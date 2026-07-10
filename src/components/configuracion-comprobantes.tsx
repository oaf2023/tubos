'use client'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, Plus, Trash2, Key, Shield, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

const TIPOS = ['FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'PRESUPUESTO', 'REMITO', 'ORDEN_INTERNA']

export default function ConfiguracionComprobantes() {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)
  const [numeradores, setNumeradores] = useState<any[]>([])
  const [credenciales, setCredenciales] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'config' | 'numeradores' | 'credenciales'>('config')
  const [showNewCredential, setShowNewCredential] = useState(false)
  const [newCred, setNewCred] = useState({ alias: '', environment: 'HOMOLOGACION', certPem: '', keyPem: '', cuit: '', activo: false })

  async function load() {
    const [c, n, cred] = await Promise.all([
      fetch('/api/comprobantes/config'),
      fetch('/api/comprobantes/numeradores'),
      fetch('/api/comprobantes/credenciales'),
    ])
    setConfig(await c.json())
    setNumeradores(await n.json())
    setCredenciales(await cred.json())
  }
  useEffect(() => { load() }, [])

  async function saveConfig() {
    setSaving(true)
    const res = await fetch('/api/comprobantes/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
    setSaving(false)
    if (!res.ok) return toast({ title: 'No autorizado o error al guardar', variant: 'destructive' })
    toast({ title: 'Configuración fiscal guardada' })
    load()
  }

  async function saveNumerador(n: any) {
    const url = n.id ? `/api/comprobantes/numeradores/${n.id}` : '/api/comprobantes/numeradores'
    const res = await fetch(url, { method: n.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) })
    if (!res.ok) return toast({ title: 'No se pudo guardar numerador', variant: 'destructive' })
    toast({ title: 'Numerador guardado' })
    load()
  }

  async function deleteNumerador(id: string) {
    if (!confirm('¿Eliminar numerador?')) return
    const res = await fetch(`/api/comprobantes/numeradores/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast({ title: 'No se pudo eliminar', variant: 'destructive' })
    load()
  }

  function addNumerador() {
    setNumeradores(prev => [{ tipoDocumento: 'FACTURA', letra: 'B', codigoComprobante: '06', abreviatura: 'Fact', puntoVenta: '0001', ultimoNumero: 0, fiscal: true, sinValidezFiscal: false, copias: 'ORIGINAL,DUPLICADO', activo: true }, ...prev])
  }

  async function saveCredential(cred: any) {
    const url = cred.id ? `/api/comprobantes/credenciales/${cred.id}` : '/api/comprobantes/credenciales'
    const res = await fetch(url, {
      method: cred.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    })
    if (!res.ok) {
      const err = await res.json()
      return toast({ title: err.error || 'Error al guardar credencial', variant: 'destructive' })
    }
    toast({ title: 'Credencial ARCA guardada' })
    setShowNewCredential(false)
    setNewCred({ alias: '', environment: 'HOMOLOGACION', certPem: '', keyPem: '', cuit: '', activo: false })
    load()
  }

  async function deleteCredential(id: string) {
    if (!confirm('¿Eliminar credencial ARCA?')) return
    await fetch(`/api/comprobantes/credenciales/${id}`, { method: 'DELETE' })
    toast({ title: 'Credencial eliminada' })
    load()
  }

  async function toggleCredentialActive(cred: any) {
    await saveCredential({ ...cred, activo: !cred.activo })
  }

  if (!config) return <div className="flex items-center gap-2 text-sm text-slate-400"><RefreshCw className="w-4 h-4 animate-spin" />Cargando configuración...</div>

  return <div className="space-y-5">
    <div className="flex gap-2 border-b pb-2">
      <button className={`px-3 py-1 rounded-t text-sm ${tab === 'config' ? 'bg-blue-100 font-semibold' : 'hover:bg-slate-100'}`} onClick={() => setTab('config')}>Configuración</button>
      <button className={`px-3 py-1 rounded-t text-sm ${tab === 'numeradores' ? 'bg-blue-100 font-semibold' : 'hover:bg-slate-100'}`} onClick={() => setTab('numeradores')}>Numeradores</button>
      <button className={`px-3 py-1 rounded-t text-sm ${tab === 'credenciales' ? 'bg-blue-100 font-semibold' : 'hover:bg-slate-100'}`} onClick={() => setTab('credenciales')}>Credenciales ARCA</button>
    </div>

    {tab === 'config' && <>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Empresa / Emisor</h3><Badge variant="outline">Solo Gerencia Nivel 0</Badge></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div><Label>Razón social</Label><Input value={config.razonSocial || ''} onChange={e => setConfig((c: any) => ({ ...c, razonSocial: e.target.value }))} /></div>
          <div><Label>Nombre comercial</Label><Input value={config.nombreComercial || ''} onChange={e => setConfig((c: any) => ({ ...c, nombreComercial: e.target.value }))} /></div>
          <div><Label>CUIT</Label><Input value={config.cuit || ''} onChange={e => setConfig((c: any) => ({ ...c, cuit: e.target.value }))} /></div>
          <div><Label>Condición IVA</Label><Input value={config.condicionIva || ''} onChange={e => setConfig((c: any) => ({ ...c, condicionIva: e.target.value }))} /></div>
          <div className="lg:col-span-2"><Label>Domicilio comercial</Label><Input value={config.domicilioComercial || ''} onChange={e => setConfig((c: any) => ({ ...c, domicilioComercial: e.target.value }))} /></div>
          <div><Label>Teléfono</Label><Input value={config.telefono || ''} onChange={e => setConfig((c: any) => ({ ...c, telefono: e.target.value }))} /></div>
          <div><Label>Email</Label><Input value={config.email || ''} onChange={e => setConfig((c: any) => ({ ...c, email: e.target.value }))} /></div>
          <div><Label>Web</Label><Input value={config.web || ''} onChange={e => setConfig((c: any) => ({ ...c, web: e.target.value }))} /></div>
          <div><Label>Ingresos Brutos</Label><Input value={config.ingresosBrutos || ''} onChange={e => setConfig((c: any) => ({ ...c, ingresosBrutos: e.target.value }))} /></div>
          <div><Label>Inicio Actividades</Label><Input value={config.fechaInicioActividades || ''} onChange={e => setConfig((c: any) => ({ ...c, fechaInicioActividades: e.target.value }))} /></div>
        </div>
      </div>
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold">IVA / Moneda / CAE / ARCA</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div><Label>Moneda default</Label><select className="w-full border rounded px-3 py-2 text-sm" value={config.monedaDefault} onChange={e => setConfig((c: any) => ({ ...c, monedaDefault: e.target.value }))}><option>ARS</option><option>USD</option></select></div>
          <div><Label>Tipo cambio sugerido</Label><Input type="number" step="0.01" value={config.tipoCambioSugerido || 1} onChange={e => setConfig((c: any) => ({ ...c, tipoCambioSugerido: e.target.value }))} /></div>
          <div><Label>IVA artículos</Label><Input type="number" step="0.01" value={config.ivaDefaultArticulos || 21} onChange={e => setConfig((c: any) => ({ ...c, ivaDefaultArticulos: e.target.value }))} /></div>
          <div><Label>IVA gases</Label><Input type="number" step="0.01" value={config.ivaDefaultGases || 21} onChange={e => setConfig((c: any) => ({ ...c, ivaDefaultGases: e.target.value }))} /></div>
          <div><Label>IVA servicios</Label><Input type="number" step="0.01" value={config.ivaDefaultServicios || 21} onChange={e => setConfig((c: any) => ({ ...c, ivaDefaultServicios: e.target.value }))} /></div>
        </div>
        <div className="flex gap-5 flex-wrap text-sm items-center">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!config.permitirUsd} onChange={e => setConfig((c: any) => ({ ...c, permitirUsd: e.target.checked }))} /> Permitir USD</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!config.permitirCaeManual} onChange={e => setConfig((c: any) => ({ ...c, permitirCaeManual: e.target.checked }))} /> CAE manual</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!config.requerirCaeParaFiscal} onChange={e => setConfig((c: any) => ({ ...c, requerirCaeParaFiscal: e.target.checked }))} /> Requerir CAE fiscal</label>
          <div className="flex items-center gap-2"><Label className="text-sm mb-0 whitespace-nowrap">Modo ARCA</Label><select className="border rounded px-2 py-1 text-sm" value={config.modoArca || 'MANUAL'} onChange={e => setConfig((c: any) => ({ ...c, modoArca: e.target.value }))}><option value="MANUAL">Manual (sin integración)</option><option value="MOCK">Simulación (CAE mock)</option><option value="HOMOLOGACION">Homologación ARCA</option><option value="PRODUCCION">Producción ARCA</option></select></div>
        </div>
        <Button onClick={saveConfig} disabled={saving}><Save className="w-4 h-4 mr-1" />Guardar Configuración</Button>
      </div>
    </>}

    {tab === 'numeradores' && <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Numeradores</h3><Button size="sm" onClick={addNumerador}><Plus className="w-4 h-4 mr-1" />Agregar</Button></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Letra</TableHead><TableHead>Cod.</TableHead><TableHead>Abrev.</TableHead><TableHead>P.Vta.</TableHead><TableHead>Último</TableHead><TableHead>Copias</TableHead><TableHead>Fiscal</TableHead><TableHead /></TableRow></TableHeader><TableBody>{numeradores.map((n, i) => <TableRow key={n.id || `new-${i}`}><TableCell><select className="border rounded px-2 py-1 text-xs" value={n.tipoDocumento} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, tipoDocumento: e.target.value } : x))}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></TableCell><TableCell><Input className="w-14 h-8" value={n.letra} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, letra: e.target.value } : x))} /></TableCell><TableCell><Input className="w-16 h-8" value={n.codigoComprobante} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, codigoComprobante: e.target.value } : x))} /></TableCell><TableCell><Input className="w-20 h-8" value={n.abreviatura} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, abreviatura: e.target.value } : x))} /></TableCell><TableCell><Input className="w-20 h-8" value={n.puntoVenta} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, puntoVenta: e.target.value } : x))} /></TableCell><TableCell><Input className="w-20 h-8" type="number" value={n.ultimoNumero} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, ultimoNumero: e.target.value } : x))} /></TableCell><TableCell><Input className="w-44 h-8" value={n.copias} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, copias: e.target.value } : x))} /></TableCell><TableCell><input type="checkbox" checked={!!n.fiscal} onChange={e => setNumeradores(a => a.map((x, idx) => idx === i ? { ...x, fiscal: e.target.checked, sinValidezFiscal: !e.target.checked } : x))} /></TableCell><TableCell className="flex gap-1"><Button size="sm" variant="outline" onClick={() => saveNumerador(n)}><Save className="w-3 h-3" /></Button>{n.id ? <Button size="sm" variant="destructive" onClick={() => deleteNumerador(n.id)}><Trash2 className="w-3 h-3" /></Button> : null}</TableCell></TableRow>)}</TableBody></Table></div>
    </div>}

    {tab === 'credenciales' && <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Key className="w-4 h-4" /> Credenciales ARCA (Certificado X.509)</h3>
        <Button size="sm" onClick={() => setShowNewCredential(true)}><Plus className="w-4 h-4 mr-1" />Nueva Credencial</Button>
      </div>

      {showNewCredential && <div className="rounded bg-yellow-50 border p-3 space-y-2">
        <h4 className="text-sm font-semibold">Nueva credencial</h4>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Alias</Label><Input className="h-8 text-sm" placeholder="ej: certificado-homologacion" value={newCred.alias} onChange={e => setNewCred(p => ({ ...p, alias: e.target.value }))} /></div>
          <div><Label className="text-xs">Entorno</Label><select className="w-full border rounded px-2 py-1 text-sm h-8" value={newCred.environment} onChange={e => setNewCred(p => ({ ...p, environment: e.target.value }))}><option value="HOMOLOGACION">Homologación</option><option value="PRODUCCION">Producción</option></select></div>
          <div><Label className="text-xs">CUIT</Label><Input className="h-8 text-sm" placeholder="30-12345678-1" value={newCred.cuit} onChange={e => setNewCred(p => ({ ...p, cuit: e.target.value }))} /></div>
          <div className="flex items-end"><label className="flex items-center gap-2 text-sm pb-1"><input type="checkbox" checked={newCred.activo} onChange={e => setNewCred(p => ({ ...p, activo: e.target.checked }))} /> Activo</label></div>
          <div className="col-span-2"><Label className="text-xs">Certificado X.509 (PEM)</Label><textarea className="w-full border rounded px-2 py-1 text-xs font-mono h-20" value={newCred.certPem} onChange={e => setNewCred(p => ({ ...p, certPem: e.target.value }))} /></div>
          <div className="col-span-2"><Label className="text-xs">Clave privada (PEM)</Label><textarea className="w-full border rounded px-2 py-1 text-xs font-mono h-20" value={newCred.keyPem} onChange={e => setNewCred(p => ({ ...p, keyPem: e.target.value }))} /></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => saveCredential(newCred)}><Save className="w-3 h-3 mr-1" />Guardar</Button>
          <Button size="sm" variant="outline" onClick={() => setShowNewCredential(false)}>Cancelar</Button>
        </div>
      </div>}

      {credenciales.length === 0 ? <p className="text-sm text-slate-400">No hay credenciales ARCA configuradas. Agregue su certificado X.509 para conectar con ARCA.</p>
        : <div className="space-y-2">{credenciales.map(cred => <div key={cred.id} className="rounded border p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {cred.activo ? <Shield className="w-5 h-5 text-green-600" /> : <ShieldOff className="w-5 h-5 text-slate-400" />}
            <div>
              <div className="font-medium text-sm">{cred.alias}</div>
              <div className="text-xs text-slate-500">CUIT: {cred.cuit} | Entorno: {cred.environment} | Servicio: {cred.servicio || 'wsfe'}</div>
              {cred.ultimoUsado && <div className="text-xs text-slate-400">Último uso: {new Date(cred.ultimoUsado).toLocaleString()}</div>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => toggleCredentialActive(cred)}>{cred.activo ? 'Desactivar' : 'Activar'}</Button>
            <Button size="sm" variant="destructive" onClick={() => deleteCredential(cred.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>)}</div>}
    </div>}
  </div>
}
