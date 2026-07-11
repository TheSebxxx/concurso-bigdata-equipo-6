# Marco metodológico — CRISP-ML(Q)

El desarrollo de SEPH sigue el ciclo de vida **CRISP-ML(Q)** (Cross Industry Standard Process for Machine Learning), estructurado en seis fases iterativas.

## Fase 1 · Comprensión del negocio

- **Objetivo:** desarrollar un sistema analítico que procese datos históricos de hurtos para visualizar tendencias, generar alertas tempranas y ofrecer recomendaciones automatizadas mediante un asistente de IA.
- **Criterios de éxito:** dashboard interactivo con mapas de calor dinámicos; rigor técnico en el análisis descriptivo; trazabilidad total del chatbot a la evidencia del dataset; apropiación ciudadana mediante el canal de reporte comunitario.

## Fase 1 · Comprensión de los datos

- **Fuente:** Reporte Hurto por Modalidades — Policía Nacional (datos.gov.co).
- **Variables clave:** `DEPARTAMENTO`, `MUNICIPIO`, `ARMAS MEDIOS`, `FECHA HECHO`, `TIPO DE HURTO`, `CANTIDAD`.
- **Diagnóstico inicial:** volumen apto para nivel básico (~1.800–2.000 registros); se requiere estandarizar municipios y formatos de fecha.

## Fase 2 · Preparación de los datos

1. **Ingesta y ETL:** carga del CSV → normalización de departamentos/municipios → persistencia en PostgreSQL (Supabase) con integridad referencial.
2. **Arquitectura de datos:** modelo dimensional (tabla de hechos `registros_hurto` + dimensiones `ubicaciones`, `tipos_hurto`, `armas_medios`). Ver [`data_dictionary.md`](data_dictionary.md).
3. **Calidad de datos** (ver detalle de las 6 dimensiones en [`conclusiones.md`](conclusiones.md)): exactitud, unicidad, completitud, consistencia y actualidad.
4. **Feature engineering:**
   - Temporal: estacionalidad mensual y tendencias históricas.
   - Espacial: coordenadas geográficas para los mapas de calor.
   - Texto: preparación de reportes y recomendaciones para recuperación semántica (RAG).

## Fase 3 · Ingeniería de modelos de ML

- **Algoritmo:** Árbol de Decisión (v1.0.0), elegido por su interpretabilidad.
- **Variables de entrenamiento:** temporales, espaciales y contextuales (modalidad y arma/medio predominante).
- **Tarea:** proyección de hurtos a 3 meses por municipio y modalidad, con nivel de riesgo y confianza asociados.

## Fase 4 · Evaluación del modelo

- **Métricas:** nivel de confianza promedio por predicción y métrica de error cuantitativa (MAE) sobre el conjunto de prueba — ver [`conclusiones.md`](conclusiones.md).
- **Interpretabilidad:** el modelo expone los factores que más influyen en cada predicción (p. ej., incremento de hurtos con arma blanca en una zona).
- **Robustez:** el sistema declara explícitamente cuándo no hay datos suficientes para una zona, evitando conclusiones no soportadas.

## Fase 5 · Despliegue

- Dashboard público con mapas de calor histórico y predictivo, estadísticas exportables y top de armas/medios.
- Módulo de reportes ciudadanos en redes sociales (factor diferenciador).
- Sistema de recomendaciones (automáticas + manuales).
- Asistente conversacional SEPH (IA + RAG).
- Panel administrativo con control de roles (`superadmin` / `admin`).

Detalle completo de la arquitectura de despliegue → [`arquitectura.md`](arquitectura.md).

## Fase 6 · Monitoreo y mantenimiento

- Supervisión del nivel de confianza del modelo, con alerta interna si cae por debajo de un umbral definido (data drift).
- Protocolo de re-entrenamiento mensual: carga de CSV actualizado → ETL → truncado y re-inserción de `registros_hurto` → re-entrenamiento del Árbol de Decisión.
- Monitoreo de infraestructura: API de Groq (chatbot), estado de Supabase, logs de ingesta (`ingestas_dataset`).
- Bucle de retroalimentación ciudadana: calificación de respuestas del chatbot (👍/👎) para ajustar el prompt de sistema.
