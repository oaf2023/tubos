// Configuración de la empresa leída desde variables de entorno
// Permite personalizar nombre, base operativa, etc. sin tocar código.

export const COMPANY_CONFIG = {
  name: process.env.COMPANY_NAME || 'GasTrack AR',
  tagline: process.env.COMPANY_TAGLINE || 'Control de tubos de gases para soldadura',
  baseCity: process.env.COMPANY_BASE_CITY || 'San Nicolás de los Arroyos',
  baseProvince: process.env.COMPANY_BASE_PROVINCE || 'Buenos Aires',
  baseLat: parseFloat(process.env.COMPANY_BASE_LAT || '-33.3293'),
  baseLng: parseFloat(process.env.COMPANY_BASE_LNG || '-60.2244'),
}

export const NEO4J_CONFIG = {
  enabled: process.env.NEO4J_ENABLED === 'true',
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
}
