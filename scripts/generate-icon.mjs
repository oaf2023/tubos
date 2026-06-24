import sharp from 'sharp'

const w = 256
const h = 256

const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="48" fill="url(#g)"/>
  <text x="128" y="110" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="90" fill="white">GT</text>
  <text x="128" y="170" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="28" fill="rgba(255,255,255,0.8)">GAS</text>
</svg>`

await sharp(Buffer.from(svg)).resize(w, h).png().toFile('resources/icon.png')
console.log('Icon created at resources/icon.png')
