---
title: Instalación en PythonAnywhere
---

## Requisitos
- PythonAnywhere account (gratuita o de pago)
- Node.js 20+ habilitado (ver debajo)

## Paso a paso

### 1. Subir el proyecto
- En PythonAnywhere, ve a **Files** tab
- Sube `gastrack-portable.zip`
- En **Bash console**:
  ```bash
  cd ~/
  unzip gastrack-portable.zip -d gastrack
  cd gastrack
  ```

### 2. Instalar dependencias
```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Build (producción)
```bash
npm run build
```
Esto compila Next.js y copia `public/`, `db/`, `.env` y `prisma/schema.prisma` dentro de `.next/standalone/`.

### 4. Configurar Web App
- En PythonAnywhere, ve a **Web** tab → **Add a new web app**
- Elige **Manual Configuration** → **Node.js** (versión 20+)
- En **Code**:
  - **Startup command**: `node serve.js`
  - **Working directory**: `/home/tu-usuario/gastrack`
- En **Virtualenv**: dejalo vacío (no es Python)

### 5. Variables de entorno (Web → Environment variables)
| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` (el que asigna PythonAnywhere) |
| `NEO4J_ENABLED` | `false` (Neo4j no está disponible en PythonAnywhere) |

### 6. Iniciar la app
- **Reload** la web app desde el Web tab
- Tu app estará en: `https://tu-usuario.pythonanywhere.com`

### 7. Sincronizar base de datos inicial
```bash
npx tsx scripts/seed.ts
```

---

## Para Render

### Opción recomendada (más simple)

1. Subir el repo a GitHub:
   ```bash
   git init
   git add .
   git commit -m "gastrack v1.2"
   gh repo create gastrack --private --push
   ```
2. En Render → New Web Service → conectar repo
3. **Build command**:
   ```bash
   npm install && npx prisma generate && npm run build
   ```
4. **Start command**:
   ```bash
   node start.js
   ```
5. **Environment variables** en Render:
   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `NEO4J_ENABLED` | `false` |

   ⚠️ No es necesario `DATABASE_URL` como variable — `start.js` la calcula automáticamente como ruta absoluta desde el directorio del proyecto.

⚠️ **Importante**: Render free tier tiene filesystem efímero — la base SQLite se pierde al redeploy. Soluciones: upgrade a Starter ($7/mes con disco persistente) o migrar a Turso (libSQL cloud).

---

## Archivos modificados para el port
| Archivo | Cambio |
|---|---|
| `.env` | `DATABASE_URL=file:./db/custom.db` (ruta relativa Unix) |
| `package.json` | `build` usa `next build && node copy-standalone.js`; `start` usa `node` (no `bun`) |
| `copy-standalone.js` | **Nuevo** — copia `.next/static/`, `public/`, `db/`, `.env`, `prisma/` al build standalone |
| `serve.js` | **Nuevo** — entrypoint para PythonAnywhere con ruta absoluta de DB |
| `start.js` | **Nuevo** — entrypoint para Render con ruta absoluta de DB |
| `Procfile` | **Nuevo** — `web: node start.js` |

No se modificó ningún archivo de lógica de negocio (`page.tsx`, API routes, etc.).
