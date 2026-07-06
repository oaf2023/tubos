export interface Gas {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  presionBar: number
  colorHex: string
  usoPrincipal: string
  categoria: string
  peligro: string
  precioAlquilerDiario?: number | null
  precioAlquilerMensual?: number | null
  precioVenta?: number | null
  _count?: { cylinders: number }
}

export interface Cylinder {
  id: string
  numeroSerie: string
  propietario: string | null
  fabricante: string | null
  paisFabricacion: string | null
  marcaUN: boolean
  normaFabricacion: string | null
  presionTrabajoBar: number | null
  roscacilindro: string | null
  espesorMinParedMm: number | null
  materialAleacion: string | null
  capacidadLitros: number
  diametroMm: number | null
  pesoVacioKg: number | null
  pesoTaraKg: number | null
  pesoMaxLlenadoKg: number | null
  presionEnsayoBar: number | null
  fechaEnsayoInicial: string | null
  fechaUltimoRetest: string | null
  fechaProximoRetest: string
  resultadoInspeccion: string
  inspectorId: string | null
  laboratorio: string | null
  metodoPrueba: string | null
  gasId: string
  gas: Gas
  presionActualBar: number
  masaPorosaId: string | null
  tipoSolvente: string | null
  solventeMasaKg: number | null
  vidaUtilLimite: string | null
  reparaciones: string | null
  observaciones: string | null
  compatibleH2: boolean
  estado: string
  ubicacionLat: number
  ubicacionLng: number
  ubicacionNombre: string
  provincia: string
  clienteId: string | null
  cliente: string | null
  fechaCarga: string | null
}

export interface Location {
  id: string
  nombre: string
  provincia: string
  lat: number
  lng: number
  esBase: boolean
  tipo: string
  direccion?: string | null
  telefono?: string | null
}

export interface Ruta {
  id: string
  nombre: string
  estado: string
  origenNombre: string
  origenLat: number
  origenLng: number
  distanciaKm: number
  duracionHoras: number
  geometry?: string | null
  isRealRoute?: boolean
  routingSource?: string
  optimizationEngine?: string
  paradas: RutaParada[]
  createdAt: string
}

export interface RutaParada {
  id: string
  orden: number
  lat: number
  lng: number
  nombre: string
  provincia: string
  cylinderIds: string
  estado: string
  notas: string | null
  llegada: string | null
  salida: string | null
  clienteId?: string | null
  demandaTubos?: number | null
  pesoKg?: number | null
  ventanaDesde?: number | null
  ventanaHasta?: number | null
  tiempoServicioMin?: number | null
  prioridad?: number | null
  tipoOperacion?: string | null
}

export interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  email: string | null
  taxId: string | null
  contacto: string | null
  telefonoSecundario: string | null
  fechaNacimiento: string | null
  genero: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  calle: string | null
  altura: string | null
  piso: string | null
  codigoPostal: string | null
  ciudad: string | null
  provincia: string | null
  pais: string | null
  empresa: string | null
  rubro: string | null
  condicionIva: string | null
  iibb: string | null
  condicionIibb: string | null
  categoriaMonotributo: string | null
  monotributoActividad: string | null
  monotributoDesde: string | null
  domicilioFiscal: string | null
  limiteCredito: number | null
  firmaDigital: string | null
  tipologia: string | null
  procesoSoldadura: string | null
  materialesBase: string | null
  parametrosIngenieria: string | null
  modoEnvasado: string | null
  gasesConsumo: string | null
  serviciosEspecializados: string | null
  nivelesStockCritico: number | null
  contratoComodato: string | null
  activosEnPosesion: string | null
  fechaVencimientoContrato: string | null
  historialDevoluciones: string | null
  cargosRecurrentes: string | null
  penalizacionesExtravio: string | null
  estadoCuenta: string | null
  estadoCliente: string | null
  ubicaciones: string | null
  lat: number | null
  lng: number | null
  notas: string | null
  activo: boolean
  _count?: { cylinders: number }
}

export interface AlertaPorGas {
  gasId: string
  gas: Gas
  diasAlertaRetest: number
  diasMaxCliente: number
  enAlertaRetest: number
  vencidos: number
}

export interface Stats {
  total: number
  porEstado: { estado: string; cantidad: number }[]
  porGas: { gas: Gas; cantidad: number; capacidadTotal: number }[]
  porCapacidad: { capacidad: number; cantidad: number }[]
  porUbicacion: { ubicacion: string; provincia: string; cantidad: number }[]
  enAlertaVencimiento: Cylinder[]
  alertasPorGas: AlertaPorGas[]
  totalAlertas: number
  capacidadTotalLitros: number
}

export interface Articulo {
  ART_CODI: number
  ART_DET1: string
  ART_COD1: string | null
  ART_COD2: string | null
  ART_COD3: string | null
  ART_COD4: number | null
  ART_COD5: string | null
  ART_DET2: string | null
  ART_DET3: string | null
  ART_DET4: string | null
  ART_DCOR: string | null
  ART_PRE1: number | null
  ART_PRE2: number | null
  ART_PRE3: number | null
  ART_PRE4: number | null
  ART_UTI1: number | null
  ART_UTI2: number | null
  ART_UTI3: number | null
  ART_UTI4: number | null
  ART_COST: number | null
  ART_COSR: number | null
  ART_TIVA: number | null
  ART_TIMP: number | null
  ART_STIN: number | null
  ART_SMIN: number | null
  ART_SMAX: number | null
  ART_UNID: string | null
  ART_MARC: number | null
  ART_RUBR: number | null
  ART_SUBR: number | null
  ART_DPTO: number | null
  COM_COMP: string | null
  ART_OBS: string | null
  ART_LIST: number | null
  ART_DTO1: number | null
  ART_DTO2: number | null
  ART_DTO3: number | null
  ART_DTOG: number | null
  ART_FLET: number | null
  ART_OFER: number | null
  ART_POFE: number | null
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  color: string
  label: string
  count?: number
  isBase?: boolean
  popup: string
}
