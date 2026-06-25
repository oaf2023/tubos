Desarrollar una plataforma de gestión logística para cilindros/tubos de gas industrial usando RFID UHF.

El sistema debe contemplar cilindros identificados con tags RFID UHF on-metal. El identificador principal del tag será el TID leído desde el chip RFID, asociado en la base de datos al número de serie físico del cilindro.

Objetivo:
Automatizar el stock de cilindros llenos, vacíos, en reparto, en carga, mantenimiento y baja, mediante zonas físicas de lectura RFID.

Arquitectura esperada:

* Lectores RFID UHF instalados por zona.
* ESP32 o gateway IoT enviando eventos.
* API backend en Python con FastAPI.
* Base de datos SQLite para MVP y PostgreSQL para producción.
* Dashboard administrativo en Flet.
* Comunicación inicial por HTTP y preparada para MQTT.
* Registro histórico completo de movimientos.

Entidades principales:

* cilindros
* tags_rfid
* tipos_gas
* zonas_lectura
* lectores_iot
* eventos_rfid
* stock_gas
* movimientos_stock
* usuarios
* clientes
* repartos

Reglas de negocio:
Cada lector representa una zona operativa. Cuando un cilindro es leído en una zona, el sistema debe interpretar automáticamente el cambio de estado.

Ejemplos:

* Zona VACIOS: el cilindro pasa a estado VACIO_DEPOSITO.
* Zona LLENOS: el cilindro pasa a estado LLENO_DISPONIBLE.
* Zona SALIDA_REPARTO: el cilindro pasa a EN_REPARTO.
* Zona ENVIO_CARGA: el cilindro pasa a ENVIADO_A_CARGA.
* Zona RECEPCION_CARGA: el cilindro pasa a LLENO_DISPONIBLE.

El sistema debe evitar duplicados por lecturas repetidas dentro de una ventana configurable de tiempo.

Debe existir trazabilidad completa:

* fecha y hora
* TID RFID
* número de serie del cilindro
* tipo de gas
* estado anterior
* estado nuevo
* zona
* lector
* usuario si corresponde
* observación
* origen del evento: automático/manual

Endpoints mínimos:

* POST /api/iot/rfid/evento
* GET /api/cilindros
* POST /api/cilindros
* GET /api/cilindros/{id}/historial
* GET /api/stock/resumen
* GET /api/stock/tipo-gas/{gas}
* POST /api/tags/asociar
* POST /api/movimientos/manual
* GET /api/lectores
* POST /api/lectores

Dashboard:
Debe mostrar stock por tipo de gas, cantidad de llenos, vacíos, en reparto, en carga, mantenimiento y alertas de inconsistencias.

El sistema debe estar preparado para múltiples depósitos, múltiples empresas y expansión futura hacia activos no cilindros.
