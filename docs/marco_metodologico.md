# Marco metodológico — CRISP-ML(Q)

El desarrollo de SEPH sigue el ciclo de vida **CRISP-ML(Q)** (Cross Industry Standard Process for Machine Learning), estructurado en seis fases iterativas.

## Fase 1 · Comprensión del negocio

- **Objetivo:** desarrollar un sistema analítico que procese datos históricos de hurtos para visualizar tendencias, generar alertas tempranas y ofrecer recomendaciones automatizadas mediante un asistente de IA.
- **Criterios de éxito:** dashboard interactivo con mapas de calor dinámicos; rigor técnico en el análisis descriptivo; trazabilidad total del chatbot a la evidencia del dataset; apropiación ciudadana mediante el canal de reporte comunitario.

## Fase 1 · Comprensión de los datos

- **Fuente:** Reporte Hurto por Modalidades — Policía Nacional (datos.gov.co).
- **Variables clave:** `DEPARTAMENTO`, `MUNICIPIO`, `ARMAS MEDIOS`, `FECHA HECHO`, `TIPO DE HURTO`, `CANTIDAD`.
- **Diagnóstico inicial (confirmado tras la carga real):** 633.803 registros individuales, 1.017 municipios, rango 2010-01-01 a 2026-03-01. El volumen es considerablemente mayor al estimado inicialmente para nivel básico; se aplicaron controles de completitud (código DANE), consistencia (normalización de texto y grupo etario) y unicidad (restricción `uq_registro`) durante la carga — ver detalle real en `conclusiones.md`.

## Fase 2 · Preparación de los datos

### 2.1 Ingesta y ETL (`cargar_csv_supabase.py`)

1. **Lectura tolerante a codificación:** intenta `utf-8`; si falla, reintenta con `latin-1` (para preservar tildes de departamentos como ATLÁNTICO).
2. **Validación de columnas obligatorias:** el script exige que existan `CODIGO DANE`, `FECHA HECHO`, `TIPO DE HURTO` y `CANTIDAD`; si falta alguna, aborta la carga con un error explícito antes de tocar la base de datos.
3. **Limpieza del código DANE:** se convierte a numérico y se **descartan las filas con código DANE inválido o ausente** (`CODIGO DANE > 0`) — este es el principal control de completitud/validez aplicado hoy.
4. **Normalización de texto:** se recorta el sufijo `" (CT)"` de los nombres de municipio (capital de departamento) y se estandarizan municipio/departamento a mayúsculas sin espacios extremos.
5. **Catálogo de ubicaciones (upsert):** cada combinación única de `CODIGO DANE`/municipio/departamento se inserta en `ubicaciones` con `ON CONFLICT (codigo_dane) DO UPDATE`, evitando duplicados de catálogo.
6. **Clasificación de tipo de hurto (heurística):** se clasifica por palabra clave — si el texto de `TIPO DE HURTO` contiene "RESIDENCIA" se asigna el código `ART239-RES`; en cualquier otro caso, `ART239-COM`. *(Ver limitación documentada en `conclusiones.md`: esto agrupa como "comercial" cualquier modalidad que no sea explícitamente residencial.)*
7. **Catálogo dinámico de armas/medios:** si aparece un valor de `ARMAS MEDIOS` no visto antes, se inserta automáticamente en `armas_medios`; si el campo viene vacío, se usa `NO REPORTADO` como valor por defecto.
8. **Fechas:** se interpretan con formato día/mes/año (`dayfirst=True`); si una fecha no se puede parsear, el script usa la fecha actual como reemplazo (riesgo documentado en `conclusiones.md`).
9. **Control de omitidos:** una fila solo se inserta en `registros_hurto` si logró resolver tanto `ubicacion_id` como `tipo_hurto_id`; si no, se cuenta como **omitida** (no se descarta en silencio).
10. **Carga por lotes:** inserción en bloques de 5.000 filas (`--batch-size`) para eficiencia con datasets grandes.
11. **Trazabilidad:** cada ejecución registra en `ingestas_dataset` el total procesado, insertados, omitidos y el estado (`EXITO`/`FALLIDO`), con el mensaje de error si aplica.

### 2.2 Enriquecimiento geográfico (`cargar_coordenadas.py`)

Paso posterior e independiente: geocodifica los municipios de `ubicaciones` que aún no tienen `lat`/`lng`, usando **Nominatim (OpenStreetMap)** vía `geopy`, respetando el límite de 1 solicitud/segundo del servicio. Hace commit parcial cada 50 registros actualizados y registra en consola los municipios que no logró geolocalizar.

### 2.3 Arquitectura de datos

Modelo dimensional: tabla de hechos `registros_hurto` + dimensiones `ubicaciones`, `tipos_hurto`, `armas_medios`. Ver [`data_dictionary.md`](data_dictionary.md).

### 2.4 Calidad de datos

Ver detalle real (qué se controla y qué no) en [`conclusiones.md`](conclusiones.md).

### 2.5 Feature engineering (para el modelo predictivo)

- Temporal: `mes_num`, `año`, `trimestre`.
- Espacial: departamento codificado (`depto_enc`).
- Histórico: `promedio_historico`, `lag_1`, `lag_3` por municipio+tipo de hurto.
- Texto: recomendaciones y estadísticas agregadas se resumen manualmente dentro del prompt de sistema del chatbot (no hay recuperación semántica automática — ver `chatbot_rag_matriz.md`).

## Fase 3 · Ingeniería de modelos de ML

- **Algoritmo:** Árbol de Decisión (`DecisionTreeRegressor`, v1.0.0), `max_depth=8`, `min_samples_leaf=10`, elegido por su interpretabilidad.
- **Unidad de análisis:** total de hurtos agregado por **mes × municipio × tipo de hurto** (no por registro individual).
- **Variables de entrenamiento (features reales):**
  - Temporales: `mes_num`, `año`, `trimestre`.
  - Espacial: `depto_enc` (departamento codificado).
  - Contextual: `tipo_enc` (modalidad de hurto codificada).
  - Históricas: `promedio_historico` (promedio de hurtos del municipio+tipo), `lag_1` (hurtos del mes anterior), `lag_3` (hurtos de 3 meses atrás).
  - **Nota:** el modelo actual **no incluye `armas_medios`** como variable predictiva; esa dimensión sí se usa en el dashboard (top de armas/medios) pero no alimenta el árbol de decisión.
- **Tarea de ML:** proyección de hurtos para los próximos 3 meses por municipio y modalidad. Para los meses 2 y 3, el modelo reutiliza los mismos `lag_1`/`lag_3` del último dato real disponible (no se recalculan de forma iterativa), lo que reduce la precisión esperada a medida que el horizonte se aleja del mes 1.
- **Nivel de riesgo:** se calcula por reglas sobre cuantiles históricos del municipio (p25/p50/p75 de `total_hurtos`), no directamente por el árbol: `CRITICO` si supera 1.5× el percentil 75, `ALTO` si supera el percentil 75, `MEDIO` sobre el percentil 50, `BAJO` en el resto.
- **Confianza (`confianza_pct`):** es una heurística de cercanía entre la predicción y el promedio histórico del municipio+tipo (no un intervalo de confianza estadístico del modelo), acotada entre 50 % y 95 %.

## Fase 4 · Evaluación del modelo

- **Métricas reales calculadas por el script:** **MAE** (Error Absoluto Medio, en hurtos/mes) y **R²** (capacidad explicativa del modelo).
- **Procedimiento de validación:** `train_test_split` **aleatorio** (80 % entrenamiento / 20 % prueba, `random_state=42`).
  - **Limitación identificada:** al ser un problema de series de tiempo, un split aleatorio permite que el conjunto de entrenamiento contenga meses posteriores a los del conjunto de prueba, lo que puede sobreestimar el desempeño real del modelo frente a un escenario de predicción a futuro genuino. Se documenta como limitación conocida en `conclusiones.md`, con una alternativa de split cronológico propuesta como mejora.
- **Interpretabilidad:** el árbol de decisión permite inspeccionar `feature_importances_` para identificar qué variables pesan más en cada predicción (útil para justificar ante el jurado que no es una caja negra).
- **Robustez:** las predicciones siempre parten de datos históricos reales por municipio+tipo (`groupby(...).last()`); si un municipio no tiene histórico suficiente, no se genera predicción para esa combinación.

## Fase 5 · Despliegue

- Dashboard público con mapas de calor histórico y predictivo, estadísticas exportables y top de armas/medios.
- Módulo de reportes ciudadanos en redes sociales (factor diferenciador).
- Sistema de recomendaciones (automáticas + manuales).
- Asistente conversacional SEPH (Groq + prompt de sistema con conocimiento embebido, no RAG — ver `chatbot_rag_matriz.md`).
- Panel administrativo con control de roles (`superadmin` / `admin`).

Detalle completo de la arquitectura de despliegue → [`arquitectura.md`](arquitectura.md).

## Fase 6 · Monitoreo y mantenimiento

- Supervisión del nivel de confianza del modelo, con alerta interna si cae por debajo de un umbral definido (data drift).
- Protocolo de re-entrenamiento mensual: carga de CSV actualizado → ETL → truncado y re-inserción de `registros_hurto` → re-entrenamiento del Árbol de Decisión.
- Monitoreo de infraestructura: API de Groq (chatbot), estado de Supabase, logs de ingesta (`ingestas_dataset`).
- Bucle de retroalimentación ciudadana: calificación de respuestas del chatbot (👍/👎) para ajustar el prompt de sistema.
