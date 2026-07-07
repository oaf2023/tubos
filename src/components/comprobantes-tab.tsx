'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, RefreshCw, Eye, Trash2, Save, Search, Package, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import QRCode from 'qrcode'

type Item = { codigo?: string; detalle: string; cantidad: number; unidad?: string; precioUnitario: number; bonificacionPorcentaje?: number; alicuotaIva: number; subtotal?: number; articuloId?: number; gasId?: string; pedidoItemId?: string }
type Doc = any

const TIPO_OPTIONS = [
  { value: 'FACTURA_B', label: 'Factura B', tipoDocumento: 'FACTURA', letra: 'B' },
  { value: 'FACTURA_A', label: 'Factura A', tipoDocumento: 'FACTURA', letra: 'A' },
  { value: 'NOTA_CREDITO_A', label: 'Nota de Crédito A', tipoDocumento: 'NOTA_CREDITO', letra: 'A' },
  { value: 'PRESUPUESTO_X', label: 'Presupuesto X', tipoDocumento: 'PRESUPUESTO', letra: 'X' },
  { value: 'REMITO_X', label: 'Remito X', tipoDocumento: 'REMITO', letra: 'X' },
  { value: 'ORDEN_INTERNA_X', label: 'Orden Interna X', tipoDocumento: 'ORDEN_INTERNA', letra: 'X' },
]

const FILTROS = [
  ['all', 'Todos'], ['FACTURAS', 'Facturas'], ['NOTAS_CREDITO', 'Notas Crédito'], ['REMITOS', 'Remitos'], ['PRESUPUESTOS', 'Presupuestos'], ['ORDEN_INTERNA', 'Orden Interna'],
]

const fmt = (v: any) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt3 = (v: any) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const today = () => new Date().toISOString().slice(0, 10)

function formatCUIT(cuit: string) {
  if (!cuit) return '—'
  const limpio = cuit.replace(/\D/g, '')
  if (limpio.length === 11) return `${limpio.slice(0, 2)}-${limpio.slice(2, 10)}-${limpio.slice(10)}`
  return cuit
}

function buildArcaQrPayload(doc: any, config: any) {
  const cuit = (config?.cuit || '').replace(/\D/g, '')
  const tipoMap: Record<string, string> = { FACTURA_A: '1', FACTURA_B: '6', NOTA_CREDITO_A: '3', PRESUPUESTO_X: '0', REMITO_X: '0', ORDEN_INTERNA_X: '0' }
  const key = `${doc.tipoDocumento}_${doc.letra}`
  const payload = {
    ver: 1,
    fecha: String(doc.fecha || '').slice(0, 10),
    cuit: Number(cuit) || 0,
    ptoVta: Number(doc.puntoVenta) || 0,
    tipoCmp: Number(tipoMap[key] || '0'),
    nroCmp: Number(doc.numero) || 0,
    importe: Number(doc.total || 0),
    moneda: doc.moneda === 'USD' ? 'DOL' : 'PES',
    ctz: Number(doc.tipoCambio || 1),
    tipoDocRec: doc.clienteDocumentoTipo === 'CUIT' || doc.clienteDocumentoTipo === 'C.U.I.T.' ? 80 : doc.clienteDocumentoTipo === 'DNI' || doc.clienteDocumentoTipo === 'D.N.I.' ? 96 : 99,
    nroDocRec: Number((doc.clienteDocumentoNumero || '').replace(/\D/g, '')) || 0,
    tipoCodAut: 'E',
    codAut: Number((doc.cae || '').replace(/\D/g, '')) || 0,
  }
  try { return JSON.stringify(payload) } catch { return '' }
}

function ArcaQRCode({ doc, config }: { doc: any; config: any }) {
  const [dataUri, setDataUri] = useState<string | null>(null)
  useEffect(() => {
    const payload = doc.qrPayload || buildArcaQrPayload(doc, config)
    if (!payload) return
    QRCode.toDataURL(payload, { width: 90, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } }).then(setDataUri).catch(() => setDataUri(null))
  }, [doc, config])
  return dataUri ? <img src={dataUri} alt="QR ARCA" className="h-[90px] w-[90px] shrink-0 border-2 border-slate-900" /> : <div className="grid h-[90px] w-[90px] shrink-0 place-items-center border-2 border-slate-900 text-center text-[8px] font-bold">QR<br />ARCA</div>
}

function DocumentoPreview({ doc, config, copia = 'ORIGINAL' }: { doc: Doc; config: any; copia?: string }) {
  const fiscal = !!doc.fiscal
  const esRemito = doc.tipoDocumento === 'REMITO'
  const showTotales = !esRemito
  const tituloBase = doc.tipoDocumento === 'NOTA_CREDITO' ? 'NOTA DE CRÉDITO' : doc.tipoDocumento === 'ORDEN_INTERNA' ? 'COMPROBANTE INTERNO' : doc.tipoDocumento
  const titulo = `${tituloBase || 'COMPROBANTE'} ${doc.letra || ''}`.trim()
  const fecha = new Date(`${String(doc.fecha || today()).slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR')
  const tieneNumero = doc.puntoVenta && doc.numero !== undefined && doc.numero !== null
  const numero = doc.numeroFormateado && doc.numeroFormateado !== 'Vista previa' ? doc.numeroFormateado : 'Nº a asignar al guardar'
  const items = doc.items || []
  return (
    <div className="mx-auto w-full max-w-[820px] overflow-hidden border-2 border-slate-900 bg-white font-sans text-[10px] leading-[1.3] text-slate-950 shadow-sm print:max-w-none print:shadow-none">
      <div className="relative overflow-hidden border-b-2 border-slate-900 bg-yellow-400 py-2 text-center text-xs font-black tracking-[0.18em] text-slate-900">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.12) 10px, rgba(0,0,0,0.12) 20px)' }} />
        <span className="relative z-10">{copia}</span>
      </div>
      <div className="grid min-h-40 grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] border-b-2 border-slate-900">
        <div className="border-r border-slate-900 p-4">
          <div className="break-words text-[clamp(20px,3vw,30px)] font-black leading-none tracking-tight">{config?.nombreComercial || 'DISTRICON'}</div>
          <div className="mb-4 mt-1 text-xs font-bold tracking-wide">FERRETERÍA INDUSTRIAL</div>
          <div className="font-bold">{config?.razonSocial || 'JULIO CONTI S.R.L.'}</div>
          <div>{config?.domicilioComercial || 'Domicilio comercial no configurado'}</div>
          {config?.telefono && <div>Tel. {config.telefono}</div>}
          <div className="mt-1 break-all italic">{[config?.email, config?.web].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="flex justify-center border-r border-slate-900 pt-3">
          <div className="flex h-16 w-14 flex-col items-center justify-center border-[3px] double border-slate-950 bg-white">
            <div className="text-3xl font-black leading-none">{doc.letra}</div>
            <div className="mt-1 text-[8px] font-bold">CÓD. {doc.codigoComprobante}</div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[clamp(17px,2.5vw,25px)] font-black leading-none">{titulo}</div>
          {tieneNumero ? <>
            <div className="mt-2 text-sm font-bold">Punto de Venta: {doc.puntoVenta}</div>
            <div className="text-sm font-bold">Nº {String(doc.numero).padStart(8, '0')}</div>
          </> : <div className="mt-2 text-sm font-bold">{numero}</div>}
          <div className="mt-3 flex items-baseline gap-2"><span className="font-bold uppercase text-slate-500">Fecha</span><span className="text-base font-black">{fecha}</span></div>
          <div className="mt-3 space-y-0.5">
            <div><b>CUIT Nº:</b> {formatCUIT(config?.cuit)}</div>
            <div><b>Ingresos Brutos:</b> {config?.ingresosBrutos || '—'}</div>
            <div><b>Inicio de actividades:</b> {config?.fechaInicioActividades || '—'}</div>
            <div><b>Condición IVA:</b> {config?.condicionIva || '—'}</div>
          </div>
        </div>
      </div>
      <div className="grid min-h-24 grid-cols-2 border-b-2 border-slate-900">
        <div className="border-r border-slate-900 p-3">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Cliente</div>
          <div className="text-xs font-black">{doc.clienteCodigo ? `${doc.clienteCodigo} · ` : ''}{doc.clienteNombre || 'Seleccioná un cliente'}</div>
          <div>{doc.clienteDomicilio || 'Sin domicilio informado'}</div>
          <div>{[doc.clienteLocalidad, doc.clienteProvincia, doc.clientePais || 'Argentina'].filter(Boolean).join(' · ')}</div>
          <div className="mt-1"><b>{doc.clienteDocumentoTipo || 'CUIT'}:</b> {doc.clienteDocumentoNumero || '—'} · <b>IVA:</b> {doc.clienteCondicionIva || 'Consumidor Final'}</div>
        </div>
        <div className="p-3">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Condiciones comerciales</div>
          <div><b>Moneda:</b> {doc.moneda === 'USD' ? 'U$S (Dólares)' : '$ (Pesos argentinos)'}</div>
          <div><b>Condición de venta:</b> {doc.condicionVenta || 'Cuenta Corriente'}</div>
          <div><b>Lista de precios:</b> {doc.listaPrecio || '1'}</div>
          {fiscal && <div><b>Concepto:</b> Productos</div>}
          <div className="mt-2 text-right text-[9px] text-slate-600">Operador: {doc.operador || 'conti julio'}</div>
        </div>
      </div>
      <table className="w-full table-fixed border-collapse text-[9px]">
        <thead>
          <tr className="border-b-2 border-slate-900 bg-slate-200">
            <th className="w-[14%] border-r border-slate-900 px-1.5 py-1.5 text-left">CÓDIGO</th><th className="border-r border-slate-900 px-1.5 text-left">DETALLE</th><th className="w-[12%] border-r border-slate-900 px-1.5 text-right">CANT.</th>
            {!esRemito && <><th className="w-[14%] border-r border-slate-900 px-1.5 text-right">PRECIO UNIT.</th><th className="w-[8%] border-r border-slate-900 px-1.5 text-right">IVA</th><th className="w-[15%] px-1.5 text-right">SUBTOTAL</th></>}
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} className="border-b border-slate-300 align-top">
              <td className="border-r border-slate-400 px-1.5 py-2 break-words">{it.codigo}</td><td className="border-r border-slate-400 px-1.5 py-2 font-semibold break-words">{it.detalle}</td><td className="border-r border-slate-400 px-1.5 py-2 text-right">{fmt3(it.cantidad)}</td>
              {!esRemito && <><td className="border-r border-slate-400 px-1.5 py-2 text-right">{fmt(it.precioUnitario)}</td><td className="border-r border-slate-400 px-1.5 py-2 text-right">{Number(it.alicuotaIva || 0).toLocaleString('es-AR')}%</td><td className="px-1.5 py-2 text-right font-bold">{fmt(it.subtotal)}</td></>}
            </tr>
          ))}
          {!items.length && <tr><td colSpan={esRemito ? 3 : 6} className="h-28 py-10 text-center italic text-slate-400">Los ítems agregados aparecerán aquí</td></tr>}
          <tr className="h-28"><td className="border-r border-slate-300" /><td className="border-r border-slate-300" /><td className="border-r border-slate-300" />{!esRemito && <><td className="border-r border-slate-300" /><td className="border-r border-slate-300" /><td /></>}</tr>
        </tbody>
      </table>
      {showTotales && <div className="grid grid-cols-[1fr_210px] border-t-2 border-slate-900">
        <div className="grid grid-cols-2 content-start gap-x-4 gap-y-1 p-3 text-right">
          <span className="text-slate-500">Neto gravado</span><b className="font-mono">$ {fmt(doc.netoGravado)}</b>
          {!!Number(doc.iva21) && <><span className="text-slate-500">IVA 21%</span><b className="font-mono">$ {fmt(doc.iva21)}</b></>}
          {!!Number(doc.iva105) && <><span className="text-slate-500">IVA 10,5%</span><b className="font-mono">$ {fmt(doc.iva105)}</b></>}
          {!!Number(doc.percepciones) && <><span className="text-slate-500">Percepciones</span><b className="font-mono">$ {fmt(doc.percepciones)}</b></>}
        </div>
        <div className="border-l-2 border-slate-900 bg-slate-100 p-3 text-right">
          <div className="text-[9px] font-bold uppercase tracking-wider">Total {doc.moneda === 'USD' ? 'U$S' : 'ARS'}</div>
          <div className="mt-1 text-2xl font-black">$ {fmt(doc.total)}</div>
        </div>
      </div>}
      <div className="min-h-14 border-t-2 border-slate-900 p-3 whitespace-pre-wrap text-[9px]"><b className="text-[10px]">Observaciones</b><br />{doc.observaciones || '—'}</div>
      {fiscal ? <div className="border-t-2 border-slate-900">
        <div className="flex items-start gap-4 p-3">
          <ArcaQRCode doc={doc} config={config} />
          <div className="min-w-0">
            <div className="text-lg font-black tracking-tight text-slate-900">ARCA</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Comprobante Autorizado</div>
            <div className="mt-1.5 text-[9px] leading-relaxed text-slate-700">
              La representación gráfica de este comprobante fue generada por el sistema de facturación del contribuyente y cumple con los requisitos de la RG 4291 y RG 4892.
            </div>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">CAE</div>
            <div className="mt-0.5 font-mono text-sm font-black text-slate-900 tracking-wider">{doc.cae || 'Pendiente'}</div>
            <div className="mt-1.5 text-[9px] text-slate-600">Venc. CAE: <b className="text-slate-900">{doc.caeVencimiento ? new Date(doc.caeVencimiento).toLocaleDateString('es-AR') : '—'}</b></div>
          </div>
        </div>
        <div className="relative overflow-hidden border-t-2 border-slate-900 bg-yellow-400 py-1.5 text-center text-[9px] font-black tracking-[0.18em] text-slate-900">
          <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.12) 10px, rgba(0,0,0,0.12) 20px)' }} />
          <span className="relative z-10">ORIGINAL</span>
        </div>
      </div> : <div className="border-t-2 border-slate-900">
        <div className="mx-auto px-8 py-6 text-center">
          <div className="border-2 border-slate-900 px-8 py-2 font-black tracking-widest text-slate-500 inline-block">SIN VALIDEZ FISCAL</div>
        </div>
        <div className="relative overflow-hidden border-t-2 border-slate-900 bg-yellow-400 py-1.5 text-center text-[9px] font-black tracking-[0.18em] text-slate-900">
          <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.12) 10px, rgba(0,0,0,0.12) 20px)' }} />
          <span className="relative z-10">ORIGINAL</span>
        </div>
      </div>}
    </div>
  )
}

export default function ComprobantesTab() {
  const { toast } = useToast()
  const [docs, setDocs] = useState<Doc[]>([])
  const [config, setConfig] = useState<any>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [gases, setGases] = useState<any[]>([])
  const [articulos, setArticulos] = useState<any[]>([])
  const [remitos, setRemitos] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('all')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(false)
  const [preview, setPreview] = useState<Doc | null>(null)
  const [artSearch, setArtSearch] = useState('')
  const [form, setForm] = useState<any>({ tipo: 'FACTURA_B', fecha: today(), moneda: 'ARS', tipoCambio: 1, clienteId: '', items: [] as Item[], observaciones: '', estado: 'BORRADOR', origen: 'MANUAL', condicionVenta: 'Cuenta Corriente' })

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ tipo: filtro })
      if (search) p.set('search', search)
      const [d, c, cli, g] = await Promise.all([fetch(`/api/comprobantes?${p}`), fetch('/api/comprobantes/config'), fetch('/api/clientes'), fetch('/api/gases')])
      setDocs(await d.json())
      setConfig(await c.json())
      setClientes(await cli.json())
      setGases(await g.json())
    } catch { toast({ title: 'Error al cargar comprobantes', variant: 'destructive' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filtro])

  async function buscarArticulos() {
    const res = await fetch(`/api/articulos?per_page=10&search=${encodeURIComponent(artSearch)}`)
    const j = await res.json()
    setArticulos(j.data || [])
  }

  async function cargarOrigenes(clienteId: string) {
    if (!clienteId) return
    const [r, p] = await Promise.all([fetch(`/api/comprobantes/origen/remitos?clienteId=${clienteId}`), fetch(`/api/comprobantes/origen/pedidos?clienteId=${clienteId}`)])
    setRemitos(await r.json().catch(() => []))
    setPedidos(await p.json().catch(() => []))
  }

  function setCliente(id: string) {
    const c = clientes.find(x => x.id === id)
    setForm((f: any) => ({ ...f, clienteId: id, clienteNombre: c?.nombre || '', clienteCodigo: c?.codigoLegacy ? String(c.codigoLegacy) : '', clienteDocumentoNumero: c?.taxId || c?.numeroDocumento || '', clienteDocumentoTipo: c?.taxId ? 'C.U.I.T.' : c?.tipoDocumento || 'D.N.I.', clienteCondicionIva: c?.condicionIva || 'Consumidor Final', clienteDomicilio: c?.domicilioFiscal || [c?.calle, c?.altura].filter(Boolean).join(' '), clienteLocalidad: c?.ciudad, clienteProvincia: c?.provincia, clienteTelefono: c?.telefono }))
    cargarOrigenes(id)
  }

  function addItem(it: Item) { setForm((f: any) => ({ ...f, items: [...f.items, it] })) }
  function removeItem(i: number) { setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) })) }

  async function save() {
    const opt = TIPO_OPTIONS.find(o => o.value === form.tipo) || TIPO_OPTIONS[0]
    if (!form.clienteNombre) return toast({ title: 'Seleccioná un cliente', variant: 'destructive' })
    if (!form.items.length) return toast({ title: 'Agregá ítems', variant: 'destructive' })
    const payload = { ...form, tipoDocumento: opt.tipoDocumento, letra: opt.letra, tipo: undefined }
    const res = await fetch('/api/comprobantes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) return toast({ title: 'No se pudo crear comprobante', variant: 'destructive' })
    const doc = await res.json()
    toast({ title: 'Comprobante creado', description: doc.numeroFormateado })
    setDialog(false); setPreview(doc); setForm({ tipo: 'FACTURA_B', fecha: today(), moneda: 'ARS', tipoCambio: 1, clienteId: '', items: [], observaciones: '', estado: 'BORRADOR', origen: 'MANUAL', condicionVenta: 'Cuenta Corriente' }); load()
  }

  const draftPreview = useMemo(() => {
    const opt = TIPO_OPTIONS.find(o => o.value === form.tipo) || TIPO_OPTIONS[0]
    const total = form.items.reduce((s: number, it: Item) => s + (Number(it.cantidad || 0) * Number(it.precioUnitario || 0)), 0)
    return { ...form, tipoDocumento: opt.tipoDocumento, letra: opt.letra, codigoComprobante: opt.letra === 'B' ? '06' : opt.letra === 'A' && opt.tipoDocumento === 'NOTA_CREDITO' ? '03' : opt.letra === 'A' ? '01' : '00', abreviatura: opt.tipoDocumento === 'NOTA_CREDITO' ? 'Ncre' : opt.tipoDocumento === 'PRESUPUESTO' ? 'Pres' : opt.tipoDocumento === 'REMITO' ? 'Remi' : opt.tipoDocumento === 'ORDEN_INTERNA' ? 'Cint' : 'Fact', numeroFormateado: 'Vista previa', fiscal: opt.tipoDocumento === 'FACTURA' || opt.tipoDocumento === 'NOTA_CREDITO', sinValidezFiscal: !(opt.tipoDocumento === 'FACTURA' || opt.tipoDocumento === 'NOTA_CREDITO'), items: form.items.map((it: Item) => ({ ...it, subtotal: Number(it.cantidad || 0) * Number(it.precioUnitario || 0) })), total, netoGravado: total, iva21: 0, iva105: 0, netoExento: 0, netoNoGravado: 0, percepciones: 0 }
  }, [form])

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-orange-500" />Comprobantes</h2>
      <Button onClick={() => setDialog(true)} className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-1" />Nuevo Comprobante</Button>
    </div>
    <div className="flex gap-2 flex-wrap items-center">
      {FILTROS.map(([v, l]) => <Button key={v} variant={filtro === v ? 'default' : 'outline'} size="sm" onClick={() => setFiltro(v)}>{l}</Button>)}
      <Input className="w-56" placeholder="Buscar cliente/número" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load() }} />
      <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
    </div>
    {loading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div> : <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Número</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Origen</TableHead><TableHead>Moneda</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{docs.map(d => <TableRow key={d.id}><TableCell><Badge variant="outline">{d.tipoDocumento} {d.letra}</Badge></TableCell><TableCell className="font-mono text-xs">{d.numeroFormateado}</TableCell><TableCell>{new Date(d.fecha).toLocaleDateString('es-AR')}</TableCell><TableCell>{d.clienteNombre}</TableCell><TableCell>{d.origen}</TableCell><TableCell>{d.moneda}</TableCell><TableCell className="text-right font-mono">{fmt(d.total)}</TableCell><TableCell><Badge>{d.estado}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setPreview(d)}><Eye className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="text-red-500" onClick={async () => { if(confirm('¿Eliminar comprobante?')) { await fetch(`/api/comprobantes/${d.id}`, { method: 'DELETE' }); load() } }}><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>}

    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="!w-[96vw] !max-w-[1400px] max-h-[94vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuevo Comprobante</DialogTitle></DialogHeader><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Cómo usar esta pantalla:</strong> cargá los datos en la columna izquierda. La hoja de la derecha es solo una vista previa visual del comprobante; el número definitivo y los totales fiscales se asignan al presionar <strong>Guardar</strong>.</div><div className="grid grid-cols-1 2xl:grid-cols-[minmax(480px,0.8fr)_minmax(620px,1.2fr)] gap-5"><div className="min-w-0 space-y-4"><div className="rounded-lg border bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-800">1. Datos principales</div><div className="text-xs text-slate-500">Elegí tipo, fecha, moneda, cliente y condición de venta.</div></div>
      <div className="grid grid-cols-3 gap-3"><div><Label>Tipo</Label><select className="w-full border rounded px-3 py-2 text-sm" value={form.tipo} onChange={e => setForm((f: any) => ({ ...f, tipo: e.target.value }))}>{TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div><div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => setForm((f: any) => ({ ...f, fecha: e.target.value }))} /></div><div><Label>Estado</Label><select className="w-full border rounded px-3 py-2 text-sm" value={form.estado} onChange={e => setForm((f: any) => ({ ...f, estado: e.target.value }))}><option>BORRADOR</option><option>PENDIENTE</option><option>EMITIDO</option><option>PAGADO</option></select></div></div>
      <div className="grid grid-cols-3 gap-3"><div><Label>Moneda</Label><select className="w-full border rounded px-3 py-2 text-sm" value={form.moneda} onChange={e => setForm((f: any) => ({ ...f, moneda: e.target.value }))}><option value="ARS">ARS</option><option value="USD">USD</option></select></div><div><Label>Tipo cambio</Label><Input type="number" step="0.01" value={form.tipoCambio} onChange={e => setForm((f: any) => ({ ...f, tipoCambio: parseFloat(e.target.value) || 1 }))} /></div><div><Label>Condición venta</Label><Input value={form.condicionVenta} onChange={e => setForm((f: any) => ({ ...f, condicionVenta: e.target.value }))} /></div></div>
      <div><Label>Cliente</Label><select className="w-full border rounded px-3 py-2 text-sm" value={form.clienteId} onChange={e => setCliente(e.target.value)}><option value="">Seleccionar...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3"><Input placeholder="CUIT/DNI" value={form.clienteDocumentoNumero || ''} onChange={e => setForm((f: any) => ({ ...f, clienteDocumentoNumero: e.target.value }))} /><Input placeholder="Condición IVA" value={form.clienteCondicionIva || ''} onChange={e => setForm((f: any) => ({ ...f, clienteCondicionIva: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3"><Input placeholder="Domicilio" value={form.clienteDomicilio || ''} onChange={e => setForm((f: any) => ({ ...f, clienteDomicilio: e.target.value }))} /><Input placeholder="Provincia" value={form.clienteProvincia || ''} onChange={e => setForm((f: any) => ({ ...f, clienteProvincia: e.target.value }))} /></div>
      <div className="rounded-lg border bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-800">2. Ítems del comprobante</div><div className="text-xs text-slate-500">Agregá artículos, gases o importá referencias desde remitos/pedidos.</div></div><div className="rounded-lg border p-3 space-y-2"><div className="font-semibold text-sm flex items-center gap-2"><Package className="w-4 h-4" />Agregar artículo</div><div className="flex gap-2"><Input placeholder="Buscar artículo" value={artSearch} onChange={e => setArtSearch(e.target.value)} onKeyDown={e => { if(e.key==='Enter') buscarArticulos() }} /><Button variant="outline" onClick={buscarArticulos}><Search className="w-4 h-4" /></Button></div>{articulos.slice(0,5).map(a => <button key={a.ART_CODI} className="w-full text-left text-xs p-2 rounded hover:bg-slate-50 border" onClick={() => addItem({ codigo: String(a.ART_CODI), detalle: a.ART_DET1, cantidad: 1, unidad: a.ART_UNID || 'unidades', precioUnitario: Number(a.ART_PRE1 || 0), alicuotaIva: Number(config?.ivaDefaultArticulos || 21), articuloId: a.ART_CODI })}>{a.ART_CODI} · {a.ART_DET1} · ${fmt(a.ART_PRE1)}</button>)}</div>
      <div className="rounded-lg border p-3 space-y-2"><div className="font-semibold text-sm">Agregar gas</div><div className="grid grid-cols-2 gap-2">{gases.slice(0,8).map(g => <Button key={g.id} variant="outline" size="sm" onClick={() => addItem({ codigo: g.codigo, detalle: g.nombre, cantidad: 1, unidad: 'unidades', precioUnitario: Number(g.precioVenta || 0), alicuotaIva: Number(config?.ivaDefaultGases || 21), gasId: g.id })}>{g.codigo} · {g.nombre}</Button>)}</div></div>
      {form.clienteId && <div className="rounded-lg border p-3 space-y-2"><div className="font-semibold text-sm">Importar desde remitos/pedidos</div><div className="grid grid-cols-2 gap-2 max-h-36 overflow-auto">{remitos.slice(0,8).map(r => <Button key={r.id} variant="outline" size="sm" onClick={() => setForm((f: any) => ({ ...f, origen: 'REMITO', remitoIds: [...(f.remitoIds || []), r.id], observaciones: `${f.observaciones || ''}\nRemito ${r.numero}` }))}>Remito #{r.numero}</Button>)}{pedidos.slice(0,8).map(p => <Button key={p.id} variant="outline" size="sm" onClick={() => { (p.items || []).forEach((it: any) => addItem({ codigo: '', detalle: it.concepto || 'Ítem pedido', cantidad: 1, unidad: 'unidades', precioUnitario: Number(it.monto || 0), alicuotaIva: 21, pedidoItemId: it.id })); setForm((f: any) => ({ ...f, origen: 'PEDIDO', pedidoIds: [...(f.pedidoIds || []), p.id] })) }}>Pedido #{p.id.slice(-6)}</Button>)}</div></div>}
      <div className="rounded-lg border bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-800">3. Observaciones y datos externos</div><div className="text-xs text-slate-500">Acá van datos de Mercado Libre, Mercado Pago, envío, comprador o referencias internas.</div></div><div><Label>Observaciones / ML / MP</Label><Textarea rows={5} value={form.observaciones} onChange={e => setForm((f: any) => ({ ...f, observaciones: e.target.value }))} placeholder="Venta #, datos de envío, comprador, Mercado Pago, etc." /></div>
      <div className="rounded-lg border overflow-hidden"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Detalle</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>IVA</TableHead><TableHead /></TableRow></TableHeader><TableBody>{form.items.map((it: Item, i: number) => <TableRow key={i}><TableCell>{it.codigo}</TableCell><TableCell className="text-xs">{it.detalle}</TableCell><TableCell><Input className="w-16 h-7" type="number" value={it.cantidad} onChange={e => setForm((f: any) => ({ ...f, items: f.items.map((x: Item, idx: number) => idx === i ? { ...x, cantidad: parseFloat(e.target.value) || 1 } : x) }))} /></TableCell><TableCell><Input className="w-24 h-7" type="number" value={it.precioUnitario} onChange={e => setForm((f: any) => ({ ...f, items: f.items.map((x: Item, idx: number) => idx === i ? { ...x, precioUnitario: parseFloat(e.target.value) || 0 } : x) }))} /></TableCell><TableCell><Input className="w-16 h-7" type="number" value={it.alicuotaIva} onChange={e => setForm((f: any) => ({ ...f, items: f.items.map((x: Item, idx: number) => idx === i ? { ...x, alicuotaIva: parseFloat(e.target.value) || 0 } : x) }))} /></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
    </div><div className="min-w-0 space-y-3 2xl:sticky 2xl:top-0 2xl:self-start"><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-semibold">Vista previa del comprobante</div><div className="text-xs">Esta hoja muestra cómo se verá impreso. No se guarda hasta presionar Guardar. El número real sale del numerador configurado en Tablas.</div></div><div className="overflow-x-auto rounded-lg border bg-slate-100 p-3 shadow-sm"><div className="min-w-[620px]"><DocumentoPreview doc={draftPreview} config={config} /></div></div></div></div><DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={save}><Save className="w-4 h-4 mr-1" />Guardar comprobante</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!preview} onOpenChange={o => { if(!o) setPreview(null) }}><DialogContent className="!w-[96vw] !max-w-[1000px] max-h-[94vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Printer className="w-5 h-5" />Vista previa</DialogTitle></DialogHeader>{preview && <div className="overflow-x-auto"><div className="min-w-[620px]"><DocumentoPreview doc={preview} config={config} /></div></div>}</DialogContent></Dialog>
  </div>
}
