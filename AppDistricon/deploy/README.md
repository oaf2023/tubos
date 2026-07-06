# Deploy a PythonAnywhere

## 1. Subir el código

```bash
# Desde tu PC (subir a GitHub)
cd AppDistricon
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tuusuario/appdistricon.git
git push -u origin main

# En PythonAnywhere: consola Bash
git clone https://github.com/tuusuario/appdistricon.git
```

## 2. Crear entorno virtual

```bash
cd ~/appdistricon/backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 3. Configurar variables de entorno

En PythonAnywhere: Web → pestaña Web → Environment variables:

```
SECRET_KEY=...
JWT_SECRET=...
DATABASE_PATH=data/tubos.db
COMPANY_NAME=AppDistricon
COMPANY_BASE_CITY=San Nicolás de los Arroyos
MOCK_MERCADO_LIBRE=true
MOCK_MERCADO_PAGO=true
```

## 4. WSGI file

Editar `/var/www/tuusuario_pythonanywhere_com_wsgi.py`:

```python
import sys
sys.path.insert(0, '/home/tuusuario/appdistricon/backend')
from wsgi import application
```

## 5. Base de datos

```bash
cd ~/appdistricon/backend
python scripts/seed.py
```

Para migrar datos reales desde PostgreSQL:

```bash
export DATABASE_URL="postgresql://..."
python scripts/migrate_data.py
```

## 6. Build del frontend

```bash
cd ~/appdistricon/frontend
# Copiar el proyecto Next.js original aquí
# npm install
# npm run build
# Copiar carpeta out/ a ~/appdistricon/backend/static/
```

## 7. Static files (PythonAnywhere)

Web → Static Files:
- URL: `/static/` → Directorio: `/home/tuusuario/appdistricon/backend/static/`

## 8. Scheduled tasks

Tasks → Scheduled:
- `python ~/appdistricon/backend/scripts/sync_ml.py` — Daily
- `python ~/appdistricon/backend/scripts/sync_mp.py` — Daily

## 9. Reload

Web → botón Reload (verde)
