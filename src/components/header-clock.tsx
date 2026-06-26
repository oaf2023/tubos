'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export default function HeaderClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = time.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      <div className="flex flex-col leading-tight">
        <span className="font-mono tabular-nums">{timeStr}</span>
        <span className="text-[10px] text-slate-400">{dateStr}</span>
      </div>
    </div>
  )
}
