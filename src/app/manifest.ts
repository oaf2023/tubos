import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Control Digital ManejaDatos Districon',
    short_name: 'Districon',
    description: 'Gestión y trazabilidad de cilindros de gases industriales',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f8fafc',
    theme_color: '#ea580c',
    lang: 'es-AR',
    categories: ['business', 'logistics', 'industrial'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
