// Nombre: index.ts
// Fecha: 2026-08-12
// Versión: 1.0.0
// Utilidad: API pública del módulo de telemetría (snapshot, health score, alertas)
// Descripción: Agrega los colectores de forma resiliente (una métrica fallida no impide el resto) y expone funciones públicas simples
// Dependencias: ./collectors
// API externa: No requerida
// Integración: GET /api/system/snapshot, GET /api/system/health
// Compatibilidad: Linux (producción) / Windows / macOS (desarrollo)
import os from 'os'
import {
  getSystemInfo,
  getCpuInfo,
  getMemoryInfo,
  getDiskInfo,
  getTopProcesses,
  getNetworkInfo,
  getBatteryInfo,
  getTemperatureInfo,
  getGpuInfo,
  getServiceStatus,
  getDockerInfo,
} from './collectors'

export * from './collectors'

export interface Alert {
  severity: 'critical' | 'warning' | 'info'
  metric: string
  value: number | null
  threshold: number | null
  message: string
}

export interface Snapshot {
  timestamp: string
  device_id: string
  system: unknown
  cpu: unknown
  memory: unknown
  disks: unknown
  network: unknown
  battery: unknown
  top_processes: unknown
  temperatures: unknown
  gpu: unknown
  services: unknown
  docker: unknown
  health: unknown
  alerts: Alert[]
}

function deviceId(): string {
  return `${os.hostname()}-${process.pid}`
}

// ---------- HEALTH SCORE (ponderación configurable, renormalizada según métricas disponibles) ----------
const WEIGHTS = {
  cpu: 20,
  ram: 20,
  disk: 20,
  temperature: 15,
  network: 10,
  battery: 5,
  services: 10,
}

function scoreComponent(value: number | null, threshold: number): number | null {
  if (value == null) return null
  return Math.max(0, Math.min(100, 100 - value))
}

export function classifyHealth(score: number): string {
  if (score >= 90) return 'EXCELENTE'
  if (score >= 75) return 'NORMAL'
  if (score >= 60) return 'ATENCION'
  if (score >= 40) return 'DEGRADADO'
  return 'CRITICO'
}

export async function getSnapshot(): Promise<Snapshot> {
  const system = getSystemInfo()
  const cpu = getCpuInfo()
  const memory = getMemoryInfo()
  const [disks, topProcesses, network, gpu] = await Promise.all([
    getDiskInfo(),
    getTopProcesses(5),
    getNetworkInfo(1),
    getGpuInfo(),
  ])
  const battery = getBatteryInfo()
  const temperatures = getTemperatureInfo()
  const services = getServiceStatus([])
  const docker = getDockerInfo()

  const values: Record<string, number | null> = {
    cpu: cpu.success ? ((cpu.data as any)?.usage_percent as number | undefined) ?? null : null,
    ram: memory.success ? ((memory.data as any)?.usage_percent as number | undefined) ?? null : null,
    disk: disks.success
      ? Math.max(0, ...((disks.data as any)?.disks || []).map((d: any) => d.usage_percent ?? 0))
      : null,
    temperature: temperatures.success
      ? ((temperatures.data as any)?.cpu_celsius as number | undefined) ?? null
      : null,
    battery: battery.success
      ? ((battery.data as any)?.percent as number | undefined) ?? null
      : null,
  }

  // Ponderación renormalizada sobre las métricas disponibles
  let weighted = 0
  let totalWeight = 0
  const components: { metric: string; weight: number; score: number }[] = []
  for (const [metric, w] of Object.entries(WEIGHTS)) {
    if (metric === 'network') continue // se evalúa aparte (up/down)
    if (metric === 'services') continue // no implementado
    const v = values[metric as keyof typeof values]
    const score = scoreComponent(v, w)
    if (score != null) {
      weighted += score * w
      totalWeight += w
      components.push({ metric, weight: w, score })
    }
  }
  const netUp = network.success && ((network.data as any)?.interfaces?.length ?? 0) > 0
  if (netUp) {
    weighted += 100 * WEIGHTS.network
    totalWeight += WEIGHTS.network
    components.push({ metric: 'network', weight: WEIGHTS.network, score: 100 })
  }
  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0

  // ---------- ALERTAS ----------
  const alerts: Alert[] = []
  const pushAlert = (severity: Alert['severity'], metric: string, value: number | null, threshold: number | null, message: string) =>
    alerts.push({ severity, metric, value, threshold, message })
  if (values.cpu != null && values.cpu > 90) pushAlert('critical', 'cpu', values.cpu, 90, 'Uso crítico de CPU')
  if (values.ram != null && values.ram > 90) pushAlert('critical', 'ram', values.ram, 90, 'Uso crítico de memoria RAM')
  if (disks.success) {
    for (const d of (disks.data as any)?.disks || []) {
      if (d.usage_percent > 90) pushAlert('critical', 'disk', d.usage_percent, 90, `Uso crítico del disco ${d.mount}`)
      if (d.free_gb < 5) pushAlert('warning', 'disk_free', d.free_gb, 5, `Espacio libre menor a 5 GB en ${d.mount}`)
    }
  }
  if (values.temperature != null && values.temperature > 85) pushAlert('critical', 'temperature', values.temperature, 85, 'Temperatura de CPU crítica')
  if (values.battery != null && values.battery < 10) pushAlert('warning', 'battery', values.battery, 10, 'Batería por debajo de 10%')

  return {
    timestamp: new Date().toISOString(),
    device_id: deviceId(),
    system: system.data,
    cpu: cpu.data,
    memory: memory.data,
    disks: disks.data,
    network: network.data,
    battery: battery.data,
    top_processes: (topProcesses.data as any)?.processes ?? [],
    temperatures: temperatures.data,
    gpu: gpu.data,
    services: services.data,
    docker: docker.data,
    health: {
      score,
      classification: classifyHealth(score),
      components,
      timestamp: new Date().toISOString(),
    },
    alerts,
  }
}

export async function getHealth() {
  const snap = await getSnapshot()
  const cpu = (snap.cpu as any)?.usage_percent ?? null
  const ram = (snap.memory as any)?.usage_percent ?? null
  const disk = (snap.disks as any)?.disks?.length
    ? Math.max(0, ...(snap.disks as any).disks.map((d: any) => d.usage_percent ?? 0))
    : null
  const score = (snap.health as any)?.score ?? 0
  return {
    status: score >= 75 ? 'healthy' : score >= 40 ? 'degraded' : 'critical',
    score,
    cpu_percent: cpu,
    ram_percent: ram,
    disk_percent: disk,
    alerts: snap.alerts,
    timestamp: new Date().toISOString(),
  }
}

export async function getCpu() {
  return getCpuInfo()
}
export async function getMemory() {
  return getMemoryInfo()
}
export async function getDisks() {
  return getDiskInfo()
}
export async function getNetwork() {
  return getNetworkInfo(1)
}
export async function getBattery() {
  return getBatteryInfo()
}
export async function getProcesses(limit = 5) {
  return getTopProcesses(limit)
}
