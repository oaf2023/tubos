# Frontend — Next.js → Flask static serving

## ¿Qué es el frontend?

El frontend **es el mismo proyecto Next.js original** en `../tubos/`.
No se modifica ni se duplica. El build de exportación estático:

1. Toma el proyecto `tubos/` como fuente
2. Lo configura temporalmente como `output: 'export'`
3. Inyecta `generateStaticParams` en rutas dinámicas (`navegar/[token]`)
4. Ejecuta `npm run build`
5. Restaura todos los archivos originales
6. Copia la carpeta `out/` a `backend/static/`

El resultado es un SPA (Single Page Application) puro: HTML + CSS + JS.
Flask lo sirve en `/` y el enrutamiento del lado del cliente lo maneja Next.js.

## Build

### En Windows (PowerShell 7+):

```powershell
cd AppDistricon\frontend
.\build.ps1
```

### En Linux/Mac (si clonaste el repo en PA):

```bash
cd AppDistricon/frontend
pwsh -File build.ps1
# O manualmente:
cd ../../tubos
# Configurar next.config.ts con output:'export'
npm run build
cp -r out/ ../AppDistricon/backend/static/
# Restaurar next.config.ts
```

## ¿Qué incluye el build?

| Archivo | Origen |
|---------|--------|
| `static/index.html` | Página principal SPA |
| `static/_next/static/*` | Bundles JS/CSS empaquetados |
| `static/api/` | ❌ No se incluye (la API es Flask) |
| `static/navegar/*/index.html` | Páginas de navegación (client-side) |
| `static/manifest.webmanifest` | PWA manifest |

## Notas técnicas

- `next/image` → deshabilitado (`unoptimized: true`)
- `next.config.ts` temporal → export config con `reactStrictMode: false`
- El middleware (`src/middleware.ts`) no corre en export estático
- La autenticación JWT viaja en cookie httpOnly (`session`)
- Flask sirve el frontend + la API en el mismo dominio (sin CORS)
- Rutas no encontradas → Flask sirve `index.html` → Next.js router client-side
