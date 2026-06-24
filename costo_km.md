Para realizar un cálculo profesional de costos logísticos, debes desglosar cada ítem. Aquí tienes las fórmulas detalladas para cada componente, divididas en **Costos Variables** (dependen de los km) y **Costos Fijos** (dependen del tiempo).

---

### 1. Costos Variables (CV)
Se calculan por cada kilómetro recorrido.

#### A. Combustible
Es el gasto más volátil.
*   **Fórmula:** `Precio del Litro / Rendimiento del vehículo (km/l)`
*   *Ejemplo:* Si el litro cuesta $1.00 y el camión rinde 4 km/l, el costo es $0.25 por km.

#### B. Neumáticos
Se calcula considerando cuántos neumáticos tiene el vehículo y cuánto duran.
*   **Fórmula:** `(Precio de cada neumático × Cantidad de neumáticos) / Vida útil total en km`
*   *Nota:* Si realizas recapados (recauchutaje), suma ese costo al numerador y los km extras al denominador.

#### C. Mantenimiento y Reparaciones (Correctivo y Preventivo)
Incluye cambios de aceite, filtros, frenos y reparaciones menores.
*   **Fórmula:** `Costo total de servicios en un periodo / Kilómetros recorridos en ese periodo`
*   *Recomendación:* Se suele estimar un coeficiente basado en el historial del vehículo (ej. 5% del valor del combustible).

#### D. Lubricantes
A veces se incluye en mantenimiento, pero si es de alto consumo se calcula aparte.
*   **Fórmula:** `Costo de lubricantes entre cambios / Intervalo de km entre cambios`

---

### 2. Costos Fijos (CF)
Se calculan de forma mensual y luego se dividen por los km recorridos en ese mes para "unitizarlos".

#### E. Salarios y Cargas Sociales
Incluye sueldo neto, aportes patronales, seguros de vida y viáticos fijos.
*   **Fórmula:** `(Sueldo Bruto + Cargas Patronales + Beneficios) / Kilómetros mensuales`

#### F. Seguros
Seguro de la unidad y seguro de la carga (si es fijo).
*   **Fórmula:** `Costo de la Póliza Mensual / Kilómetros mensuales`

#### G. Depreciación (Amortización del Vehículo)
Es el ahorro para reponer el camión al final de su vida útil.
*   **Fórmula:** `(Valor de compra - Valor de reventa o rescate) / Meses de vida útil estimada`
*   *Para llevar a km:* `Costo mensual de depreciación / Kilómetros mensuales`

#### H. Impuestos, Patentes y Tasas
Todo lo que sea obligatorio para circular (ITV/VTV, patentes anuales, permisos de carga).
*   **Fórmula:** `Suma de impuestos anuales / 12 meses / Kilómetros mensuales`

#### I. Costos Administrativos y Estructura
Alquiler de cochera, personal de oficina, internet, luz, etc.
*   **Fórmula:** `Gastos fijos de oficina / Cantidad de vehículos en la flota / Kilómetros mensuales`

---

### 3. Costos Financieros (Opcional pero recomendado)
Si el vehículo se compró con un crédito, o simplemente el "costo de oportunidad" de tener ese dinero invertido en el camión.
*   **Fórmula:** `(Valor del vehículo × Tasa de interés mensual) / Kilómetros mensuales`

---

### Resumen: La Gran Fórmula Final

Para obtener el **Costo Total por Kilómetro (CPK)**, aplicas la siguiente sumatoria:

$$CPK = \underbrace{\left( \frac{Comb}{Rend} + \frac{Neum \times Cant}{Vida} + Mant \right)}_{\text{Suma de Variables}} + \frac{\sum \text{Costos Fijos Mensuales}}{\text{Kilómetros recorridos en el mes}}$$

---

### Ejemplo de Aplicación en Excel:
Si quieres armar una planilla, usa estas columnas:

1.  **Km Recorridos al mes:** (Ej: 10,000)
2.  **Combustible:** $2.500 (Gasto total) / 10,000 = $0.25
3.  **Neumáticos:** $4.000 (Kit) / 80,000 (Vida) = $0.05
4.  **Chofer:** $2.000 (Sueldo) / 10,000 = $0.20
5.  **Seguro/Patente:** $500 / 10,000 = $0.05
6.  **TOTAL CPK:** $0.55

**Importante:** No olvides el **"Factor de Retorno Vacío"**. Si el camión vuelve sin carga el 50% de las veces, tu costo por kilómetro **útil** (el que le cobras al cliente) debe multiplicarse por 2.