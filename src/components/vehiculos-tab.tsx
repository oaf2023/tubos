'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Truck, Fuel, Wrench, FileText, Save, X, Search, AlertTriangle } from 'lucide-react'

const TIPOS_VEHICULO = ['AUTO', 'CAMIONETA', 'CAMION', 'BUS', 'MAQUINARIA', 'MONTACARGA', 'MOTO', 'OTRO']
const COMBUSTIBLES = ['NAFTA', 'GASOIL', 'GNC', 'ELECTRICO', 'HIBRIDO', 'OTRO']
const ESTADOS_VEH = ['ACTIVO', 'EN_TALLER', 'BAJA', 'RESERVA']
const SUBTABS = ['vehiculos', 'mantenimientos', 'combustible', 'documentos']

const emptyVehiculo = {
  codigo: '', patente: '', marca: '', modelo: '', anio: new Date().getFullYear(),
  vin: '', numeroMotor: '', tipo: 'AUTO', combustible: 'GASOIL',
  capacidad: '', kmActual: 0, horometroActual: undefined as number | undefined,
  estado: 'ACTIVO', areaAsignada: '', conductorAsignado: '', centroCosto: '',
  largoCajaCm: undefined as number | undefined, anchoCajaCm: undefined as number | undefined,
  altoCajaCm: undefined as number | undefined, maxTubos: undefined as number | undefined,
  orientacionTubos: 'PARADOS',
}

export default function VehiculosTab() {
  const { toast } = useToast()
  const [subtab, setSubtab] = useState('vehiculos')
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [selectedVeh, setSelectedVeh] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState<'vehiculo' | 'mantenimiento' | 'combustible' | 'documento' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  // Forms
  const [form, setForm] = useState(emptyVehiculo)
  const [mantForm, setMantForm] = useState({ tipo: 'PREVENTIVO', fecha: new Date().toISOString().slice(0,10), kmActual: '', descripcion: '', costo: '', taller: '', responsable: '', estado: 'PENDIENTE', observaciones: '' })
  const [combForm, setCombForm] = useState({ fecha: new Date().toISOString().slice(0,10), litros: '', costo: '', kmActual: '', tipo: 'CARGA' })
  const [docForm, setDocForm] = useState({ tipo: 'REVISION_TECNICA', numero: '', fechaEmision: '', fechaVencimiento: '', observaciones: '' })

  // Detail data
  const [mantenimientos, setMantenimientos] = useState<any[]>([])
  const [cargas, setCargas] = useState<any[]>([])
  const [documentos, setDocumentos] = useState<any[]>([])

  async function loadVehiculos() {
    setLoading(true)
    try {
      const res = await fetch('/api/vehiculos')
      const data = await res.json()
      setVehiculos(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadVehiculos() }, [])

  async function selectVehiculo(v: any) {
    setSelectedVeh(v)
    setSubtab('mantenimientos')
    await Promise.all([loadMantenimientos(v.id), loadCargas(v.id), loadDocumentos(v.id)])
  }

  async function loadMantenimientos(id: string) {
    try { const r = await fetch(`/api/vehiculos/${id}/mantenimientos`); setMantenimientos(await r.json()) } catch { setMantenimientos([]) }
  }
  async function loadCargas(id: string) {
    try { const r = await fetch(`/api/vehiculos/${id}/cargas`); setCargas(await r.json()) } catch { setCargas([]) }
  }
  async function loadDocumentos(id: string) {
    try { const r = await fetch(`/api/vehiculos/${id}/documentos`); setDocumentos(await r.json()) } catch { setDocumentos([]) }
  }

  // --- Vehiculo CRUD ---
  function openVehiculo(v?: any) {
    if (v) {
      setEditId(v.id)
      setForm({
        codigo: v.codigo, patente: v.patente, marca: v.marca, modelo: v.modelo, anio: v.anio || new Date().getFullYear(),
        vin: v.vin || '', numeroMotor: v.numeroMotor || '', tipo: v.tipo, combustible: v.combustible,
        capacidad: v.capacidad || '', kmActual: v.kmActual || 0, horometroActual: v.horometroActual || undefined,
        estado: v.estado, areaAsignada: v.areaAsignada || '', conductorAsignado: v.conductorAsignado || '', centroCosto: v.centroCosto || '',
        largoCajaCm: v.largoCajaCm ?? undefined, anchoCajaCm: v.anchoCajaCm ?? undefined,
        altoCajaCm: v.altoCajaCm ?? undefined, maxTubos: v.maxTubos ?? undefined,
        orientacionTubos: v.orientacionTubos || 'PARADOS',
      })
    } else { setEditId(null); setForm(emptyVehiculo) }
    setDialogOpen('vehiculo')
  }

  async function saveVehiculo() {
    try {
      const res = await fetch(`/api/vehiculos${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          anio: parseInt(String(form.anio)),
          kmActual: parseInt(String(form.kmActual)),
          horometroActual: form.horometroActual ? parseInt(String(form.horometroActual)) : null,
          largoCajaCm: form.largoCajaCm ? parseFloat(String(form.largoCajaCm)) : null,
          anchoCajaCm: form.anchoCajaCm ? parseFloat(String(form.anchoCajaCm)) : null,
          altoCajaCm: form.altoCajaCm ? parseFloat(String(form.altoCajaCm)) : null,
          maxTubos: form.maxTubos ? parseInt(String(form.maxTubos)) : null,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast({ title: editId ? 'Vehículo actualizado' : 'Vehículo creado' })
      setDialogOpen(null)
      loadVehiculos()
    } catch (e: any) { toast({ title: e.message || 'Error', variant: 'destructive' }) }
  }

  async function deleteVehiculo(id: string) {
    if (!confirm('¿Eliminar vehículo?')) return
    await fetch(`/api/vehiculos/${id}`, { method: 'DELETE' })
    toast({ title: 'Eliminado' })
    if (selectedVeh?.id === id) setSelectedVeh(null)
    loadVehiculos()
  }

  // --- Mantenimiento ---
  function openMantForm() { setMantForm({ tipo: 'PREVENTIVO', fecha: new Date().toISOString().slice(0,10), kmActual: '', descripcion: '', costo: '', taller: '', responsable: '', estado: 'PENDIENTE', observaciones: '' }); setDialogOpen('mantenimiento') }

  async function saveMantenimiento() {
    if (!selectedVeh) return
    const body = { ...mantForm, kmActual: mantForm.kmActual ? parseInt(mantForm.kmActual) : null, costo: mantForm.costo ? parseFloat(mantForm.costo) : null, fecha: new Date(mantForm.fecha) }
    await fetch(`/api/vehiculos/${selectedVeh.id}/mantenimientos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    toast({ title: 'Mantenimiento registrado' })
    setDialogOpen(null)
    loadMantenimientos(selectedVeh.id)
  }

  // --- Combustible ---
  function openCombForm() { setCombForm({ fecha: new Date().toISOString().slice(0,10), litros: '', costo: '', kmActual: '', tipo: 'CARGA' }); setDialogOpen('combustible') }

  async function saveCombustible() {
    if (!selectedVeh) return
    const body = { ...combForm, litros: parseFloat(combForm.litros), costo: combForm.costo ? parseFloat(combForm.costo) : null, kmActual: combForm.kmActual ? parseInt(combForm.kmActual) : null, fecha: new Date(combForm.fecha) }
    await fetch(`/api/vehiculos/${selectedVeh.id}/cargas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    toast({ title: 'Carga registrada' })
    setDialogOpen(null)
    loadCargas(selectedVeh.id)
  }

  // --- Documento ---
  function openDocForm() { setDocForm({ tipo: 'REVISION_TECNICA', numero: '', fechaEmision: '', fechaVencimiento: '', observaciones: '' }); setDialogOpen('documento') }

  async function saveDocumento() {
    if (!selectedVeh) return
    const body = { ...docForm, fechaEmision: docForm.fechaEmision ? new Date(docForm.fechaEmision) : null, fechaVencimiento: docForm.fechaVencimiento ? new Date(docForm.fechaVencimiento) : null }
    await fetch(`/api/vehiculos/${selectedVeh.id}/documentos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    toast({ title: 'Documento registrado' })
    setDialogOpen(null)
    loadDocumentos(selectedVeh.id)
  }

  const filtered = vehiculos.filter(v => !search || v.patente.toLowerCase().includes(search.toLowerCase()) || v.marca.toLowerCase().includes(search.toLowerCase()) || v.codigo.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Truck className="w-5 h-5 text-yellow-600" />
        Vehículos / Mantenimiento
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: vehicle list */}
        <Card className="lg:col-span-1 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
              <Input className="pl-7 h-8 text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => openVehiculo()} className="bg-yellow-600 hover:bg-yellow-700"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {loading ? <p className="text-xs text-slate-400 py-4 text-center">Cargando...</p> : filtered.map(v => (
              <div key={v.id} onClick={() => selectVehiculo(v)} className={`p-2 rounded cursor-pointer text-sm border text-xs transition-colors ${selectedVeh?.id === v.id ? 'bg-yellow-50 border-yellow-300' : 'border-transparent hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{v.patente}</span>
                  <BadgeEstado estado={v.estado} />
                </div>
                <span className="text-slate-500">{v.marca} {v.modelo} · {v.kmActual?.toLocaleString()} km</span>
                <div className="flex gap-1 mt-1">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); openVehiculo(v) }}><Pencil className="w-3 h-3 text-sky-600" /></Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={(e) => { e.stopPropagation(); deleteVehiculo(v.id) }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: detail panel */}
        <Card className="lg:col-span-2 p-4">
          {!selectedVeh ? (
            <p className="text-slate-400 text-sm text-center py-12">Seleccioná un vehículo para ver su detalle</p>
          ) : (
            <div className="space-y-4">
              {/* Vehicle info header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{selectedVeh.patente}</h3>
                  <p className="text-sm text-slate-500">{selectedVeh.marca} {selectedVeh.modelo} · {selectedVeh.tipo} · {selectedVeh.combustible}</p>
                  <p className="text-xs text-slate-400">Código: {selectedVeh.codigo} · VIN: {selectedVeh.vin || '—'} · {selectedVeh.kmActual?.toLocaleString()} km</p>
                  {selectedVeh.conductorAsignado && <p className="text-xs text-slate-400">Conductor: {selectedVeh.conductorAsignado} · Área: {selectedVeh.areaAsignada || '—'}</p>}
                </div>
                <BadgeEstado estado={selectedVeh.estado} />
              </div>

              {/* Sub-tabs: Mantenimiento, Combustible, Documentos */}
              <div className="flex gap-1 border-b pb-1">
                {[{k:'mantenimientos',l:'Mantenimiento',i:Wrench},{k:'combustible',l:'Combustible',i:Fuel},{k:'documentos',l:'Documentos',i:FileText}].map(t => (
                  <button key={t.k} onClick={() => setSubtab(t.k)} className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${subtab === t.k ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500' : 'text-slate-500 hover:text-slate-800'}`}>
                    <t.i className="w-3.5 h-3.5 inline mr-1" />{t.l}
                  </button>
                ))}
              </div>

              {/* Mantenimientos */}
              {subtab === 'mantenimientos' && (
                <div className="space-y-2">
                  <div className="flex justify-end"><Button size="sm" onClick={openMantForm} className="bg-yellow-600 hover:bg-yellow-700 gap-1"><Plus className="w-3.5 h-3.5" />Agregar</Button></div>
                  {mantenimientos.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Sin mantenimientos registrados</p> : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-100">{['Fecha','Tipo','Km','Descripción','Costo','Taller','Estado'].map(h => <th key={h} className="border p-1.5 text-left font-semibold">{h}</th>)}</tr></thead>
                        <tbody>{mantenimientos.map((m: any,i: number) => (
                          <tr key={m.id||i} className="even:bg-slate-50">
                            <td className="border p-1.5">{new Date(m.fecha).toLocaleDateString()}</td>
                            <td className="border p-1.5"><BadgeTipoMant tipo={m.tipo} /></td>
                            <td className="border p-1.5 text-right">{m.kmActual ?? '—'}</td>
                            <td className="border p-1.5">{m.descripcion}</td>
                            <td className="border p-1.5 text-right">{m.costo ? `$${m.costo.toFixed(2)}` : '—'}</td>
                            <td className="border p-1.5">{m.taller || '—'}</td>
                            <td className="border p-1.5"><BadgeEstado orden={['PENDIENTE','EN_PROCESO','COMPLETADO','CANCELADO']} estado={m.estado} /></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Combustible */}
              {subtab === 'combustible' && (
                <div className="space-y-2">
                  <div className="flex justify-end"><Button size="sm" onClick={openCombForm} className="bg-yellow-600 hover:bg-yellow-700 gap-1"><Plus className="w-3.5 h-3.5" />Cargar</Button></div>
                  {cargas.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Sin cargas registradas</p> : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-100">{['Fecha','Litros','Costo','Km Actual','Rendimiento','Tipo'].map(h => <th key={h} className="border p-1.5 text-left font-semibold">{h}</th>)}</tr></thead>
                        <tbody>{cargas.map((c: any,i: number) => (
                          <tr key={c.id||i} className="even:bg-slate-50">
                            <td className="border p-1.5">{new Date(c.fecha).toLocaleDateString()}</td>
                            <td className="border p-1.5 text-right">{c.litros} L</td>
                            <td className="border p-1.5 text-right">{c.costo ? `$${c.costo.toFixed(2)}` : '—'}</td>
                            <td className="border p-1.5 text-right">{c.kmActual ?? '—'}</td>
                            <td className="border p-1.5 text-right">{c.rendimiento != null ? `${c.rendimiento.toFixed(1)} km/L` : '—'}</td>
                            <td className="border p-1.5">{c.tipo === 'CARGA_ELECTRICA' ? '⚡ Eléctrica' : '⛽ Carga'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Documentos */}
              {subtab === 'documentos' && (
                <div className="space-y-2">
                  <div className="flex justify-end"><Button size="sm" onClick={openDocForm} className="bg-yellow-600 hover:bg-yellow-700 gap-1"><Plus className="w-3.5 h-3.5" />Agregar</Button></div>
                  {documentos.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Sin documentos registrados</p> : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-100">{['Tipo','N°','Emisión','Vencimiento','Estado','Obs.'].map(h => <th key={h} className="border p-1.5 text-left font-semibold">{h}</th>)}</tr></thead>
                        <tbody>{documentos.map((d: any,i: number) => {
                          const vence = d.fechaVencimiento ? new Date(d.fechaVencimiento) : null
                          const estaVencido = vence && vence < new Date()
                          const proxVencer = vence && !estaVencido && (vence.getTime() - Date.now()) < 30*24*60*60*1000
                          return (
                            <tr key={d.id||i} className={`even:bg-slate-50 ${estaVencido ? 'bg-red-50' : proxVencer ? 'bg-amber-50' : ''}`}>
                              <td className="border p-1.5 font-medium">{d.tipo.replace(/_/g,' ')}</td>
                              <td className="border p-1.5 font-mono">{d.numero || '—'}</td>
                              <td className="border p-1.5">{d.fechaEmision ? new Date(d.fechaEmision).toLocaleDateString() : '—'}</td>
                              <td className="border p-1.5">{vence ? vence.toLocaleDateString() : '—'}</td>
                              <td className="border p-1.5">
                                {estaVencido ? <span className="text-red-600 font-semibold">VENCIDO</span> : proxVencer ? <span className="text-amber-600 font-semibold">PRÓXIMO A VENCER</span> : <span className="text-emerald-600">Vigente</span>}
                              </td>
                              <td className="border p-1.5 text-xs">{d.observaciones || '—'}</td>
                            </tr>
                          )}
                        )}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* DIALOG: Vehiculo */}
      {dialogOpen === 'vehiculo' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDialogOpen(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">{editId ? 'Editar' : 'Nuevo'} Vehículo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Código interno</Label><Input value={form.codigo} onChange={e => setForm(f=>({...f,codigo:e.target.value}))} placeholder="VH-001" /></div>
              <div><Label className="text-xs">Patente</Label><Input value={form.patente} onChange={e => setForm(f=>({...f,patente:e.target.value.toUpperCase()}))} placeholder="AB123CD" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Marca</Label><Input value={form.marca} onChange={e => setForm(f=>({...f,marca:e.target.value}))} /></div>
              <div><Label className="text-xs">Modelo</Label><Input value={form.modelo} onChange={e => setForm(f=>({...f,modelo:e.target.value}))} /></div>
              <div><Label className="text-xs">Año</Label><Input type="number" value={form.anio} onChange={e => setForm(f=>({...f,anio:parseInt(e.target.value)||new Date().getFullYear()}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">VIN/Chasis</Label><Input value={form.vin} onChange={e => setForm(f=>({...f,vin:e.target.value}))} /></div>
              <div><Label className="text-xs">N° Motor</Label><Input value={form.numeroMotor} onChange={e => setForm(f=>({...f,numeroMotor:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo</Label><Select value={form.tipo} onValueChange={v => setForm(f=>({...f,tipo:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS_VEHICULO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Combustible</Label><Select value={form.combustible} onValueChange={v => setForm(f=>({...f,combustible:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMBUSTIBLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Capacidad</Label><Input value={form.capacidad} onChange={e => setForm(f=>({...f,capacidad:e.target.value}))} placeholder="Ej: 1000 kg" /></div>
              <div><Label className="text-xs">Km Actuales</Label><Input type="number" value={form.kmActual} onChange={e => setForm(f=>({...f,kmActual:parseInt(e.target.value)||0}))} /></div>
              <div><Label className="text-xs">Horómetro</Label><Input type="number" value={form.horometroActual ?? ''} onChange={e => setForm(f=>({...f,horometroActual:e.target.value?parseInt(e.target.value):undefined}))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Estado</Label><Select value={form.estado} onValueChange={v => setForm(f=>({...f,estado:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ESTADOS_VEH.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Área</Label><Input value={form.areaAsignada} onChange={e => setForm(f=>({...f,areaAsignada:e.target.value}))} /></div>
              <div><Label className="text-xs">C. Costo</Label><Input value={form.centroCosto} onChange={e => setForm(f=>({...f,centroCosto:e.target.value}))} /></div>
            </div>
            <div><Label className="text-xs">Conductor asignado</Label><Input value={form.conductorAsignado} onChange={e => setForm(f=>({...f,conductorAsignado:e.target.value}))} /></div>
            <hr className="my-1 border-slate-200" />
            <p className="text-xs font-semibold text-slate-500">CONFIGURACIÓN DE CARGA</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Largo caja (cm)</Label><Input type="number" value={form.largoCajaCm ?? ''} onChange={e => setForm(f=>({...f,largoCajaCm:e.target.value?parseFloat(e.target.value):undefined}))} /></div>
              <div><Label className="text-xs">Ancho caja (cm)</Label><Input type="number" value={form.anchoCajaCm ?? ''} onChange={e => setForm(f=>({...f,anchoCajaCm:e.target.value?parseFloat(e.target.value):undefined}))} /></div>
              <div><Label className="text-xs">Alto caja (cm)</Label><Input type="number" value={form.altoCajaCm ?? ''} onChange={e => setForm(f=>({...f,altoCajaCm:e.target.value?parseFloat(e.target.value):undefined}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Máx. tubos</Label><Input type="number" value={form.maxTubos ?? ''} onChange={e => setForm(f=>({...f,maxTubos:e.target.value?parseInt(e.target.value):undefined}))} /></div>
              <div><Label className="text-xs">Orientación</Label><Select value={form.orientacionTubos} onValueChange={v => setForm(f=>({...f,orientacionTubos:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PARADOS">Parados</SelectItem><SelectItem value="ACOSTADOS">Acostados</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(null)}><X className="w-4 h-4 mr-1" />Cancelar</Button>
              <Button onClick={saveVehiculo} className="bg-yellow-600 hover:bg-yellow-700"><Save className="w-4 h-4 mr-1" />Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Mantenimiento */}
      {dialogOpen === 'mantenimiento' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDialogOpen(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Registrar Mantenimiento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo</Label><Select value={mantForm.tipo} onValueChange={v => setMantForm(f=>({...f,tipo:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PREVENTIVO">Preventivo</SelectItem><SelectItem value="CORRECTIVO">Correctivo</SelectItem><SelectItem value="PREDICTIVO">Predictivo</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">Fecha</Label><Input type="date" value={mantForm.fecha} onChange={e => setMantForm(f=>({...f,fecha:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Km Actual</Label><Input type="number" value={mantForm.kmActual} onChange={e => setMantForm(f=>({...f,kmActual:e.target.value}))} /></div>
              <div><Label className="text-xs">Costo ($)</Label><Input type="number" step="0.01" value={mantForm.costo} onChange={e => setMantForm(f=>({...f,costo:e.target.value}))} /></div>
            </div>
            <div><Label className="text-xs">Descripción</Label><Textarea value={mantForm.descripcion} onChange={e => setMantForm(f=>({...f,descripcion:e.target.value}))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Taller</Label><Input value={mantForm.taller} onChange={e => setMantForm(f=>({...f,taller:e.target.value}))} /></div>
              <div><Label className="text-xs">Responsable</Label><Input value={mantForm.responsable} onChange={e => setMantForm(f=>({...f,responsable:e.target.value}))} /></div>
            </div>
            <div><Label className="text-xs">Observaciones</Label><Textarea value={mantForm.observaciones} onChange={e => setMantForm(f=>({...f,observaciones:e.target.value}))} rows={2} /></div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(null)}><X className="w-4 h-4 mr-1" />Cancelar</Button>
              <Button onClick={saveMantenimiento} className="bg-yellow-600 hover:bg-yellow-700"><Save className="w-4 h-4 mr-1" />Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Combustible */}
      {dialogOpen === 'combustible' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDialogOpen(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Registrar Carga de Combustible</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Fecha</Label><Input type="date" value={combForm.fecha} onChange={e => setCombForm(f=>({...f,fecha:e.target.value}))} /></div>
              <div><Label className="text-xs">Tipo</Label><Select value={combForm.tipo} onValueChange={v => setCombForm(f=>({...f,tipo:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CARGA">Combustible</SelectItem><SelectItem value="CARGA_ELECTRICA">Carga Eléctrica</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Litros / kWh</Label><Input type="number" step="0.1" value={combForm.litros} onChange={e => setCombForm(f=>({...f,litros:e.target.value}))} /></div>
              <div><Label className="text-xs">Costo ($)</Label><Input type="number" step="0.01" value={combForm.costo} onChange={e => setCombForm(f=>({...f,costo:e.target.value}))} /></div>
              <div><Label className="text-xs">Km Actual</Label><Input type="number" value={combForm.kmActual} onChange={e => setCombForm(f=>({...f,kmActual:e.target.value}))} /></div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(null)}><X className="w-4 h-4 mr-1" />Cancelar</Button>
              <Button onClick={saveCombustible} className="bg-yellow-600 hover:bg-yellow-700"><Save className="w-4 h-4 mr-1" />Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Documento */}
      {dialogOpen === 'documento' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDialogOpen(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Agregar Documento</h3>
            <div><Label className="text-xs">Tipo</Label><Select value={docForm.tipo} onValueChange={v => setDocForm(f=>({...f,tipo:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="REVISION_TECNICA">Revisión Técnica</SelectItem><SelectItem value="PERMISO_CIRCULACION">Permiso Circulación</SelectItem><SelectItem value="SEGURO">Seguro</SelectItem><SelectItem value="LICENCIA">Licencia Conductor</SelectItem><SelectItem value="OTRO">Otro</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">N° Documento</Label><Input value={docForm.numero} onChange={e => setDocForm(f=>({...f,numero:e.target.value}))} /></div>
              <div><Label className="text-xs">Fecha Emisión</Label><Input type="date" value={docForm.fechaEmision} onChange={e => setDocForm(f=>({...f,fechaEmision:e.target.value}))} /></div>
            </div>
            <div><Label className="text-xs">Fecha Vencimiento <span className="text-red-400">*</span></Label><Input type="date" value={docForm.fechaVencimiento} onChange={e => setDocForm(f=>({...f,fechaVencimiento:e.target.value}))} /></div>
            <div><Label className="text-xs">Observaciones</Label><Textarea value={docForm.observaciones} onChange={e => setDocForm(f=>({...f,observaciones:e.target.value}))} rows={2} /></div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(null)}><X className="w-4 h-4 mr-1" />Cancelar</Button>
              <Button onClick={saveDocumento} className="bg-yellow-600 hover:bg-yellow-700"><Save className="w-4 h-4 mr-1" />Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BadgeEstado({ estado, orden }: { estado: string; orden?: string[] }) {
  const colores: Record<string, string> = { ACTIVO: 'bg-emerald-100 text-emerald-700', EN_TALLER: 'bg-amber-100 text-amber-700', BAJA: 'bg-red-100 text-red-700', RESERVA: 'bg-blue-100 text-blue-700', PENDIENTE: 'bg-slate-100 text-slate-600', EN_PROCESO: 'bg-blue-100 text-blue-700', COMPLETADO: 'bg-emerald-100 text-emerald-700', CANCELADO: 'bg-red-100 text-red-700' }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colores[estado] || 'bg-slate-100 text-slate-600'}`}>{estado.replace(/_/g,' ')}</span>
}

function BadgeTipoMant({ tipo }: { tipo: string }) {
  const colores: Record<string, string> = { PREVENTIVO: 'bg-blue-100 text-blue-700', CORRECTIVO: 'bg-red-100 text-red-700', PREDICTIVO: 'bg-purple-100 text-purple-700' }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colores[tipo] || 'bg-slate-100 text-slate-600'}`}>{tipo}</span>
}
