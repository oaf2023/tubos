export type MotivoDevolucion = 'VACIO' | 'MEDIO_LLENO' | 'DANIADO' | 'NO_PAGO' | 'OTRO'

export type EstadoCilindroValido =
  | 'LLENO'
  | 'VACIO'
  | 'EN_CLIENTE'
  | 'EN_REPARTO'
  | 'EN_CARGA'
  | 'EN_DEPOSITO'
  | 'MANTENIMIENTO'
  | 'RETENIDO'
  | 'PH_VENCIDO'
  | 'BAJA'
  | 'EXTRAVIADO'

export const MOTIVOS_DEVOLUCION: { valor: MotivoDevolucion; label: string }[] = [
  { valor: 'VACIO', label: 'Vacío' },
  { valor: 'MEDIO_LLENO', label: 'Medio lleno' },
  { valor: 'DANIADO', label: 'Dañado' },
  { valor: 'NO_PAGO', label: 'No pagó' },
  { valor: 'OTRO', label: 'Otro' },
]

const MOTIVO_ESTADO: Record<MotivoDevolucion, EstadoCilindroValido> = {
  VACIO: 'VACIO',
  MEDIO_LLENO: 'EN_DEPOSITO',
  DANIADO: 'MANTENIMIENTO',
  NO_PAGO: 'RETENIDO',
  OTRO: 'EN_DEPOSITO',
}

export function motivoDevolucionAEstado(motivo: string): EstadoCilindroValido {
  return MOTIVO_ESTADO[motivo as MotivoDevolucion] || 'EN_DEPOSITO'
}
