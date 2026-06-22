// Datos de referencia - Tipos de gases para soldadura (investigación técnica)
// Norma de color: EN 1089-3 (aplicada en Argentina)
// Presiones referenciales según procedimientos operativos estándar

export interface GasInfo {
  codigo: string
  nombre: string
  descripcion: string
  presionBar: number
  colorHex: string
  usoPrincipal: string
  categoria: string // INERTE, ACTIVO, COMBUSTIBLE, COMBURENTE
}

export const GASES: GasInfo[] = [
  {
    codigo: 'AR',
    nombre: 'Argón',
    descripcion:
      'Gas inerte noble, no reactivo. Base de la soldadura TIG (GTAW) y MIG (GMAW) para aceros inoxidables, aluminio y cobre. Proporciona un arco estable y limpia el cordón de soldadura.',
    presionBar: 200,
    colorHex: '#006400', // Verde oscuro
    usoPrincipal: 'Soldadura TIG (GTAW) y MIG (GMAW) - metales no ferrosos',
    categoria: 'INERTE',
  },
  {
    codigo: 'CO2',
    nombre: 'Dióxido de Carbono',
    descripcion:
      'Gas activo, económico, utilizado para soldadura MIG/MAG en acero al carbono. Produce salpique más que las mezclas pero penetra bien en chapas gruesas. Tubo de media presión.',
    presionBar: 60,
    colorHex: '#808080', // Gris
    usoPrincipal: 'Soldadura MIG/MAG en acero al carbono',
    categoria: 'ACTIVO',
  },
  {
    codigo: 'MIX-7525',
    nombre: 'Mezcla Argón 75% / CO2 25%',
    descripcion:
      'Mezcla universal conocida como "C25" o "Mixto". Combina la estabilidad del argón con la penetración del CO2. Es el gas más utilizado en talleres de herrería y carpintería metálica.',
    presionBar: 200,
    colorHex: '#2E8B57', // Verde mar
    usoPrincipal: 'Soldadura MIG/MAG universal en acero al carbono',
    categoria: 'ACTIVO',
  },
  {
    codigo: 'O2',
    nombre: 'Oxígeno',
    descripcion:
      'Gas comburente que mantiene y aviva la combustión. Esencial para oxicorte y corte por plasma. Se almacena a 200 bar. NUNCA debe entrar en contacto con aceites o grasas (riesgo de explosión).',
    presionBar: 200,
    colorHex: '#FFFFFF', // Blanco
    usoPrincipal: 'Oxicorte y soldadura oxiacetilénica (comburente)',
    categoria: 'COMBURENTE',
  },
  {
    codigo: 'C2H2',
    nombre: 'Acetileno',
    descripcion:
      'Gas combustible que produce la llama de mayor temperatura (hasta 3.160 °C). Se disuelve en acetona dentro del tubo, con poroso monolítico. Presión limitada a 19 bar por seguridad. Tubo en posición vertical obligatoria.',
    presionBar: 19,
    colorHex: '#800000', // Granate / Bordó
    usoPrincipal: 'Soldadura autógena y oxicorte',
    categoria: 'COMBUSTIBLE',
  },
  {
    codigo: 'N2',
    nombre: 'Nitrógeno',
    descripcion:
      'Gas inerte económico. Se usa para purga de cañerías de acero inoxidable antes y durante la soldadura TIG, evitando la oxidación interna. También para calibración y pruebas neumáticas.',
    presionBar: 200,
    colorHex: '#000000', // Negro
    usoPrincipal: 'Purga de cañerías y soldadura TIG de acero inoxidable',
    categoria: 'INERTE',
  },
  {
    codigo: 'HE',
    nombre: 'Helio',
    descripcion:
      'Gas inerte más liviano que el argón. Aporta mayor aporte térmico, ideal para soldadura TIG de aluminio de gran espesor y cobre. Más caro que el argón. Se usa puro o en mezcla.',
    presionBar: 200,
    colorHex: '#8B4513', // Marrón
    usoPrincipal: 'Soldadura TIG de aluminio de espesor y cobre',
    categoria: 'INERTE',
  },
  {
    codigo: 'AR-HE',
    nombre: 'Mezcla Argón 50% / Helio 50%',
    descripcion:
      'Mezcla que combina la facilidad de encendido del arco del argón con el mayor aporte térmico del helio. Recomendada para soldadura TIG de aluminio de mediano y gran espesor.',
    presionBar: 200,
    colorHex: '#A0522D', // Marrón claro
    usoPrincipal: 'Soldadura TIG de aluminio de mediano/gran espesor',
    categoria: 'INERTE',
  },
  {
    codigo: 'H2',
    nombre: 'Hidrógeno',
    descripcion:
      'Gas combustible de muy bajo peso molecular. Se usa como gas de protección en soldadura plasma de acero inoxidable y en mezclas para procesos especiales. Requiere manipulación cuidadosa.',
    presionBar: 200,
    colorHex: '#FF0000', // Rojo
    usoPrincipal: 'Soldadura plasma de acero inoxidable',
    categoria: 'COMBUSTIBLE',
  },
]

// Capacidades estándar de tubos (cilindros)
export const CAPACIDADES_LITROS = [5, 10, 20, 40, 50]

// Base operativa principal: San Nicolás de los Arroyos
export const BASE_SAN_NICOLAS = {
  nombre: 'San Nicolás de los Arroyos',
  provincia: 'Buenos Aires',
  lat: -33.3293,
  lng: -60.2244,
  esBase: true,
  tipo: 'BASE',
}

// Ciudades de distribución en Argentina (con coordenadas reales)
export interface CityInfo {
  nombre: string
  provincia: string
  lat: number
  lng: number
  tipo: string
}

export const CIUDADES_ARGENTINA: CityInfo[] = [
  BASE_SAN_NICOLAS as CityInfo,
  { nombre: 'Rosario', provincia: 'Santa Fe', lat: -32.9442, lng: -60.6505, tipo: 'CLIENTE' },
  { nombre: 'Buenos Aires (CABA)', provincia: 'Buenos Aires', lat: -34.6037, lng: -58.3816, tipo: 'SUCURSAL' },
  { nombre: 'Córdoba', provincia: 'Córdoba', lat: -31.4201, lng: -64.1888, tipo: 'CLIENTE' },
  { nombre: 'Mendoza', provincia: 'Mendoza', lat: -32.8895, lng: -68.8458, tipo: 'CLIENTE' },
  { nombre: 'La Plata', provincia: 'Buenos Aires', lat: -34.9215, lng: -57.9545, tipo: 'CLIENTE' },
  { nombre: 'Mar del Plata', provincia: 'Buenos Aires', lat: -38.0023, lng: -57.5575, tipo: 'CLIENTE' },
  { nombre: 'Pergamino', provincia: 'Buenos Aires', lat: -33.8969, lng: -60.579, tipo: 'CLIENTE' },
  { nombre: 'Zárate', provincia: 'Buenos Aires', lat: -34.0965, lng: -59.0284, tipo: 'CLIENTE' },
  { nombre: 'Campana', provincia: 'Buenos Aires', lat: -34.1714, lng: -58.9592, tipo: 'CLIENTE' },
  { nombre: 'San Pedro', provincia: 'Buenos Aires', lat: -33.6839, lng: -59.6717, tipo: 'CLIENTE' },
  { nombre: 'Concepción del Uruguay', provincia: 'Entre Ríos', lat: -32.4846, lng: -58.2312, tipo: 'CLIENTE' },
  { nombre: 'Concordia', provincia: 'Entre Ríos', lat: -31.3923, lng: -58.0208, tipo: 'CLIENTE' },
  { nombre: 'Santa Fe', provincia: 'Santa Fe', lat: -31.6107, lng: -60.6939, tipo: 'CLIENTE' },
  { nombre: 'Rafaela', provincia: 'Santa Fe', lat: -31.2503, lng: -61.4867, tipo: 'CLIENTE' },
  { nombre: 'Paraná', provincia: 'Entre Ríos', lat: -31.2526, lng: -60.2136, tipo: 'CLIENTE' },
  { nombre: 'San Martín (Mendoza)', provincia: 'Mendoza', lat: -33.0829, lng: -68.4718, tipo: 'CLIENTE' },
  { nombre: 'Villa María', provincia: 'Córdoba', lat: -32.4075, lng: -63.2473, tipo: 'CLIENTE' },
  { nombre: 'Río Cuarto', provincia: 'Córdoba', lat: -33.1308, lng: -64.35, tipo: 'CLIENTE' },
  { nombre: 'Bahía Blanca', provincia: 'Buenos Aires', lat: -38.7183, lng: -62.2664, tipo: 'CLIENTE' },
  { nombre: 'Tandil', provincia: 'Buenos Aires', lat: -37.3217, lng: -59.1342, tipo: 'CLIENTE' },
  { nombre: 'Junín', provincia: 'Buenos Aires', lat: -34.5939, lng: -60.9457, tipo: 'CLIENTE' },
  { nombre: 'Mercedes', provincia: 'Buenos Aires', lat: -34.6517, lng: -59.4302, tipo: 'CLIENTE' },
  { nombre: 'San Luis', provincia: 'San Luis', lat: -33.295, lng: -66.3356, tipo: 'CLIENTE' },
]

// Clientes de ejemplo (empresas del rubro metalúrgico / construcción)
export const CLIENTES_EJEMPLO = [
  'Metalúrgica San Martín S.A.',
  'Construcciones del Plata S.R.L.',
  'Taller Soldadura Rossi Hnos.',
  'Herrería Artística Belgrano',
  'Estructuras Metálicas del Litoral',
  'Calderas y Tanques Argentina',
  'Ferretería Industrial El Torno',
  'Soldaduras y Servicios Pérez',
  'Metalfor S.A.I.C.',
  'Aceros Bragado S.A.',
  'Industrias Metalúrgicas Pampa',
  'Taller Mecánico Don Bosco',
  'Constructora Andina',
  'Carrocerías del Centro',
  'Soldadura Especializada Gutiérrez',
]

export const ESTADOS = ['LLENO', 'EN_USO', 'VACIO', 'MANTENIMIENTO', 'TRANSITO'] as const
