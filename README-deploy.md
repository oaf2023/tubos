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
   - **Environment Variables** (requeridas):
      | Variable | Valor | Motivo |
      |---|---|---|
      | `DATABASE_URL` | `postgresql://...` | Connection string de Render PostgreSQL |
      | `JWT_SECRET` | `<secret>` | Firma de tokens de sesión (mismo que en `.env` local) |
      | `NEO4J_ENABLED` | `false` | Render no tiene Neo4j |
      | `NODE_ENV` | `production` | (default) |
      | `PORT` | `10000` | Render asigna automáticamente |

3. Hacer **Manual Deploy → Deploy latest commit**

### Notas importantes
- Se requiere un **PostgreSQL externo** en Render Dashboard → Create New PostgreSQL.
- Configurar `DATABASE_URL` en Render Environment Variables con la connection string provista.
- `JWT_SECRET` debe configurarse en Environment Variables (mismo valor que en `.env` local).
- La migración de schema se hace automáticamente con `prisma db push` en `start.js`.
- En caso de schema nuevo, ejecutar `prisma/migration-enums-safe.sql` y `prisma/migration-decimal.sql` vía psql.

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
