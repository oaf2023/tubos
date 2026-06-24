Basado en los requisitos técnicos detallados en las fuentes, como la norma **ISO 18119**, la resolución **2876 de 2013** y la **NTC 5719**, una tabla de control o registro de tubos (cilindros) debe contemplar campos de identificación, especificaciones técnicas, datos de pesaje y registros de inspección.

A continuación, se presenta una tabla con los campos esenciales que debe tener una base de datos o registro de estos recipientes:

### Campos Requeridos para una Tabla de Tubos y Cilindros de Gas

| Categoría de Campo | Nombre del Campo | Descripción y Significado Técnico |
| :--- | :--- | :--- |
| **Identificación General** | **Número de Serie** | Identificador alfanumérico único asignado por el fabricante para la trazabilidad. |
| | **Nombre del Propietario** | Persona o empresa dueña del cilindro. |
| | **Fabricante** | Nombre, marca comercial o símbolo del fabricante del recipiente. |
| | **País de Fabricación** | Siglas o nombre del país donde se manufacturó el tubo. |
| | **Marca UN** | Símbolo de las Naciones Unidas que certifica el cumplimiento de regulaciones internacionales. |
| **Especificaciones de Diseño** | **Norma de Fabricación** | Estándar bajo el cual se diseñó y probó (ej. ISO 9809, DOT 3AA). |
| | **Presión de Trabajo (PW)** | Presión máxima de servicio permitida a una temperatura uniforme de 15 °C. |
| | **Rosca del Cilindro** | Identificación del tipo de rosca de entrada (ej. 25E, 3/4-14 NGT). |
| | **Espesor Mínimo de Pared** | Espesor mínimo garantizado en milímetros de la parte cilíndrica. |
| | **Material / Aleación** | Identificación de la aleación de aluminio (si aplica) o compatibilidad del acero (H/HG). |
| **Pesos y Capacidades** | **Capacidad de Agua** | Volumen interno mínimo garantizado en litros. |
| | **Peso Vacío** | Masa del recipiente en kg, incluyendo partes fijas pero sin válvula ni protector. |
| | **Peso Tara** | Suma del peso vacío más la válvula, solvente y masa porosa (crítico en acetileno y gases licuados). |
| | **Peso Máximo de Llenado** | Peso máximo permitido de gas licuado basado en la densidad del producto. |
| **Inspección y Recalificación** | **Presión de Ensayo (PH)** | Presión a la que se somete el tubo durante la prueba hidrostática. |
| | **Fecha de Ensayo Inicial** | Mes y año de la primera prueba realizada en fábrica. |
| | **Última Fecha de Retest** | Fecha (AAAA/MM) de la inspección periódica o prueba hidrostática más reciente. |
| | **Próxima Fecha de Retest** | Fecha en la que vence la recalificación actual (basada en intervalos de 3, 5 o 10 años). |
| | **Resultado de Inspección** | Estado de aptitud: Aprobado (Pass) o Rechazado (Fail/Condemned). |
| | **ID del Inspector/Laboratorio** | Símbolo o logo del organismo de inspección o centro de revisión acreditado. |
| | **Método de Prueba** | Tipo de ensayo realizado: Hidrostática (expansión volumétrica), Ultrasonido (UT) o Presión de prueba. |
| **Campos Específicos** | **Tipo de Gas / Contenido** | Identificación del gas o mezcla (ej. C2H2, O2, N2). |
| | **Identificación de Masa Porosa** | Nombre o marca de la masa porosa interna (solo para acetileno). |
| | **Tipo de Solvente** | Identificación del solvente usado (Acetona "A" o DMF) y su masa en kg (solo acetileno). |
| | **Vida Útil Límite** | Fecha de expiración definitiva (marcada como "FINAL" en cilindros compuestos). |
| | **Reparaciones** | Detalles técnicos de cualquier reparación realizada a defectos admitidos. |

### Consideraciones Adicionales para la Tabla
*   **Trazabilidad Indeleble:** La información de estos campos debe provenir directamente del estampe original grabado en bajorrelieve en la ojiva o cuello del tubo, ya que es el único registro confiable.
*   **Condiciones Especiales:** Se recomienda incluir un campo de "Observaciones" para registrar fenómenos físicos como corrosión, abolladuras o daños por calor que, aunque no causen el rechazo inmediato, requieran seguimiento.
*   **Uso de Gases Fragilizantes:** Para tubos que contengan hidrógeno, es mandatorio registrar si poseen el estampe "H" o "HG", indicando compatibilidad metalúrgica.