Este es un sistema crítico, ya que los tubos de gases (oxígeno, nitrógeno, acetileno, etc.) son activos costosos que requieren mantenimiento legal obligatorio (pruebas hidráulicas) y seguimiento por seguridad.

Para diseñar este histórico de control y trazabilidad, propongo una estructura de **Base de Datos Relacional** que podrías implementar en un software a medida, un ERP o incluso una planilla avanzada (Excel/Google Sheets) con macros.

---

### 1. Ficha Maestra del Activo (Identificación Única)
Cada tubo debe tener un "documento de identidad".
*   **ID del Tubo:** (Serial de fábrica o código interno QR/RFID).
*   **Tipo de Gas:** (Oxígeno, Argón, CO2, etc.).
*   **Capacidad:** (M3 o Litros).
*   **Fecha de Fabricación:** (Para cálculo de vida útil total).
*   **Fecha de Última Prueba Hidráulica (PH):** (Dato crítico legal).
*   **Vencimiento de PH:** (Generalmente cada 5 años).
*   **Estado Actual:** (Lleno, Vacío, En Mantenimiento, En Cliente, En Tránsito).

---

### 2. Matriz de Trazabilidad Histórica (Log de Eventos)
Esta tabla registra cada movimiento. Cada vez que el tubo cambia de manos o estado, se genera una fila nueva.

| Fecha/Hora | ID Tubo | Evento (Acción) | Responsable | Ubicación (Geolocalización) | Cliente / Depósito | Estado de Carga |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 01/10/23 08:00 | T-505 | Salida de Planta | Chofer A | -34.60, -58.38 | Planta Central | Lleno |
| 01/10/23 11:30 | T-505 | Entrega en Cliente | Chofer A | -34.65, -58.50 | Hospital X | Lleno |
| 15/10/23 10:00 | T-505 | Retiro de Vacío | Chofer B | -34.65, -58.50 | Hospital X | Vacío |
| 16/10/23 09:00 | T-505 | Ingreso a Taller | Operario C | -34.60, -58.38 | Taller Interno | Para Revisión |

---

### 3. Control de Vida Útil y Mantenimiento
Para calcular la "salud" del tubo, usamos fórmulas de alerta:

*   **Fórmula de Antigüedad:** `Hoy - Fecha de Fabricación` (Alerta si supera los 20-30 años según normativa local).
*   **Fórmula de Vencimiento de Prueba Hidráulica (PH):**
    *   `Días restantes = Fecha Vencimiento PH - Hoy`
    *   *Semáforo:*
        *   Verde: > 90 días.
        *   Amarillo: < 90 días.
        *   Rojo: Vencido (Bloqueo de carga automático).

---

### 4. Integración de Geolocalización (Tracking)
Para tener la trazabilidad real en mapa, existen tres métodos:

1.  **Escaneo por App (Económico):** El operario escanea el QR del tubo con su teléfono. La App captura automáticamente las coordenadas GPS del celular en ese instante.
2.  **RFID en Planta:** Antenas en los portones que registran la salida de los tubos sin intervención humana.
3.  **GPS en el Camión:** Si el tubo no tiene un sensor individual (que es caro), se vincula el ID del tubo a la hoja de ruta del camión que tiene el GPS activo.

---

### 5. Dashboard de Control (Lo que vería el Gerente)
Un panel visual con los siguientes indicadores (KPIs):

*   **Mapa de Calor:** Ver dónde están distribuidos los tubos en tiempo real (basado en el último escaneo).
*   **Índice de Rotación:** ¿Cuánto tiempo pasa el tubo en el cliente antes de volver? (Eficiencia de activos).
*   **Alerta de Vencimientos:** Listado de tubos que deben ir a prueba hidráulica el próximo mes.
*   **Stock por Estado:** Cuántos están listos para la venta vs. cuántos están fuera de servicio.

---

### Ejemplo de Visualización de Datos (JSON/Estructura)
Si estuvieras programando esto, un evento se vería así:
```json
{
  "id_tubo": "OX-10294",
  "timestamp": "2023-10-25T14:30:00Z",
  "geoloc": {
    "lat": -34.6037,
    "lng": -58.3816,
    "precision": "10m"
  },
  "evento": "ENTREGA_CLIENTE",
  "cliente": "Metalúrgica Pérez",
  "vida_util_restante_ph": "450 días",
  "operador_id": "CHOFER_44"
}
```

