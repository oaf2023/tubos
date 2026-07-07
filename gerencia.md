Actuá como arquitecto senior full-stack, especialista en Python, FastAPI, Flet/Streamlit, SQLite/PostgreSQL, React, integraciones API, seguridad OAuth, dashboards gerenciales y sistemas administrativos.

Objetivo:
Crear dentro de la aplicación una nueva opción de menú llamada “Gerencia”, destinada exclusivamente a usuarios de nivel cero (0), con login independiente por usuario y password específico. Esta opción debe mostrar información ejecutiva y KPIs tomando como documento base obligatorio el archivo:

proyecto_ejecutivo_apis_mercado_pago_mercado_libre.docx

Este documento debe ser leído, interpretado y usado como fuente funcional principal para definir el alcance de datos, modelo de integración, indicadores, arquitectura y pantallas de la opción Gerencia.

Contexto funcional:
La opción “Gerencia” debe integrar información proveniente de Mercado Libre Argentina y Mercado Pago Argentina. Mercado Libre debe tratarse como fuente operativa/comercial y Mercado Pago como fuente financiera/contable.

Mercado Libre aporta:
- Órdenes.
- Ventas.
- Packs/carritos.
- Publicaciones.
- Productos.
- Stock.
- Envíos.
- Preguntas.
- Reclamos.
- Devoluciones.
- Estados operativos.
- Notificaciones/webhooks.

Mercado Pago aporta:
- Pagos.
- Cobros.
- Movimientos de cuenta.
- Dinero disponible.
- Dinero pendiente de liberar.
- Comisiones.
- Reembolsos.
- Contracargos.
- Retiros.
- Reportes de conciliación.
- Reportes de liquidaciones.

Requerimiento principal:
Agregar una opción visible en el menú principal llamada:

Gerencia

Esta opción solo debe estar disponible para usuarios con nivel = 0.

Login específico:
Crear un login propio para Gerencia, separado del login operativo normal.

Debe validar:
- usuario_gerencia
- password_gerencia
- nivel = 0
- estado activo

Si el usuario no tiene nivel 0, no debe poder acceder aunque conozca la URL, ruta o endpoint.

Modelo sugerido de tabla:
Crear o adaptar una tabla de usuarios gerenciales con campos mínimos:

- id
- usuario
- password_hash
- nombre
- apellido
- email
- nivel
- estado
- fecha_alta
- ultimo_acceso

Regla:
Nunca guardar password en texto plano. Usar hash seguro.

Pantallas mínimas de Gerencia:

1. Dashboard Ejecutivo
Mostrar:
- Ventas brutas.
- Ventas netas.
- Cantidad de órdenes.
- Ticket promedio.
- Unidades vendidas.
- Dinero cobrado.
- Dinero pendiente de liberar.
- Comisiones.
- Reembolsos.
- Contracargos.
- Reclamos abiertos.
- Envíos pendientes.
- Envíos entregados.
- Publicaciones activas.
- Productos con bajo stock.

2. Conciliación
Cruzar:
- order_id
- pack_id
- payment_id
- source_id
- external_reference
- fecha
- importe orden
- importe pago
- importe neto
- comisión
- diferencia

Mostrar alertas:
- Orden sin pago.
- Pago sin orden.
- Diferencia de importe.
- Dinero retenido.
- Reembolso no conciliado.
- Contracargo pendiente.
- Orden cancelada con movimiento financiero.

3. Mercado Libre Operativo
Mostrar:
- Ventas por período.
- Ventas por producto.
- Órdenes por estado.
- Envíos por estado.
- Reclamos/devoluciones.
- Preguntas sin responder.
- Ranking de productos.
- Publicaciones activas/pausadas.

4. Mercado Pago Financiero
Mostrar:
- Saldo disponible.
- Saldo pendiente.
- Movimientos del período.
- Liquidaciones.
- Retiros.
- Comisiones.
- Reembolsos.
- Contracargos.
- Reportes descargados.
- Evolución de caja.

5. Reportes Gerenciales
Permitir:
- Exportar a Excel.
- Exportar a CSV.
- Filtrar por fecha.
- Filtrar por producto.
- Filtrar por estado.
- Filtrar por canal.
- Generar resumen diario.
- Generar resumen semanal.
- Generar resumen mensual.

KPIs obligatorios:
Implementar como mínimo:

Comerciales:
- Total ventas brutas.
- Total ventas netas.
- Cantidad de órdenes.
- Ticket promedio.
- Unidades vendidas.
- Producto más vendido.
- Publicación más rentable.
- Tasa de cancelación.

Financieros:
- Total cobrado.
- Total neto recibido.
- Total comisiones.
- Total reembolsado.
- Total contracargos.
- Dinero disponible.
- Dinero pendiente de liberar.
- Diferencia de conciliación.

Operativos:
- Envíos pendientes.
- Envíos entregados.
- Envíos demorados.
- Reclamos abiertos.
- Devoluciones abiertas.
- Preguntas sin responder.
- Publicaciones activas.
- Productos con bajo stock.

Arquitectura esperada:
Backend:
- Python.
- FastAPI recomendado.
- Endpoints separados para Gerencia.
- Autenticación con JWT o sesión segura.
- Control de nivel 0 en backend, no solo en frontend.

Base de datos:
Para MVP:
- SQLite aceptado.

Para producción:
- PostgreSQL recomendado.

Tablas sugeridas:
- gerencia_usuarios
- gerencia_sesiones
- ml_orders
- ml_order_items
- ml_shipments
- ml_claims_returns
- ml_questions
- ml_items
- mp_payments
- mp_account_movements
- mp_release_report
- conciliacion_operaciones
- auditoria_sincronizacion

Frontend:
Usar el framework existente de la aplicación. Si la app está en Flet, mantener Flet. Si está en Streamlit, mantener Streamlit. No cambiar tecnología sin necesidad.

Diseño visual:
La opción Gerencia debe tener estética ejecutiva:
- Panel limpio.
- Tarjetas KPI.
- Gráficos de evolución.
- Tablas filtrables.
- Colores sobrios.
- Semáforos para alertas.
- Indicadores verdes, amarillos y rojos.
- Vista rápida para toma de decisión.

Seguridad:
Aplicar:
- Password hasheado.
- Control de sesión.
- Expiración de sesión.
- Bloqueo de acceso por nivel.
- Logs sin tokens.
- Variables de entorno para credenciales.
- Tokens OAuth cifrados.
- Nunca exponer Access Token ni Refresh Token en pantalla.
- Nunca guardar claves de Mercado Pago/Mercado Libre en código fuente.

Integración API:
Preparar conectores para:
- Mercado Libre OAuth.
- Mercado Libre órdenes.
- Mercado Libre packs.
- Mercado Libre envíos.
- Mercado Libre publicaciones.
- Mercado Libre preguntas.
- Mercado Libre reclamos.
- Mercado Pago pagos.
- Mercado Pago reportes Account Money.
- Mercado Pago reportes Released Money.
- Mercado Pago movimientos y conciliación.

Si todavía no existen credenciales reales, crear modo simulación con datos mock, pero dejando la arquitectura lista para conectar las APIs reales.

Regla de desarrollo:
Antes de codificar, leer el documento proyecto_ejecutivo_apis_mercado_pago_mercado_libre.docx y extraer:
- Alcance funcional.
- Modelo de datos.
- KPIs.
- Riesgos.
- Roadmap.
- Fuentes oficiales.
- Recomendaciones técnicas.

Luego implementar en etapas:

Etapa 1:
Crear login Gerencia nivel 0.

Etapa 2:
Crear menú “Gerencia”.

Etapa 3:
Crear dashboard con datos simulados.

Etapa 4:
Crear estructura de tablas.

Etapa 5:
Crear conectores Mercado Libre/Mercado Pago.

Etapa 6:
Crear conciliación.

Etapa 7:
Crear exportación Excel/CSV.

Etapa 8:
Crear logs, auditoría y control de errores.

Condición de aceptación:
El desarrollo se considera correcto cuando:
- Solo nivel 0 puede entrar a Gerencia.
- El menú Gerencia aparece solo para usuarios autorizados.
- El dashboard muestra KPIs comerciales, financieros y operativos.
- La estructura permite conectar Mercado Libre y Mercado Pago.
- Existe una pantalla de conciliación.
- Existen filtros por fecha, producto, estado y canal.
- Los datos pueden exportarse.
- No hay tokens ni passwords expuestos.
- El código respeta la arquitectura existente del proyecto.

Importante:
No construir una pantalla decorativa. Construir una herramienta gerencial real para toma de decisiones, basada en ventas, caja, conciliación, logística, reclamos y rentabilidad.

Resultado esperado:
Una opción “Gerencia” robusta, segura y escalable, preparada para convertirse en el centro de comando ejecutivo de la empresa.