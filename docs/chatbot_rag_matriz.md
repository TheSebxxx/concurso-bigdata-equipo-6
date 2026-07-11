# Matriz de alineación del chatbot SEPH (RAG y trazabilidad)

SEPH utiliza una arquitectura de **Recuperación Aumentada por Generación (RAG)**: antes de responder, el sistema recupera evidencia concreta desde Supabase (dataset, predicciones o recomendaciones) y solo entonces genera la respuesta en lenguaje natural, citando esa evidencia. Esto evita que el modelo de lenguaje "invente" cifras o zonas de riesgo que no estén respaldadas por datos reales.

## 1. Tipos de pregunta y fuente de evidencia

| Tipo de pregunta ciudadana | Fuente de datos (Supabase) | Mecanismo de recuperación |
|---|---|---|
| Tendencias históricas ("¿cuántos hurtos hubo en X municipio el último trimestre?") | `registros_hurto` + `ubicaciones` + `tipos_hurto` | Consulta agregada filtrada por ubicación y rango de fechas. |
| Preguntas de investigación ("¿qué modalidad predomina en zonas comerciales?") | `registros_hurto` + `tipos_hurto` + `armas_medios` | Agregación y comparación por modalidad/arma. |
| Predicciones ("¿qué riesgo se proyecta para X municipio el próximo mes?") | `predicciones` | Consulta por `ubicacion_id`, `periodo_prediccion` y `nivel_riesgo`. |
| Recomendaciones ("¿cómo puedo proteger mi negocio?") | `recomendaciones` + `recomendaciones_ubicaciones` | Búsqueda semántica sobre texto de recomendaciones, filtrada por tipo de aplicación (comercial/residencial) y ubicación. |

## 2. Manejo de incertidumbre

- Si la consulta a Supabase no devuelve registros suficientes para una zona o periodo, SEPH **declara explícitamente la ausencia de datos** en lugar de generar una respuesta genérica o inventada.
- Las respuestas relacionadas con predicciones siempre incluyen el `confianza_pct` asociado, para que el ciudadano dimensione la certeza de la proyección.
- El chatbot no responde preguntas fuera del alcance del dataset (por ejemplo, casos judiciales individuales o identificación de personas).

## 3. Trazabilidad

Toda respuesta generada por SEPH puede vincularse a la(s) fila(s) específica(s) de Supabase que la sustentan (tabla, filtros aplicados y fecha de consulta), lo que permite auditar posteriormente por qué el chatbot dio una respuesta determinada.

## 4. Retroalimentación y mejora continua

Las calificaciones ciudadanas (👍/👎) sobre cada respuesta se almacenan y se revisan periódicamente desde el panel administrativo para:

- Detectar respuestas de baja calidad o mal fundamentadas.
- Ajustar el prompt de sistema o las reglas de recuperación (RAG) cuando se identifican patrones de error recurrentes.
