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
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/screenshots/dashboard.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
      { src: '/screenshots/pedido.png', sizes: '720x1280', type: 'image/png', form_factor: 'narrow' },
    ],
  }
}
