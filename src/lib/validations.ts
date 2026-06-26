import { z } from 'zod'

export const cylinderSchema = z.object({
  numeroSerie: z.string().min(1, 'N° de serie requerido'),
  gasId: z.string().min(1, 'Gas requerido'),
  capacidadLitros: z.number().int().positive(),
  estado: z.string().min(1),
  ubicacionLat: z.number(),
  ubicacionLng: z.number(),
  ubicacionNombre: z.string().min(1),
  provincia: z.string().optional(),
  clienteId: z.string().optional(),
  pesoVacioKg: z.number().positive().optional(),
  pesoTaraKg: z.number().positive().optional(),
  presionActualBar: z.number().int().min(0).optional(),
  fechaProximoRetest: z.string().optional(),
  fabricante: z.string().optional(),
  propietario: z.string().optional(),
  observaciones: z.string().optional(),
})

export const clienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  provincia: z.string().optional(),
  ciudad: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  cuit: z.string().optional(),
  condicionIva: z.string().optional(),
  activo: z.boolean().optional(),
})

export const pedidoSchema = z.object({
  cliente: z.string().min(1),
  clienteId: z.string().min(1),
  operacionEnvase: z.string().min(1),
  renglones: z.array(z.object({
    gasId: z.string().min(1),
    operacionEnvase: z.string().min(1),
    cantidad: z.number().int().positive(),
    capacidadLitros: z.number().int().positive().optional().nullable(),
  })).min(1, 'Al menos un renglón requerido'),
})

export const facturaSchema = z.object({
  clienteId: z.string().min(1),
  tipo: z.string().min(1),
  items: z.array(z.object({
    concepto: z.string().min(1),
    cantidad: z.number().int().positive(),
    precioUnitario: z.number().positive(),
  })).min(1),
})

export const usuarioSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  usuario: z.string().min(3, 'Usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  email: z.string().email().optional().or(z.literal('')),
  activo: z.boolean().optional(),
  rolId: z.string().optional(),
})

export const passwordSchema = z.string().min(6, 'Contraseña debe tener al menos 6 caracteres')
