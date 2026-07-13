# Chatbot SEPH — arquitectura real y matriz de alineación

## ⚠️ Corrección de diseño frente a versiones anteriores de este documento

Versiones previas de esta documentación describían a SEPH como un sistema **RAG (Recuperación Aumentada por Generación)**, que consultaría Supabase en tiempo real antes de cada respuesta. **Al revisar el código real (`groqService.js` y `Chatbot.jsx`), esto no es así.** Se corrige aquí para que la documentación sea fiel a la implementación.

## 1. Arquitectura real

SEPH es un chatbot basado en un **prompt de sistema con conocimiento de dominio embebido** (`SISTEMA_PROMPT` en `groqService.js`), no en recuperación dinámica:

1. El usuario escribe una pregunta en `Chatbot.jsx`.
2. Se arma el historial de los últimos 10 turnos de la conversación (sin consultar la base de datos).
3. `enviarMensaje()` antepone un `SISTEMA_PROMPT` **fijo y escrito a mano** — contiene cifras agregadas del dataset (registros totales, tipos de hurto, modalidades, departamentos/municipios) y una lista de recomendaciones preventivas predefinidas — y envía todo directamente a la API de Groq (`llama-3.3-70b-versatile`).
4. Groq genera la respuesta con base en ese prompt + el historial de conversación. **No hay ninguna consulta a Supabase en este flujo.**

Es decir: SEPH no recupera evidencia por pregunta ni cita filas específicas de `registros_hurto`, `predicciones` o `recomendaciones` — responde con base en el conocimiento general que se le dio una sola vez, al momento de escribir el prompt.

## 2. Riesgo real identificado: las cifras del prompt quedan desactualizadas

El `SISTEMA_PROMPT` actual contiene, entre otros datos fijos:

| Dato en el prompt | Valor real actual (Supabase, post-carga) | ¿Coincide? |
|---|---|---|
| "381.624 registros de hurtos" | 633.803 filas en `registros_hurto` (381.624 es la suma de `cantidad`, una métrica distinta y también válida, pero probablemente quedó fija desde una carga anterior más pequeña) | Ambiguo — aclarar cuál de las dos cifras se quiso comunicar |
| "2.150 municipios" | 1.017 municipios con datos cargados actualmente | ❌ No coincide |
| "33 departamentos" | Pendiente de verificar contra `SELECT COUNT(DISTINCT departamento) FROM ubicaciones` | Sin confirmar |
| "Escopolamina" como modalidad de arma/medio | No aparece en el top 5 de `armas_medios` (ver `conclusiones.md`); puede existir más abajo en la tabla, pero no se confirmó | Sin confirmar |

**Cada vez que se recargue el dataset (re-entrenamiento mensual, ver `marco_metodologico.md` Fase 6), este texto seguirá diciendo lo mismo hasta que alguien lo edite manualmente en el código.** Es una limitación real de mantenimiento, no solo un detalle cosmético.

## 3. Lo que el chatbot SÍ hace bien (vale la pena resaltarlo ante el jurado)

- El prompt instruye explícitamente: *"No inventes cifras específicas que no conozcas — di que no cuentas con ese dato exacto"* — una salvaguarda real contra alucinaciones, aunque no basada en recuperación de evidencia.
- Redirige a la línea 123 en situaciones de emergencia.
- Da recomendaciones preventivas específicas por tipo de riesgo (comercial, residencial, escopolamina, arma de fuego).
- Mantiene historial conversacional (últimos 10 turnos) para dar continuidad a la conversación.
- Responde siempre en español y con longitud acotada (150 palabras), lo que es apropiado para una interfaz de chat flotante.

## 4. Trazabilidad real (ajustada)

A diferencia de un sistema RAG, **no es posible vincular una respuesta específica a una fila concreta de la base de datos**, porque no hay consulta por pregunta. Lo que sí es trazable es el propio `SISTEMA_PROMPT` como artefacto versionado en el repositorio (`src/services/groqService.js`): cualquier persona puede leer exactamente qué conocimiento se le dio al modelo y qué instrucciones sigue.

## 5. Retroalimentación

La interfaz administrativa incluye una vista de calificaciones del chatbot (`AdminFeedback.jsx`). **No se ha verificado aún el código de captura de esas calificaciones** (`adminService.js` no ha sido revisado en este documento) — pendiente de confirmar si el 👍/👎 se guarda y desde dónde se consulta.

## 6. Mejora recomendada (trabajo futuro, no implementada por restricciones de tiempo)

Para acercar SEPH a una arquitectura RAG real antes de futuras iteraciones del proyecto:

1. Antes de llamar a Groq, ejecutar una consulta rápida a Supabase según palabras clave de la pregunta (municipio mencionado, tipo de hurto, etc.) y **agregar esos resultados al mensaje** enviado a Groq como contexto adicional (no reemplazar el `SISTEMA_PROMPT`, sino complementarlo por turno).
2. Generar las cifras agregadas del prompt (`381.624 registros...`, etc.) dinámicamente en cada carga del dataset, en vez de escribirlas a mano en el código — por ejemplo, calculándolas en `cargar_csv_supabase.py` al final de la ingesta y guardándolas en una tabla de configuración que el frontend consulte.

## 7. Corrección de alcance en el resto de la documentación

Se corrigen las siguientes menciones a "RAG" en otros documentos de este repositorio, por ser inexactas:

- `README.md`, sección 4 (Solución / Modelo de IA)
- `docs/arquitectura.md`, tabla de stack tecnológico
- `docs/marco_metodologico.md`, Fase 5 (Despliegue)
