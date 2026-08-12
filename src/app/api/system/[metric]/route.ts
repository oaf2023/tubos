import { NextRequest, NextResponse } from 'next/server'
import {
  getSnapshot,
  getHealth,
  getCpu,
  getMemory,
  getDisks,
  getNetwork,
  getBattery,
  getProcesses,
  getSystemInfo,
} from '@/lib/telemetry'

// GET /api/system/[metric] - telemetría del servidor (ver Prompt Maestro de Telemetría)
// Métricas: snapshot | health | cpu | memory | disks | network | processes | battery | system
const METRICS: Record<string, () => Promise<unknown> | unknown> = {
  snapshot: () => getSnapshot(),
  health: () => getHealth(),
  cpu: () => getCpu(),
  memory: () => getMemory(),
  disks: () => getDisks(),
  network: () => getNetwork(),
  processes: () => getProcesses(10),
  battery: () => getBattery(),
  system: () => getSystemInfo(),
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ metric: string }> }
) {
  const { metric } = await params
  const handler = METRICS[metric]
  if (!handler) {
    return NextResponse.json(
      { error: `Métrica no soportada: ${metric}. Disponibles: ${Object.keys(METRICS).join(', ')}` },
      { status: 404 }
    )
  }
  try {
    const data = await handler()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error(`GET /api/system/${metric}`, e)
    return NextResponse.json({ error: 'Error al obtener telemetría' }, { status: 500 })
  }
}
