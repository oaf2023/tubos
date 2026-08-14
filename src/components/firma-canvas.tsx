'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FirmaCanvasProps {
  onChange: (dataUrl: string | null) => void
  height?: number
}

export default function FirmaCanvas({ onChange, height = 180 }: FirmaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const strokesRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth || 320
    canvas.width = w * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, height)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [height])

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    e.preventDefault()
    strokesRef.current += 1
    drawingRef.current = true
    const p = getPos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    e.preventDefault()
    const p = getPos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const end = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    onChange(strokesRef.current > 0 ? canvasRef.current!.toDataURL('image/png') : null)
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    strokesRef.current = 0
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border-2 border-slate-300 overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height, display: 'block' }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={clear} className="text-xs">
        <Eraser className="w-3 h-3 mr-1" /> Borrar firma
      </Button>
    </div>
  )
}