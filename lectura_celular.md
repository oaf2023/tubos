ACTUA COMO: Arquitecto senior de software, analista funcional y lider tecnico full-stack.
NOMBRE DEL PROYECTO:
Lectura Celular de Tubos - Pasaporte Digital del Tubo y Portal Cliente de Reposicion Parcial.
CONTEXTO DE NEGOCIO:
La empresa gestiona tubos/cilindros mediante un ecosistema de trazabilidad que contempla RFID UHF para lectura masiva dentro de la empresa, cabina, deposito, ingreso/egreso de camiones y control de stock. Se requiere complementar ese modelo con lectura por celular cuando el tubo esta fuera de la empresa, principalmente en obra, planta del cliente, deposito externo o punto de entrega.
OBJETIVO PRINCIPAL:
Construir un modulo movil/web que permita al cliente u operario leer un tubo individual mediante NFC o QR, consultar informacion rapida, registrar control, reportar novedades y armar un pedido parcial caminando por la obra o empresa.
PRINCIPIO RECTOR:
RFID UHF = lectura masiva industrial.
NFC/QR celular = lectura individual externa.
Backend central = verdad unica del negocio.
El tag no debe guardar datos sensibles; solo debe contener URL, token o identificador resoluble por API.
ALCANCE FUNCIONAL MINIMO:
1. Login de cliente/usuario.
2. Selector de cliente, obra o sucursal habilitada.
3. Lectura de tubo por NFC cuando el dispositivo lo soporte.
4. Lectura alternativa por QR mediante camara.
5. Resolucion del identificador contra backend.
6. Visualizacion de ficha rapida del tubo:
   - codigo de tubo
   - tipo de gas
   - capacidad
   - estado actual
   - cliente/obra asignada
   - fecha de vencimiento de prueba hidraulica
   - ultimo movimiento
   - alertas operativas
7. Acciones permitidas:
   - registrar control
   - pedir reposicion
   - solicitar retiro
   - mantener en obra
   - reportar vacio
   - reportar problema
   - adjuntar foto opcional u obligatoria segun regla
8. Carrito o pedido parcial:
   - tubos escaneados individualmente
   - cantidades adicionales por tipo de gas
   - observacion general
   - prioridad
   - contacto en obra
   - confirmacion de envio
9. Panel interno basico:
   - listar pedidos enviados por cliente
   - validar pedido
   - cambiar estado a en preparacion
   - cerrar o rechazar con motivo
10. Auditoria:
   - usuario
   - fecha/hora
   - origen NFC/QR
   - GPS si esta disponible
   - estado visto
   - estado nuevo si corresponde
   - foto/evidencia
ROLES Y PERMISOS:
- Publico: solo ve informacion minima si escanea un tubo; no modifica estado.
- Cliente operador: opera tubos asignados a su cuenta/obra.
- Cliente supervisor: confirma pedidos y ve historial de su cuenta.
- Operario reparto: registra entrega, retiro y evidencia.
- Supervisor interno: valida pedidos, corrige estados y consulta auditoria.
- Administrador: administra tubos, tags, usuarios, clientes, obras y reglas.
REGLAS DE SEGURIDAD:
1. Nunca exponer datos sensibles desde el tag.
2. Usar tokens opacos o firmados, no IDs secuenciales simples como unico control.
3. Validar permisos siempre en backend.
4. Un cliente no puede operar tubos que no esten asignados a su cuenta, obra, remito o contrato vigente.
5. Toda accion debe generar evento auditable.
6. Las URLs publicas deben mostrar informacion minima.
7. Para acciones de negocio se exige login.
8. Registrar intentos de lectura de tubos no asignados.
MODELO DE DATOS BASE:
Crear tablas o modelos equivalentes:
- clientes
- obras
- usuarios_cliente
- tubos
- identificadores_tubo
- pedidos_cliente
- pedido_cliente_items
- eventos_tubo
- fotos_evento
- estados_tubo
- tipos_gas
CAMPOS CLAVE:
tubos:
- id
- codigo_tubo
- tipo_gas
- capacidad
- estado_actual
- cliente_actual_id
- obra_actual_id
- fecha_vencimiento_prueba
- activo
identificadores_tubo:
- id
- tubo_id
- tipo_identificador: UHF_EPC, UHF_TID, NFC_UID, NFC_TOKEN, QR_TOKEN
- valor
- activo
pedidos_cliente:
- id
- cliente_id
- obra_id
- usuario_cliente_id
- estado: BORRADOR, ENVIADO, VALIDADO, EN_PREPARACION, EN_REPARTO, ENTREGADO, CERRADO, RECHAZADO
- fecha_creacion
- fecha_envio
- prioridad
- observacion
pedido_cliente_items:
- id
- pedido_id
- tubo_id nullable
- codigo_tubo nullable
- tipo_gas
- capacidad
- accion: REPONER, RETIRAR, MANTENER, REPORTAR
- cantidad
- observacion
- foto_url
eventos_tubo:
- id
- tubo_id
- fecha_hora
- origen: PORTAL_UHF, HANDHELD_UHF, CELULAR_NFC, CELULAR_QR, CLIENTE_MOVIL
- accion: CONSULTA, CONTROL, PEDIDO_REPOSICION, RETIRO, NOVEDAD, ENTREGA, DEVOLUCION
- usuario_id
- cliente_id
- latitud
- longitud
- estado_anterior
- estado_nuevo
- observacion
- hash_evento
ENDPOINTS API REQUERIDOS:
POST /api/mobile/resolve-tag
GET  /api/mobile/tubes/{tube_id}/quick-view
POST /api/mobile/tubes/{tube_id}/event
POST /api/client/orders
POST /api/client/orders/{order_id}/items
POST /api/client/orders/{order_id}/submit
GET  /api/client/orders/{order_id}
GET  /api/client/orders
POST /api/internal/orders/{order_id}/validate
POST /api/internal/orders/{order_id}/prepare
POST /api/internal/orders/{order_id}/reject
POST /api/internal/orders/{order_id}/close
FLUJO PRINCIPAL DE LECTURA:
1. El usuario toca Escanear.
2. Si hay NFC, intentar lectura NFC.
3. Si no hay NFC o falla, ofrecer QR.
4. Enviar payload leido a /api/mobile/resolve-tag.
5. Recibir tube_id, permisos, acciones disponibles y quick_view.
6. Mostrar pantalla simple y accionable.
7. Si el usuario realiza una accion, grabar evento.
8. Si agrega al pedido, sumar item al carrito.
FLUJO DE PEDIDO PARCIAL:
1. Cliente selecciona obra.
2. Escanea tubos vacios o a retirar.
3. Cada tubo se valida contra cliente/obra.
4. El cliente puede agregar cantidades adicionales por gas/capacidad.
5. El sistema muestra resumen.
6. El cliente confirma envio.
7. El pedido pasa a ENVIADO.
8. Panel interno lo valida y lo convierte en preparacion/logistica.
TECNOLOGIA SUGERIDA:
Backend: FastAPI.
Base de datos: PostgreSQL para produccion; SQLite solo para MVP local.
Frontend cliente: PWA responsive mobile-first.
Lectura QR: camara desde navegador.
Lectura NFC: Web NFC solo si el navegador lo soporta; si no, app Android o fallback QR.
Panel interno: web responsive.
Autenticacion: JWT o sesion segura.
Auditoria: tabla eventos_tubo con trazabilidad completa.
REQUISITOS DE IMPLEMENTACION PYTHON:
Todo script Python creado debe iniciar con:
- nombre del script
- fecha
- utilidad
- si se conecta a una API o funcion externa
- descripcion breve de uso
- ejemplo de resultado o devolucion
- aclaracion expresa si consume API
Concurrencia:
Preparar codigo compatible con Python moderno.
Si se implementa concurrencia, incluir bandera de version:
- si Python > 3.13, permitir estrategia concurrente avanzada
- si Python <= 3.13, ejecutar flujo normal/compatible
No sobredimensionar concurrencia en operaciones simples.
CRITERIOS DE UI/UX:
- Mobile first.
- Pantallas limpias.
- Botones grandes.
- Pocos pasos.
- Mensajes claros para cliente.
- Semaforo operativo: OK, Alerta, Bloqueado, Vencido.
- Siempre ofrecer QR como fallback.
- No mostrar datos internos sensibles al cliente.
PANTALLAS MINIMAS:
1. Login.
2. Selector de obra/sucursal.
3. Escanear tubo.
4. Ficha rapida.
5. Acciones del tubo.
6. Carrito pedido parcial.
7. Confirmacion de envio.
8. Historial de pedidos del cliente.
9. Panel interno de pedidos.
10. Detalle de pedido interno.
CRITERIOS DE ACEPTACION:
- Un cliente autenticado puede leer un QR y ver ficha rapida del tubo.
- Si el tubo no pertenece al cliente, se bloquea la operacion y se registra intento.
- El cliente puede agregar tubos escaneados a un pedido parcial.
- El cliente puede agregar cantidades adicionales por gas/capacidad.
- El pedido puede enviarse y verse en panel interno.
- Un supervisor interno puede validar o rechazar pedido.
- Cada accion genera evento auditable.
- El sistema funciona aunque el dispositivo no tenga NFC, usando QR.
ENTREGABLES ESPERADOS DEL AGENTE:
1. Estructura de carpetas del proyecto.
2. Modelo de base de datos.
3. Endpoints FastAPI.
4. Pantallas PWA o prototipo frontend.
5. Flujo de autenticacion basico.
6. Logica de resolucion NFC/QR.
7. Carrito de pedido parcial.
8. Panel interno minimo.
9. Datos seed de prueba.
10. Instrucciones de instalacion y prueba.
11. Pruebas basicas de endpoints.
12. Checklist de despliegue.
ENTREGAR PRIMERO:
Un MVP funcional que demuestre:
- alta de tubos
- asociacion de NFC/QR token
- lectura por QR simulado
- ficha rapida
- armado de pedido parcial
- recepcion en panel interno
- auditoria de eventos
NO HACER:
- No usar el UID NFC como unica seguridad.
- No guardar datos sensibles dentro del tag.
- No asumir que todos los celulares tienen NFC.
- No intentar leer RFID UHF con el celular sin hardware externo.
- No exponer historial comercial completo a usuarios publicos.
- No automatizar facturacion sin validacion en MVP.

# BACKLOG INICIAL SUGERIDO

| Prioridad | Historia de usuario | Criterio de aceptacion |
|-----------|---------------------|------------------------|
| P0 | Como administrador quiero dar de alta un tubo con codigo unico. | El tubo queda activo y visible para asignacion. |
| P0 | Como administrador quiero asociar QR/NFC token a un tubo. | El token resuelve correctamente la ficha del tubo. |
| P0 | Como cliente quiero escanear un QR del tubo. | Veo ficha rapida si el tubo pertenece a mi cuenta. |
| P0 | Como cliente quiero armar pedido parcial con tubos escaneados. | El pedido guarda items y queda en borrador. |
| P0 | Como cliente quiero enviar el pedido. | El panel interno lo recibe como ENVIADO. |
| P1 | Como supervisor interno quiero validar pedido. | El pedido cambia a VALIDADO y registra auditoria. |
| P1 | Como cliente quiero reportar problema con foto. | La novedad queda adjunta al tubo y al pedido. |
| P2 | Como operario quiero trabajar con baja conectividad. | El sistema guarda borrador local y sincroniza despues. |

# FUENTES TECNICAS

Fuentes usadas como marco tecnico para estandares y compatibilidad. Se recomienda validarlas durante la etapa de seleccion final de tags, telefonos y lectores industriales.

| Organismo | Documento | Uso dentro del proyecto |
|-----------|-----------|------------------------|
| NFC Forum | NFC Technology | Compatibilidad de dispositivos NFC con ISO/IEC 14443 A/B, ISO/IEC 15693, NFC Forum Tags y otros modos. |
| NFC Forum | Specifications | Referencia a frecuencia base NFC de 13,56 MHz. |
| Android Developers | Near field communication overview / NFC basics | Modo lector/escritor para leer y escribir tags NFC pasivos; manejo de NDEF. |
| MDN Web Docs | Web NFC API | Web NFC permite intercambiar mensajes NDEF pero tiene disponibilidad limitada y debe revisarse antes de produccion. |
| GS1 | EPC Gen2 Protocol Standard | RFID UHF Gen2 opera en 860-960 MHz y referencia ISO/IEC 18000-63. |
| RAIN Alliance | RAIN RFID System Design Guidelines | RAIN RFID se apoya en interfaces UHF GS1 EPC Gen2 / ISO/IEC 18000-63. |

- https://nfc-forum.org/learn/nfc-technology/
- https://nfc-forum.org/build/specifications
- https://developer.android.com/develop/connectivity/nfc
- https://developer.android.com/develop/connectivity/nfc/nfc
- https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
- https://www.gs1.org/sites/default/files/docs/epc/Gen2_Protocol_Standard.pdf
- https://therainalliance.org/wp-content/uploads/2023/09/RAIN-RFID_System_Design_Guidelines-V2.pdf

# CIERRE EJECUTIVO

La lectura celular agrega valor comercial y operativo cuando el tubo esta fuera de la empresa. Con NFC/QR el cliente se convierte en parte activa del circuito de control y reposicion, mientras que la empresa mantiene gobernanza, trazabilidad y control patrimonial mediante backend y RFID UHF interno.
