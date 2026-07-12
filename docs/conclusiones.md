# Conclusiones, métricas y limitaciones

## 1. Hallazgos principales

> Completa esta sección con 3-4 hallazgos concretos del EDA (`notebooks/01_EDA.ipynb`), por ejemplo: municipio(s) con mayor concentración de hurtos, modalidad predominante (residencial vs. comercial), arma/medio más frecuente, estacionalidad detectada (meses pico).

- Hallazgo 1: …
- Hallazgo 2: …
- Hallazgo 3: …

## 2. Métricas de evaluación del modelo

El script `cargar_csv_supabase.py` cargó exitosamente **633.803 registros** individuales de hurtos (2010-01-01 a 2026-03-01, 1.017 municipios) a Supabase. `modelo_prediccion.py` los agrega a **78.646 filas** (mes × municipio × tipo de hurto) para entrenar el modelo, y calculó sobre el conjunto de prueba:

- **MAE (Error Absoluto Medio): 1.47 hurtos/mes.**
- **R² (coeficiente de determinación): 0.9417** — el modelo explica ~94 % de la varianza en el conjunto de prueba.
- **Conjunto de prueba:** 20 % de las 78.646 filas agregadas, mediante `train_test_split(test_size=0.2, random_state=42)`.
- **Salida generada:** 6.153 predicciones (3 meses × 1.017 municipios × tipos de hurto), ya almacenadas en la tabla `predicciones`.

> El R² de 0.94 es alto, pero debe leerse junto con la limitación de la siguiente sección: al no ser un split cronológico, el modelo pudo entrenarse con meses posteriores a los que usó para evaluarse a sí mismo, lo que probablemente **infla** este valor frente a un escenario real de predicción a futuro. Es honesto reportarlo así ante el jurado, en vez de presentar el 0.94 sin ese contexto.

### Limitación metodológica identificada: split aleatorio en lugar de cronológico

El `train_test_split` actual es **aleatorio**, no cronológico. Como el problema es una serie de tiempo (predicción de hurtos futuros a partir de historia pasada), esto significa que el modelo puede entrenarse con meses posteriores a los que luego usa para "probarse", lo cual **puede sobreestimar el desempeño real** frente al escenario genuino de predecir el futuro sin haberlo visto.

**Se documenta como limitación conocida y no como error oculto.** Como mejora propuesta (no aplicada aún por restricciones de tiempo del concurso), se recomienda reemplazar el split por uno cronológico:

```python
# Alternativa recomendada para trabajo futuro (no implementada en la versión actual)
df_feat = df_feat.sort_values("mes")
corte = df_feat["mes"].quantile(0.8)
train = df_feat[df_feat["mes"] <= corte]
test  = df_feat[df_feat["mes"] > corte]
```

### Otras decisiones de diseño documentadas para transparencia ante el jurado

- **`nivel_riesgo`** se determina por reglas sobre cuantiles históricos del municipio (p25/p50/p75), no como salida directa del árbol de decisión.
- **`confianza_pct`** es una heurística de cercanía entre la predicción y el promedio histórico del municipio+tipo (acotada 50–95 %), **no** un intervalo de confianza estadístico derivado del modelo.
- Las predicciones de los meses 2 y 3 del horizonte reutilizan los mismos valores de `lag_1`/`lag_3` del último dato real disponible (no se recalculan de forma iterativa mes a mes), por lo que se espera mayor error en esos meses frente al mes 1.
- El modelo actual **no usa `armas_medios`** como variable predictiva (esa dimensión solo se usa en el módulo de estadísticas del dashboard).

## 3. Las 6 dimensiones de calidad de datos

| Dimensión | Estado real en `cargar_csv_supabase.py` |
|---|---|
| **Exactitud** | Parcial: se valida que existan las columnas obligatorias (`CODIGO DANE`, `FECHA HECHO`, `TIPO DE HURTO`, `CANTIDAD`) antes de procesar, pero no se valida el contenido semántico de cada celda. |
| **Unicidad** | Parcial: el catálogo `ubicaciones` usa `ON CONFLICT (codigo_dane) DO UPDATE` (no se duplican municipios), pero **no hay deduplicación a nivel de fila** en `registros_hurto` — si el CSV trae una fila repetida, se inserta dos veces. |
| **Completitud** | Se descartan filas con `CODIGO DANE` inválido o ausente (control real de completitud/validez). Los campos `ARMAS MEDIOS` y `GRUPO ETARIO` vacíos se rellenan con valores por defecto (`NO REPORTADO` / `ADULTOS`) en vez de dejarse nulos. |
| **Consistencia** | Se normaliza texto de municipio/departamento a mayúsculas y se recorta el sufijo `" (CT)"`. La fecha se interpreta con formato día/mes/año fijo (`dayfirst=True`). |
| **Actualidad** | Cada ejecución queda registrada en `ingestas_dataset` con fecha, total procesado, insertados y omitidos — permite saber qué tan vigente está la información cargada. |
| **Validez** | Restricciones `CHECK`/`UNIQUE`/FK a nivel de base de datos (ver `data_dictionary.md`), más el filtro de `CODIGO DANE > 0` en el ETL. |

### Riesgos de calidad identificados (para documentar con transparencia)

- **Clasificación de modalidad por palabra clave:** si el texto de `TIPO DE HURTO` no contiene "RESIDENCIA", se clasifica automáticamente como comercial (`ART239-COM`), aunque la modalidad real sea otra (p. ej. hurto a personas o a vehículos). Esto puede sesgar las estadísticas de "residencial vs. comercial" del dashboard.
- **Fechas no parseables se reemplazan por la fecha actual del sistema**, en lugar de descartarse o marcarse como pendientes de revisión — puede introducir registros con fecha incorrecta sin que se note a simple vista.
- **No hay deduplicación de filas** del CSV antes de insertar en `registros_hurto`; si la fuente trae registros repetidos, el conteo total de hurtos puede estar inflado.

## 4. Limitaciones conocidas

- El dataset ya cargado (633.803 registros, 1.017 municipios, 2010–2026) es sustancialmente más grande de lo estimado al inicio del proyecto; algunos municipios pequeños igual pueden tener pocos hurtos históricos, lo que limita la granularidad de sus predicciones específicas.
- **✅ Resuelto (era bloqueante):** `cargar_csv_supabase.py` intentaba insertar una columna `genero` en `registros_hurto` que no existe en el esquema real de Supabase (confirmado contra el export actual de la base de datos). Se corrigió el script para que el `INSERT` coincida exactamente con las columnas reales de la tabla (`id, ubicacion_id, tipo_hurto_id, arma_medio_id, fecha_hecho, grupo_etario, cantidad`).
- **El split de entrenamiento/prueba del modelo es aleatorio, no cronológico** (ver `conclusiones.md` sección 2), lo que puede sobreestimar el desempeño del modelo frente al escenario real de predicción a futuro. Queda como mejora prioritaria antes de la entrega final si el tiempo lo permite.
- Las predicciones a 2 y 3 meses reutilizan los `lag_1`/`lag_3` del último dato real, sin recalcularlos de forma iterativa, por lo que se espera menor precisión conforme el horizonte de predicción se aleja.
- El modelo no incorpora `armas_medios` como variable predictiva; esa información se usa únicamente a nivel descriptivo en el dashboard.
- `confianza_pct` es una heurística de cercanía al promedio histórico, no una medida estadística de incertidumbre del modelo — se documenta así para no sobrerrepresentar su rigor ante el jurado.
- La clasificación de `TIPO DE HURTO` en residencial/comercial se hace por palabra clave ("RESIDENCIA") en el ETL, no por un catálogo oficial completo — puede sesgar la proporción real entre ambas modalidades (ver sección 3).
- Las fechas no parseables durante la carga se reemplazan por la fecha del sistema en el momento de la ingesta, en lugar de descartarse.
- No hay deduplicación de filas del CSV antes de insertar en `registros_hurto`.
- Los reportes ciudadanos en redes sociales son una fuente complementaria no verificada oficialmente; se tratan como señal comunitaria, no como fuente de verdad para las predicciones del modelo.
- La integración de redes sociales está limitada actualmente a X; Facebook e Instagram quedan como trabajo futuro.

## 5. Trabajo futuro

- Reemplazar el split aleatorio por un split cronológico para una evaluación más realista del desempeño en producción.
- Recalcular `lag_1`/`lag_3` de forma iterativa mes a mes en la proyección a 3 meses, en lugar de reutilizar el último dato real.
- Evaluar la inclusión de `armas_medios` como variable predictiva adicional del modelo.
- Extender el módulo de reportes ciudadanos a Facebook e Instagram.
- Incorporar variables socioeconómicas adicionales (si se dispone de datos abiertos complementarios) para enriquecer el modelo.
- Evaluar modelos alternativos (Random Forest, Gradient Boosting) manteniendo la interpretabilidad como criterio de selección.
