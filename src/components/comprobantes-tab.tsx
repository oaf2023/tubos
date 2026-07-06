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

type Item = { codigo?: string; detalle: string; cantidad: number; unidad?: string; precioUnitario: number; bonificacionPorcentaje?: number; alicuotaIva: number; subtotal?: number; articuloId?: number; gasId?: string }
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

function DocumentoPreview({ doc, config, copia = 'ORIGINAL' }: { doc: Doc; config: any; copia?: string }) {
  const fiscal = !!doc.fiscal
  const esRemito = doc.tipoDocumento === 'REMITO'
  const showTotales = !esRemito
  const titulo = doc.tipoDocumento === 'NOTA_CREDITO' ? 'NOTA DE CREDITO' : doc.tipoDocumento === 'ORDEN_INTERNA' ? 'COMPROBANTE INTERNO' : doc.tipoDocumento
  return (
    <div className="bg-white text-black border border-black w-full max-w-[820px] mx-auto text-[11px] leading-tight font-sans print:shadow-none">
      <div className="text-center font-bold text-sm border-b border-black">({copia})</div>
      <div className="grid grid-cols-[1fr_70px_1fr] border-b border-black min-h-32">
        <div className="p-4 border-r border-black">
          <div className="text-3xl font-black tracking-tight">{config?.nombreComercial || 'DISTRICON'}</div>
          <div className="font-bold text-sm mb-3">FERRETERIA INDUSTRIAL</div>
          <div className="font-semibold">{config?.razonSocial || 'JULIO CONTI S.R.L.'}</div>
          <div>{config?.domicilioComercial}</div>
          <div>{config?.telefono}</div>
          <div className="italic">{config?.email} - {config?.web}</div>
        </div>
        <div className="border-r border-black flex flex-col items-center justify-start pt-2">
          <div className="border border-black w-12 h-14 flex flex-col items-center justify-center">
            <div className="text-3xl font-light">{doc.letra}</div>
            <div className="text-[9px]">Cod.{doc.codigoComprobante}</div>
          </div>
        </div>
        <div className="p-3">
          <div className="text-2xl font-black">{titulo}</div>
          <div className="text-lg font-bold">{doc.numeroFormateado || `${doc.abreviatura} ${doc.letra}`}</div>
          <div className="text-xl font-black mt-2">Fecha: {new Date(doc.fecha || Date.now()).toLocaleDateString('es-AR')}</div>
          <div className="mt-3">Cuit:{config?.cuit} - {config?.condicionIva}</div>
          <div>Ing.Brutos: {config?.ingresosBrutos}</div>
          <div>Inicio Actividades: {config?.fechaInicioActividades}</div>
          <div className="italic">{fiscal ? `(FACTURA ELECTRONICA CAE: ${doc.cae || 'MANUAL/PENDIENTE'})` : '(COMPROBANTE SIN VALIDEZ FISCAL)'}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-b border-black min-h-20">
        <div className="p-3 border-r border-black">
          <div>{doc.clienteCodigo ? `${doc.clienteCodigo}-` : ''}{doc.clienteNombre}</div>
          <div>{doc.clienteDomicilio || 'SIN DOMICILIO'}</div>
          <div>{doc.clienteLocalidad || ''} {doc.clienteProvincia || ''} {doc.clientePais || 'ARGENTINA'}</div>
          <div>{doc.clienteTelefono || ''}</div>
          <div>{doc.clienteCondicionIva || 'Consumidor Final'} - {doc.clienteDocumentoTipo || 'C.U.I.T.'}: {doc.clienteDocumentoNumero || ''} IB:</div>
        </div>
        <div className="p-3">
          <div>Moneda: {doc.moneda === 'USD' ? 'U$S (Dólares)' : '$ (Pesos)'}</div>
          <div>Lista: {doc.listaPrecio || '1'}</div>
          {fiscal && <><div>Conceptos Emitidos: 1:Producto</div><div>Fecha Vencimiento: {doc.fechaVencimiento ? new Date(doc.fechaVencimiento).toLocaleDateString('es-AR') : '-'}</div></>}
          <div className="text-right mt-6">Op: {doc.operador || '0003-conti julio'}</div>
        </div>
      </div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-200 border-b border-black">
            <th className="border-r border-black text-left w-28">CODIGO</th><th className="border-r border-black text-left">DETALLE</th><th className="border-r border-black text-right w-16">CANTIDAD</th>
            {!esRemito && <><th className="border-r border-black text-right w-20">PRECIO</th><th className="border-r border-black text-right w-12">IVA</th><th className="border-r border-black text-right w-12">IMP</th><th className="text-right w-24">SUBTOTAL</th></>}
          </tr>
        </thead>
        <tbody>
          {(doc.items || []).map((it: any, i: number) => (
            <tr key={i} className="border-b border-black/50">
              <td className="border-r border-black px-1">{it.codigo}</td><td className="border-r border-black px-1 font-bold">{it.detalle}</td><td className="border-r border-black px-1 text-right">{fmt3(it.cantidad)}</td>
              {!esRemito && <><td className="border-r border-black px-1 text-right">{fmt(it.precioUnitario)}</td><td className="border-r border-black px-1 text-right">{Number(it.alicuotaIva || 0).toFixed(2)}%</td><td className="border-r border-black px-1 text-right"></td><td className="px-1 text-right font-bold">{fmt(it.subtotal)}</td></>}
            </tr>
          ))}
          <tr><td className="border-r border-black h-[360px]" /><td className="border-r border-black" /><td className="border-r border-black" />{!esRemito && <><td className="border-r border-black" /><td className="border-r border-black" /><td className="border-r border-black" /><td /></>}</tr>
        </tbody>
      </table>
      {showTotales && <div className="grid grid-cols-[1fr_180px] border-t border-black">
        <div>
          <div className="grid grid-cols-9 text-[10px] border-b border-black text-center">
            <span>Neto Grav.</span><span>Iva:21.00%</span><span>Neto Otro</span><span>Iva:10.50%</span><span>Iva Otro</span><span>No Categ.</span><span>Neto Exento</span><span>N.NoGrav.</span><span>Percep.</span>
            <span>{fmt(doc.netoGravado)}</span><span>{fmt(doc.iva21)}</span><span>0,00</span><span>{fmt(doc.iva105)}</span><span>0,00</span><span>0,00</span><span>{fmt(doc.netoExento)}</span><span>{fmt(doc.netoNoGravado)}</span><span>{fmt(doc.percepciones)}</span>
          </div>
          <div className="p-2 border-b border-black">Pagado: {doc.mpPaymentMethod || doc.condicionVenta || ''}</div>
        </div>
        <div className="border-l border-black p-2 text-right">
          <div className="text-xs">TOTAL {doc.moneda === 'USD' ? 'U$S (Dólares)' : '$ (Pesos)'}</div>
          <div className="text-3xl font-black">{fmt(doc.total)}</div>
        </div>
      </div>}
      <div className="border-t border-black min-h-16 p-2 whitespace-pre-wrap">Observaciones:
{doc.observaciones || ''}</div>
      <div className="border-t border-black min-h-20 flex items-center gap-6 p-3">
        {fiscal ? <><div className="w-20 h-20 border border-black grid place-items-center text-[9px]">QR ARCA</div><div className="font-bold">ARCA<br /><span className="text-[10px]">Comprobante Autorizado</span></div><div className="flex-1 h-8 border-y border-black bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,#fff_2px,#fff_5px)]" /><div className="font-bold text-right">CAE: {doc.cae || '-'}<br />Vto CAE: {doc.caeVencimiento ? new Date(doc.caeVencimiento).toLocaleDateString('es-AR') : '-'}</div></> : <div className="mx-auto w-80 h-8 bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,#fff_2px,#fff_5px)]" />}
      </div>
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

    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuevo Comprobante</DialogTitle></DialogHeader><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Cómo usar esta pantalla:</strong> cargá los datos en la columna izquierda. La hoja de la derecha es solo una vista previa visual del comprobante; el número definitivo y los totales fiscales se asignan al presionar <strong>Guardar</strong>.</div><div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] gap-5"><div className="space-y-4"><div className="rounded-lg border bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-800">1. Datos principales</div><div className="text-xs text-slate-500">Elegí tipo, fecha, moneda, cliente y condición de venta.</div></div>
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
    </div><div className="space-y-3"><div className="sticky top-0 z-10 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-semibold">Vista previa del comprobante</div><div className="text-xs">Esta hoja muestra cómo se verá impreso. No se guarda hasta presionar Guardar. El número real sale del numerador configurado en Tablas.</div></div><div className="rounded-lg border bg-white p-3 shadow-sm"><DocumentoPreview doc={draftPreview} config={config} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={save}><Save className="w-4 h-4 mr-1" />Guardar comprobante</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!preview} onOpenChange={o => { if(!o) setPreview(null) }}><DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Printer className="w-5 h-5" />Vista previa</DialogTitle></DialogHeader>{preview && <DocumentoPreview doc={preview} config={config} />}</DialogContent></Dialog>
  </div>
}
