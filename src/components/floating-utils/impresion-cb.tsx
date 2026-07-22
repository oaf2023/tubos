'use client'

import { useState, useRef, useEffect } from 'react'
import { Printer, Hash, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import JsBarcode from 'jsbarcode'

type Mode = 'single' | 'range'

export default function ImpresionCB() {
  const [mode, setMode] = useState<Mode>('single')
  const [singleCode, setSingleCode] = useState('')
  const [fromCode, setFromCode] = useState('')
  const [toCode, setToCode] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const svgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!generated || codes.length === 0) return
    const container = svgRef.current
    if (!container) return
    container.innerHTML = ''
    codes.forEach((code, i) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      try {
        JsBarcode(svg, code, {
          format: 'CODE128',
          width: 1.5,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        })
        const wrapper = document.createElement('div')
        wrapper.className = 'barcode-item'
        wrapper.style.cssText = 'display:inline-block;margin:8px;padding:8px;border:1px dashed #ccc;border-radius:4px;text-align:center;page-break-inside:avoid;'
        wrapper.appendChild(svg)
        container.appendChild(wrapper)
      } catch {
        // skip invalid codes
      }
    })
  }, [codes, generated])

  const generateSingle = () => {
    const trimmed = singleCode.trim()
    if (!trimmed) { setError('Ingresá un código'); return }
    setError(null)
    setCodes([trimmed])
    setGenerated(true)
  }

  const generateRange = () => {
    const from = fromCode.trim()
    const to = toCode.trim()
    if (!from || !to) { setError('Ingresá código desde y hasta'); return }
    setError(null)

    const prefix = from.match(/^[A-Za-z]*/)?.[0] || ''
    const fromNum = parseInt(from.replace(prefix, ''), 10)
    const toNum = parseInt(to.replace(prefix, ''), 10)

    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
      setError('Los códigos deben tener un sufijo numérico y "desde" ≤ "hasta"')
      return
    }

    const pad = String(fromNum).length
    const list: string[] = []
    for (let i = fromNum; i <= toNum; i++) {
      list.push(`${prefix}${String(i).padStart(pad, '0')}`)
    }
    setCodes(list)
    setGenerated(true)
  }

  const printBarcodes = () => {
    setPrinting(true)
    const printWindow = window.open('', '_blank')
    if (!printWindow) { setPrinting(false); return }

    const content = codes.map(code => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      try {
        JsBarcode(svg, code, {
          format: 'CODE128',
          width: 1.5,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        })
        return svg.outerHTML
      } catch {
        return ''
      }
    }).filter(Boolean).join('')

    printWindow.document.write(`
      <html><head><title>Impresión CB</title>
      <style>
        body { margin: 20px; text-align: center; }
        .item { display: inline-block; margin: 10px; padding: 8px; border: 1px dashed #ccc; border-radius: 4px; page-break-inside: avoid; }
        @media print { .item { border: none; } }
      </style></head><body>
      ${codes.map((code, i) => `<div class="item">${content.split('</svg>')[i] || ''}</div>`).join('')}
      </body></html>
    `)
    printWindow.document.close()
    setTimeout(() => { printWindow.print(); printWindow.close(); setPrinting(false) }, 500)
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-1.5">
        <button
          onClick={() => { setMode('single'); setGenerated(false); setError(null) }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            mode === 'single' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          Por código
        </button>
        <button
          onClick={() => { setMode('range'); setGenerated(false); setError(null) }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            mode === 'range' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Entre códigos
        </button>
      </div>

      {/* Inputs */}
      {mode === 'single' ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={singleCode}
              onChange={e => setSingleCode(e.target.value)}
              placeholder="Ej: TUBO-001 o ABC123"
              className="text-sm"
              onKeyDown={e => e.key === 'Enter' && generateSingle()}
            />
          </div>
          <button
            onClick={generateSingle}
            className="px-4 py-2 rounded-lg bg-teal-500 text-white text-xs font-medium hover:bg-teal-600 transition-colors active:scale-95"
          >
            Generar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={fromCode}
              onChange={e => setFromCode(e.target.value)}
              placeholder="Desde: TUBO-001"
              className="text-sm"
              onKeyDown={e => e.key === 'Enter' && generateRange()}
            />
            <span className="text-slate-400 text-xs">→</span>
            <Input
              value={toCode}
              onChange={e => setToCode(e.target.value)}
              placeholder="Hasta: TUBO-050"
              className="text-sm"
              onKeyDown={e => e.key === 'Enter' && generateRange()}
            />
          </div>
          <button
            onClick={generateRange}
            className="w-full py-2 rounded-lg bg-teal-500 text-white text-xs font-medium hover:bg-teal-600 transition-colors active:scale-95"
          >
            Generar ({fromCode && toCode ? `${codes.length || '...'} códigos` : ''})
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Generated barcodes */}
      {generated && codes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{codes.length} código{codes.length !== 1 ? 's' : ''}</span>
            <button
              onClick={printBarcodes}
              disabled={printing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 text-white text-xs font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 active:scale-95"
            >
              {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              Imprimir
            </button>
          </div>
          <div
            ref={svgRef}
            className="border border-slate-200 rounded-lg p-2 max-h-[400px] overflow-y-auto flex flex-wrap justify-center"
          />
        </div>
      )}
    </div>
  )
}
