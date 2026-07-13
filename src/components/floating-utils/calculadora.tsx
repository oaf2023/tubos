'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STORAGE_KEY = 'util_calc_hist'

interface CalcEntry {
  expr: string
  result: string
}

export default function Calculadora() {
  const [display, setDisplay] = useState('0')
  const [memory, setMemory] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)
  const [prev, setPrev] = useState<number | null>(null)
  const [clearNext, setClearNext] = useState(false)
  const [history, setHistory] = useState<CalcEntry[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setHistory(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const saveEntry = useCallback((expr: string, result: string) => {
    setHistory(h => {
      const next = [...h, { expr, result }].slice(-50)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const inputDigit = (d: string) => {
    if (clearNext) { setDisplay(d); setClearNext(false); return }
    setDisplay(display === '0' ? d : display + d)
  }

  const inputDot = () => {
    if (clearNext) { setDisplay('0.'); setClearNext(false); return }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  const handleOp = (nextOp: string) => {
    const n = parseFloat(display)
    if (op && prev !== null) {
      const r = compute(prev, n, op)
      setDisplay(String(r))
      setPrev(r)
    } else {
      setPrev(n)
    }
    setOp(nextOp)
    setClearNext(true)
  }

  const compute = (a: number, b: number, operator: string): number => {
    switch (operator) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b !== 0 ? a / b : 0
      default: return b
    }
  }

  const equals = () => {
    const n = parseFloat(display)
    if (op && prev !== null) {
      const r = compute(prev, n, op)
      const expr = `${prev} ${op} ${n}`
      setDisplay(String(r))
      saveEntry(expr, String(r))
      setOp(null)
      setPrev(null)
      setClearNext(true)
    }
  }

  const clear = () => { setDisplay('0'); setOp(null); setPrev(null); setClearNext(false) }

  const percent = () => setDisplay(String(parseFloat(display) / 100))

  const negate = () => setDisplay(String(-parseFloat(display)))

  const sqrt = () => {
    const n = parseFloat(display)
    if (n >= 0) setDisplay(String(Math.sqrt(n)))
  }

  const btnClass = "h-10 sm:h-12 text-sm sm:text-base font-medium rounded-lg transition-colors active:scale-95 touch-manipulation"

  return (
    <div className="space-y-4">
      {/* Display */}
      <div className="bg-slate-900 rounded-xl p-4">
        <div className="text-right text-white text-3xl sm:text-4xl font-mono truncate tabular-nums">
          {display}
        </div>
      </div>

      {/* Calculator grid */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={clear} className={`${btnClass} bg-red-100 text-red-700 hover:bg-red-200`}>C</button>
        <button onClick={negate} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>±</button>
        <button onClick={percent} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>%</button>
        <button onClick={() => handleOp('/')} className={`${btnClass} ${op === '/' ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>÷</button>

        <button onClick={() => inputDigit('7')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>7</button>
        <button onClick={() => inputDigit('8')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>8</button>
        <button onClick={() => inputDigit('9')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>9</button>
        <button onClick={() => handleOp('*')} className={`${btnClass} ${op === '*' ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>×</button>

        <button onClick={() => inputDigit('4')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>4</button>
        <button onClick={() => inputDigit('5')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>5</button>
        <button onClick={() => inputDigit('6')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>6</button>
        <button onClick={() => handleOp('-')} className={`${btnClass} ${op === '-' ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>−</button>

        <button onClick={() => inputDigit('1')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>1</button>
        <button onClick={() => inputDigit('2')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>2</button>
        <button onClick={() => inputDigit('3')} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>3</button>
        <button onClick={() => handleOp('+')} className={`${btnClass} ${op === '+' ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>+</button>

        <button onClick={sqrt} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>√</button>
        <button onClick={() => inputDigit('0')} className={`${btnClass} bg-slate-100 hover:bg-slate-200 col-span-2`}>0</button>
        <button onClick={inputDot} className={`${btnClass} bg-slate-100 hover:bg-slate-200`}>.</button>
        <button onClick={equals} className={`${btnClass} bg-amber-500 text-white hover:bg-amber-600`}>=</button>
      </div>

      {/* Memory */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setMemory(parseFloat(display)); setClearNext(true) }}>M+</Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { if (memory !== null) { setDisplay(String(memory)); setClearNext(true) } }}>MR</Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setMemory(null)}>MC</Button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Historial</span>
            <button onClick={clearHistory} className="text-xs text-red-500 hover:underline">Limpiar</button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-0.5 text-xs text-slate-500 font-mono">
            {history.toReversed().map((e, i) => (
              <div key={i} className="flex justify-between gap-4 px-2 py-1 rounded hover:bg-slate-50">
                <span>{e.expr}</span>
                <span className="font-semibold text-slate-700">= {e.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
