Desarrollar un módulo avanzado de cabina inteligente para control logístico de cilindros/tubos de gas industrial.

Este módulo debe complementar la plataforma RFID de stock, agregando validación física mediante RFID UHF, peso, cámara y reglas de consistencia.

Objetivo:
Crear una estación de control donde cada cilindro que ingresa o egresa sea identificado automáticamente, fotografiado, pesado y validado contra su información registrada.

Arquitectura esperada:

* Lector RFID UHF fijo con antena direccional.
* Tags RFID UHF on-metal.
* Cámara IP o USB.
* Balanza mediante celda de carga y módulo HX711 o balanza industrial con salida serial.
* ESP32, Raspberry Pi o mini PC como gateway.
* API backend en Python con FastAPI.
* Base SQLite para MVP y PostgreSQL para producción.
* Dashboard Flet.
* Registro de evidencias fotográficas.
* Validación automática de inconsistencias.

Entidades principales:

* cabinas
* sensores_cabina
* lecturas_rfid
* lecturas_peso
* evidencias_foto
* validaciones_cabina
* alertas
* cilindros
* tipos_gas
* reglas_peso
* eventos_trazabilidad

Flujo operativo:
Cuando un cilindro pasa por la cabina:

1. Se lee el TID RFID.
2. Se identifica el cilindro asociado.
3. Se captura una imagen.
4. Se registra el peso.
5. Se compara el peso real contra el peso esperado.
6. Se determina si el cilindro está lleno, vacío o inconsistente.
7. Se genera un evento de trazabilidad.
8. Se actualiza el stock si corresponde.
9. Se genera alerta si hay diferencia crítica.

Reglas de validación:

* Si el RFID no existe, generar alerta de cilindro no registrado.
* Si el peso no coincide con el estado declarado, generar alerta.
* Si el cilindro está marcado como lleno pero pesa como vacío, marcar inconsistencia.
* Si pasa por una zona no autorizada, registrar evento sospechoso.
* Si hay múltiples lecturas del mismo cilindro en pocos segundos, consolidar en un único evento.

Endpoints mínimos:

* POST /api/cabina/evento
* POST /api/cabina/foto
* POST /api/cabina/peso
* GET /api/cabina/{id}/estado
* GET /api/cabina/eventos
* GET /api/cabina/alertas
* POST /api/reglas-peso
* GET /api/cilindros/{id}/validacion

Dashboard:
Debe mostrar:

* últimos cilindros procesados
* foto capturada
* peso detectado
* peso esperado
* diagnóstico
* estado final
* alertas activas
* historial de paso por cabina

El módulo debe estar preparado para integrarse con energía autónoma, UPS, panel solar y monitoreo de estado eléctrico.
