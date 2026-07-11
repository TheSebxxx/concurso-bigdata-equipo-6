# Conclusiones, métricas y limitaciones

## 1. Hallazgos principales

> Completa esta sección con 3-4 hallazgos concretos del EDA (`notebooks/01_EDA.ipynb`), por ejemplo: municipio(s) con mayor concentración de hurtos, modalidad predominante (residencial vs. comercial), arma/medio más frecuente, estacionalidad detectada (meses pico).

- Hallazgo 1: …
- Hallazgo 2: …
- Hallazgo 3: …

## 2. Métricas de evaluación del modelo

El nivel de confianza reportado por predicción individual (`confianza_pct`, ej. 75,9 % promedio) es una medida operativa útil para el dashboard, pero **no reemplaza una métrica cuantitativa de error del modelo**. Para la entrega final se documenta adicionalmente:

- **MAE (Error Absoluto Medio):** `___` hurtos (completar con el resultado real de `notebooks/03_Modelo.ipynb`).
- **RMSE (Raíz del Error Cuadrático Medio):** `___` hurtos.
- **Conjunto de prueba:** `___ %` de los registros, correspondiente a los últimos `___` meses del histórico.

### Procedimiento de validación: Train/Test Split cronológico

A diferencia de un split aleatorio, en series de tiempo de criminalidad **el conjunto de prueba debe ser posterior en el tiempo al conjunto de entrenamiento**, para simular el escenario real de predicción a futuro y evitar fuga de información (data leakage).

```python
# Ejemplo de referencia — ajustar a tu notebook 03_Modelo.ipynb
import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np

df = df.sort_values("fecha_hecho")

corte = df["fecha_hecho"].quantile(0.8)  # último 20% del histórico como prueba
train = df[df["fecha_hecho"] <= corte]
test  = df[df["fecha_hecho"] > corte]

X_train, y_train = train[features], train["cantidad"]
X_test, y_test   = test[features], test["cantidad"]

modelo = DecisionTreeRegressor(random_state=42)
modelo.fit(X_train, y_train)
pred = modelo.predict(X_test)

mae  = mean_absolute_error(y_test, pred)
rmse = np.sqrt(mean_squared_error(y_test, pred))
print(f"MAE: {mae:.2f} | RMSE: {rmse:.2f}")
```

Ejecuta este bloque (o el equivalente ya existente en tu notebook) y reemplaza los valores `___` de arriba con el resultado real antes de cerrar la entrega.

## 3. Las 6 dimensiones de calidad de datos

| Dimensión | Acción implementada |
|---|---|
| **Exactitud** | Validación de que el CSV coincide con el esquema esperado antes de la carga. |
| **Unicidad** | Filtro de duplicados (municipio + fecha + modalidad + cantidad) durante la ingesta. |
| **Completitud** | Manejo de valores nulos en ubicación y tipo de arma. |
| **Consistencia** | Estandarización de formatos de fecha (ISO 8601) y de texto (mayúsculas, sin tildes duplicadas) entre municipios/departamentos. |
| **Actualidad** | Registro de la fecha de corte del dataset y de cada carga mensual en `ingestas_dataset`, para saber qué tan vigente es la información mostrada. |
| **Validez** | Restricciones a nivel de base de datos (`CHECK`) sobre campos categóricos como `nivel_riesgo`, `grupo_etario` y `periodo`. |

## 4. Limitaciones conocidas

- El dataset base es de nivel básico (~1.800–2.000 registros), lo que limita la granularidad de las predicciones en municipios con muy pocos hurtos históricos.
- El modelo de Árbol de Decisión, aunque interpretable, puede sobreajustarse en zonas con poca densidad de datos; el sistema mitiga esto declarando baja confianza o "datos insuficientes" en esos casos.
- Los reportes ciudadanos en redes sociales son una fuente complementaria no verificada oficialmente; se tratan como señal comunitaria, no como fuente de verdad para las predicciones del modelo.
- La integración de redes sociales está limitada actualmente a X; Facebook e Instagram quedan como trabajo futuro.

## 5. Trabajo futuro

- Extender el módulo de reportes ciudadanos a Facebook e Instagram.
- Incorporar variables socioeconómicas adicionales (si se dispone de datos abiertos complementarios) para enriquecer el modelo.
- Evaluar modelos alternativos (Random Forest, Gradient Boosting) manteniendo la interpretabilidad como criterio de selección.
