'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ArrowLeftRight, Ruler, Weight, Thermometer, Droplets } from 'lucide-react'

type Category = 'length' | 'weight' | 'temperature' | 'volume'

interface UnitDef {
  key: string
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const CATEGORIES: { key: Category; label: string; icon: typeof Ruler }[] = [
  { key: 'length', label: 'Longitud', icon: Ruler },
  { key: 'weight', label: 'Peso', icon: Weight },
  { key: 'temperature', label: 'Temperatura', icon: Thermometer },
  { key: 'volume', label: 'Volumen', icon: Droplets },
]

const UNITS: Record<Category, UnitDef[]> = {
  length: [
    { key: 'km', label: 'km', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { key: 'm', label: 'm', toBase: v => v, fromBase: v => v },
    { key: 'cm', label: 'cm', toBase: v => v / 100, fromBase: v => v * 100 },
    { key: 'mm', label: 'mm', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { key: 'mi', label: 'mi', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
    { key: 'ft', label: 'ft', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    { key: 'in', label: 'in', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
  ],
  weight: [
    { key: 't', label: 't', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { key: 'kg', label: 'kg', toBase: v => v, fromBase: v => v },
    { key: 'g', label: 'g', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { key: 'lb', label: 'lb', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
    { key: 'oz', label: 'oz', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
  ],
  temperature: [
    { key: 'c', label: '°C', toBase: v => v, fromBase: v => v },
    { key: 'f', label: '°F', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
    { key: 'k', label: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
  ],
  volume: [
    { key: 'm3', label: 'm³', toBase: v => v, fromBase: v => v },
    { key: 'l', label: 'L', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { key: 'ml', label: 'mL', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { key: 'gal', label: 'gal', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
    { key: 'qt', label: 'qt', toBase: v => v * 0.946353, fromBase: v => v / 0.946353 },
  ],
}

export default function Conversor() {
  const [category, setCategory] = useState<Category>('length')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('km')
  const [fromVal, setFromVal] = useState('1')
  const [toVal, setToVal] = useState('')

  const units = UNITS[category]

  const convert = (val: string, from: string, to: string): string => {
    const n = parseFloat(val)
    if (isNaN(n)) return ''
    const uFrom = units.find(u => u.key === from)
    const uTo = units.find(u => u.key === to)
    if (!uFrom || !uTo) return ''
    const base = uFrom.toBase(n)
    const result = uTo.fromBase(base)
    return result.toLocaleString('es-AR', { maximumFractionDigits: 10 })
  }

  const handleFromChange = (v: string) => {
    setFromVal(v)
    setToVal(convert(v, fromUnit, toUnit))
  }

  const handleSwap = () => {
    const tmpU = fromUnit; setFromUnit(toUnit); setToUnit(tmpU)
    const tmpV = fromVal; setFromVal(toVal); setToVal(tmpV)
  }

  // Initialize conversion
  useState(() => setToVal(convert(fromVal, fromUnit, toUnit)))

  const catBtnClass = (k: Category) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      category === k ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    }`

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => {
          const Icon = c.icon
          return (
            <button key={c.key} onClick={() => { setCategory(c.key); setFromUnit(UNITS[c.key][0].key); setToUnit(UNITS[c.key][1]?.key || UNITS[c.key][0].key) }} className={catBtnClass(c.key)}>
              <Icon className="w-3.5 h-3.5" />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Conversion inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">De</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={fromVal}
                onChange={e => handleFromChange(e.target.value)}
                className="text-sm"
              />
            </div>
            <select
              value={fromUnit}
              onChange={e => { setFromUnit(e.target.value); setToVal(convert(fromVal, e.target.value, toUnit)) }}
              className="w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {units.map(u => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors active:scale-90"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">A</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={toVal}
                onChange={e => { setToVal(e.target.value); setFromVal(convert(e.target.value, toUnit, fromUnit)) }}
                className="text-sm font-mono bg-slate-50"
              />
            </div>
            <select
              value={toUnit}
              onChange={e => { setToUnit(e.target.value); setToVal(convert(fromVal, fromUnit, e.target.value)) }}
              className="w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {units.map(u => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
