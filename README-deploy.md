---
title: Despliegue en Render y PythonAnywhere
---

## Para Render (recomendado)

1. Crear Web Service desde GitHub
2. Configurar:

   - **Runtime**: Node
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     node start.js
     ```
   - **Environment Variables** (opcionales, el proyecto usa defaults):
     | Variable | Valor | Motivo |
     |---|---|---|
     | `NEO4J_ENABLED` | `false` | Render no tiene Neo4j |
     | `NODE_ENV` | `production` | (default) |
     | `PORT` | `10000` | Render asigna automáticamente |

3. Hacer **Manual Deploy → Deploy latest commit**

### Notas importantes
- `DATABASE_URL` **no necesita configurarse** — `start.js` calcula la ruta absoluta automáticamente.
- La base SQLite `db/custom.db` viene con datos de prueba (80 cilindros, 15 clientes, etc.).
- En el tier free de Render, el filesystem es efímero: los datos se pierden al redeploy. Para persistencia, usar Starter+ ($7/mes) con disco persistente.

---

## Para PythonAnywhere

1. Subir el zip del proyecto y descomprimirlo
2. En Bash console:
   ```bash
   cd ~/gastrack
   npm install
   npx prisma generate
   npx prisma db push
   npm run build
   ```
3. En **Web** → **Manual Configuration** → **Node.js**:
   - **Startup command**: `node serve.js`
   - **Working directory**: `/home/tu-usuario/gastrack`
   - **Environment vars**:
     - `NODE_ENV=production`
     - `PORT=8080`
     - `NEO4J_ENABLED=false`

4. Reload la web app

---

## Archivos clave para deploy

| Archivo | Rol |
|---|---|
| `start.js` | Entrypoint para Render — setea `DATABASE_URL` absoluta y arranca el servidor |
| `serve.js` | Entrypoint para PythonAnywhere — corre `prisma db push` + `prisma generate` + arranca |
| `Procfile` | Declara `web: node start.js` para Render |
| `copy-standalone.js` | Post-build: copia assets, db, config y env al directorio standalone |
| `.env` | Config local + build (ruta relativa de DB, desactivar Neo4j en prod) |
