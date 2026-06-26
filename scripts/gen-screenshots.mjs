import sharp from 'sharp'
import { readFileSync } from 'fs'

const W = 1280, H = 720

await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 248, g: 250, b: 252, alpha: 1 } }
}).composite([
  { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#f8fafc"/>
    <rect x="24" y="24" width="1232" height="80" rx="12" fill="#fff" stroke="#e2e8f0"/>
    <circle cx="54" cy="64" r="20" fill="url(#g)"/>
    <text x="88" y="58" font-family="sans-serif" font-size="22" font-weight="bold" fill="#1e293b">Control Digital</text>
    <text x="88" y="78" font-family="sans-serif" font-size="13" fill="#94a3b8">Districon · Ferreteria Industrial · Gases para soldadura</text>
    <defs><linearGradient id="g"><stop offset="0" stop-color="#ea580c"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs>
    <rect x="24" y="120" width="400" height="140" rx="12" fill="#fff" stroke="#e2e8f0"/>
    <text x="44" y="156" font-family="sans-serif" font-size="13" font-weight="600" fill="#64748b">TOTAL TUBOS</text>
    <text x="44" y="200" font-family="sans-serif" font-size="36" font-weight="800" fill="#ea580c">1,234</text>
    <rect x="448" y="120" width="400" height="140" rx="12" fill="#fff" stroke="#e2e8f0"/>
    <text x="468" y="156" font-family="sans-serif" font-size="13" font-weight="600" fill="#64748b">CLIENTES ACTIVOS</text>
    <text x="468" y="200" font-family="sans-serif" font-size="36" font-weight="800" fill="#ea580c">89</text>
    <rect x="872" y="120" width="384" height="140" rx="12" fill="#fff" stroke="#e2e8f0"/>
    <text x="892" y="156" font-family="sans-serif" font-size="13" font-weight="600" fill="#64748b">PEDIDOS DEL MES</text>
    <text x="892" y="200" font-family="sans-serif" font-size="36" font-weight="800" fill="#ea580c">156</text>
    <rect x="24" y="280" width="600" height="360" rx="12" fill="#fff" stroke="#e2e8f0"/>
    <circle cx="324" cy="440" r="80" fill="none" stroke="#fecaca" stroke-width="20"/>
    <circle cx="324" cy="440" r="80" fill="none" stroke="#ea580c" stroke-width="20" stroke-dasharray="200 100" transform="rotate(-90 324 440)"/>
    <text x="324" y="448" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1e293b" text-anchor="middle">Llenos 45%</text>
    <rect x="644" y="280" width="612" height="360" rx="12" fill="#fff" stroke="#e2e8f0"/>
  </svg>`), top: 0, left: 0 }
]).png().toFile('public/screenshots/dashboard.png')
console.log('Created dashboard.png')

// Narrow: Pedido mobile
await sharp({
  create: { width: 720, height: 1280, channels: 4, background: { r: 248, g: 250, b: 252, alpha: 1 } }
}).composite([
  { input: Buffer.from(`<svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="1280" fill="#f8fafc"/>
    <rect x="0" y="0" width="720" height="60" fill="#fff" stroke="#e2e8f0"/>
    <circle cx="30" cy="30" r="16" fill="url(#g)"/>
    <text x="56" y="36" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1e293b">Control Digital</text>
    <text x="56" y="50" font-family="sans-serif" font-size="11" fill="#94a3b8">Portal Clientes</text>
    <defs><linearGradient id="g"><stop offset="0" stop-color="#ea580c"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs>
    <rect x="16" y="80" width="688" height="200" rx="12" fill="#fff" stroke="#e2e8f0"/>
    <text x="36" y="112" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1e293b">Nuevo Pedido</text>
    <rect x="36" y="128" width="200" height="36" rx="8" fill="#f1f5f9"/>
    <text x="50" y="152" font-family="sans-serif" font-size="13" fill="#64748b">Seleccionar gas...</text>
    <rect x="252" y="128" width="140" height="36" rx="8" fill="#f1f5f9"/>
    <text x="266" y="152" font-family="sans-serif" font-size="13" fill="#64748b">10 L</text>
    <rect x="408" y="128" width="180" height="36" rx="8" fill="#f1f5f9"/>
    <text x="422" y="152" font-family="sans-serif" font-size="13" fill="#64748b">Con envase</text>
    <rect x="36" y="180" width="100" height="36" rx="8" fill="#f1f5f9"/>
    <text x="50" y="204" font-family="sans-serif" font-size="13" fill="#64748b">Cantidad: 3</text>
    <rect x="480" y="240" width="200" height="36" rx="8" fill="url(#g)"/>
    <text x="580" y="264" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">Enviar Pedido</text>
    <rect x="16" y="300" width="688" height="200" rx="12" fill="#fff" stroke="#e2e8f0"/>
    <text x="36" y="332" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1e293b">Tus tubos en posesión</text>
    <rect x="36" y="348" width="120" height="20" rx="4" fill="#f1f5f9"/>
    <text x="44" y="363" font-family="sans-serif" font-size="11" fill="#94a3b8">N° Serie</text>
    <rect x="168" y="348" width="120" height="20" rx="4" fill="#f1f5f9"/>
    <text x="176" y="363" font-family="sans-serif" font-size="11" fill="#94a3b8">Gas</text>
    <text x="36" y="396" font-family="sans-serif" font-size="12" fill="#1e293b">AR-001</text>
    <text x="168" y="396" font-family="sans-serif" font-size="12" fill="#1e293b">Argón</text>
  </svg>`), top: 0, left: 0 }
]).png().toFile('public/screenshots/pedido.png')
console.log('Created pedido.png')
