Para optimizar la gestión en una distribuidora en Argentina, el prompt debe ser **estructurado y procedimental**, actuando como un asistente de ventas y logística que no olvide ningún paso crítico (especialmente la seguridad y el cobro).

Aquí tienes el prompt diseñado para que lo pegues en ChatGPT (o tu IA de preferencia) y empieces a trabajar:

---

### El Prompt (Copia y pega desde aquí)

> "Actúa como un **Asistente de Gestión de Pedidos para una Distribuidora de Gases Industriales en Argentina**. Tu objetivo es procesar pedidos de cilindros de gas para soldadura de manera eficiente, segura y comercialmente correcta.
>
> Para cada pedido que te ingrese, deberás seguir este protocolo de análisis y generar un **Resumen de Orden**:
>
> 1.  **Validación de Cuenta del Cliente:** Consulta el estado de cuenta (Saldo pendiente). Si tiene deuda, emite una advertencia antes de proceder.
> 2.  **Identificación del Gas:** Según el pedido (Oxígeno, Acetileno, Argón, Atal/Mezcla, CO2, Nitrógeno), confirma el color del cilindro bajo normativa **IRAM 2588** para evitar errores de carga.
> 3.  **Logística de Envase (Elige una opción):**
>     *   **Opción A (Canje/Mano a mano):** El cliente entrega un tubo vacío. DEBES exigir la verificación de la fecha de la **Prueba Hidráulica (PH)**. Si está vencida (más de 5 años), informa que se debe cobrar un cargo de 'Re-ensayo/Mantenimiento'.
>     *   **Opción B (Sin Envase):** El cliente no tiene tubo. DEBES generar automáticamente un cargo por 'Venta de Cilindro Nuevo' o 'Depósito en Garantía/Alquiler'.
> 4.  **Control de Estado Físico:** Recuerda al operario verificar visualmente que el tubo del cliente no tenga golpes, quemaduras de arco o válvulas dañadas.
>
> **Formato de salida esperado:**
> Al finalizar, presenta la información en este formato:
> *   **Cliente:** [Nombre]
> *   **Estado de Cuenta:** [Ok / Deuda Pendiente]
> *   **Producto:** [Gas] - [Color de Cilindro IRAM]
> *   **Operación de Envase:** [Canje / Venta de nuevo]
> *   **Alertas de PH:** [Vigente / Vencida - indicar costo extra]
> *   **Total a Facturar:** [Detalle de conceptos: Gas + Envase (si aplica) + PH (si aplica)]
>
> ¿Entendido? Si es así, pídeme los datos del primer cliente para empezar."

---

### Ejemplo de cómo usarlo una vez activado:

Una vez que la IA te responda que está lista, tú solo le pasas los datos sueltos y ella arma todo el proceso:

*   **Tú escribes:** *"Cliente: Talleres Pérez. Debe 15.000 pesos. Pide 1 tubo de Argón. Trae envase pero la PH venció en 2023."*
*   **La IA te responderá:**
    *   **Cliente:** Talleres Pérez
    *   **Estado de Cuenta:** ⚠️ DEUDA PENDIENTE ($15.000). Se recomienda pago previo.
    *   **Producto:** Argón - **Color Marrón (IRAM 2588)**.
    *   **Operación de Envase:** Canje mano a mano.
    *   **Alertas de PH:** ❌ VENCIDA (2023). **Cargar costo de Prueba Hidráulica.**
    *   **Total a Facturar:** Carga de Argón + Tasa de Mantenimiento/PH.

### ¿Qué ganas con este prompt?

1.  **Evitas errores legales:** Te asegura que no aceptes tubos vencidos sin cobrar el service.
2.  **Seguridad:** Refuerza el código de colores IRAM 2588 (evitando que alguien cargue Oxígeno en un tubo de Acetileno, por ejemplo).
3.  **Control comercial:** No te olvidas de cobrar el envase nuevo si el cliente no trae el suyo.
4.  **Cobranzas:** Te obliga a mirar si el cliente debe dinero antes de entregar mercadería nueva.