'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ScannerInputProps {
  onScan: (valor: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function ScannerInput({ onScan, placeholder = 'Escanear o ingresar código...', disabled }: ScannerInputProps) {
  const [cameraOn, setCameraOn] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    if (!cameraOn) return
    let active = true

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        // BarcodeDetector API (Chromium)
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          const formats = ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_93', 'codabar', 'data_matrix', 'aztec']
          const supported = await (window as any).BarcodeDetector.getSupportedFormats()
          const available = formats.filter((f) => supported.includes(f))
          if (available.length > 0) {
            detectorRef.current = new (window as any).BarcodeDetector({ formats: available })
            scanLoop()
          }
        }
      } catch {
        setCameraOn(false)
      }
    }

    async function scanLoop() {
      if (!detectorRef.current || !videoRef.current) return
      scanningRef.current = true
      while (scanningRef.current && cameraOn) {
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current)
          if (barcodes.length > 0) {
            const valor = barcodes[0].rawValue
            if (valor) {
              scanningRef.current = false
              onScan(valor)
              setCameraOn(false)
              return
            }
          }
        } catch { /* ignore frame */ }
        await new Promise((r) => setTimeout(r, 500))
      }
    }

    start()

    return () => {
      active = false
      scanningRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [cameraOn, onScan])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder={placeholder}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualValue.trim()) {
                onScan(manualValue.trim())
                setManualValue('')
              }
            }}
            disabled={disabled}
            className="pr-10"
          />
          {manualValue.trim() && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-700"
              onClick={() => {
                onScan(manualValue.trim())
                setManualValue('')
              }}
            >
              <ScanLine className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant={cameraOn ? 'default' : 'outline'}
          size="icon"
          onClick={() => setCameraOn(!cameraOn)}
          disabled={disabled}
          className={cameraOn ? 'bg-orange-500 hover:bg-orange-600' : ''}
          title={cameraOn ? 'Apagar cámara' : 'Escanear con cámara'}
        >
          {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
        </Button>
      </div>
      {cameraOn && (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 object-contain" />
          <div className="absolute inset-0 border-2 border-orange-400 rounded-lg pointer-events-none" />
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 px-2 py-0.5 rounded">
            Enfocá un código de barras o QR
          </p>
        </div>
      )}
    </div>
  )
}
