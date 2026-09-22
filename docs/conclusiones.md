Conclusiones, métricas y limitaciones
1. Hallazgos principales
Basado en los 633.803 registros cargados en Supabase (2010-01-01 a 2026-03-01, 1.017 municipios):

Concentración geográfica: Bogotá D.C. es, por lejos, el municipio con más hurtos registrados (30.243), seguido de Cali (16.391), Medellín (16.315), Barranquilla (10.160) y Villavicencio (8.870). Las 4 principales ciudades del país concentran una proporción muy alta del total nacional.

Modalidad fuertemente desbalanceada hacia lo comercial: 339.456 hurtos clasificados como ART239-COM (entidades comerciales) frente a 42.168 como ART239-RES (residencias) — es decir, ~89 % comercial vs. ~11 % residencial. Esto es consistente con que el catálogo tipos_hurto solo contiene estas dos modalidades (no es un artefacto de la heurística de clasificación por palabra clave del ETL, sino la naturaleza real del dataset).

"Sin empleo de armas" es la categoría más frecuente por amplio margen: 211.776 casos, más del triple que la siguiente (contundentes, 57.398), seguida de arma de fuego (55.199), palancas (32.774) y arma blanca/cortopunzante (11.034). Esto sugiere que la mayoría de los hurtos registrados no involucran violencia armada directa (posiblemente hurto por descuido, oportunidad o alta destreza).

Estacionalidad concentrada en el primer trimestre: enero es el mes histórico con más hurtos (37.370), seguido de marzo (35.082) y febrero (34.567) — los tres meses de mayor actividad delictiva del año son consecutivos y ocurren al inicio del año calendario.

2. Métricas de evaluación del modelo
El script cargar_csv_supabase.py cargó exitosamente 633.803 registros individuales de hurtos (2010-01-01 a 2026-03-01, 1.017 municipios) a Supabase. modelo_prediccion.py los agrega a 78.646 filas (mes × municipio × tipo de hurto) para entrenar el modelo, y calculó sobre el conjunto de prueba:

MAE (Error Absoluto Medio): 1.47 hurtos/mes.

R² (coeficiente de determinación): 0.9417 — el modelo explica ~94 % de la varianza en el conjunto de prueba.

Conjunto de prueba: 20 % de las 78.646 filas agregadas, mediante train_test_split(test_size=0.2, random_state=42).

Salida generada: 6.153 predicciones (3 meses × 1.017 municipios × tipos de hurto), ya almacenadas en la tabla predicciones.


El R² de 0.94 es alto, pero debe leerse junto con la limitación de la siguiente sección: al no ser un split cronológico, el modelo pudo entrenarse con meses posteriores a los que usó para evaluarse a sí mismo, lo que probablemente infla este valor frente a un escenario real de predicción a futuro. Es honesto reportarlo así ante el jurado, en vez de presentar el 0.94 sin ese contexto.

Limitación metodológica identificada: split aleatorio en lugar de cronológico

El train_test_split actual es aleatorio, no cronológico. Como el problema es una serie de tiempo (predicción de hurtos futuros a partir de historia pasada), esto significa que el modelo puede entrenarse con meses posteriores a los que luego usa para "probarse", lo cual puede sobreestimar el desempeño real frente al escenario genuino de predecir el futuro sin haberlo visto.

Se documenta como limitación conocida y no como error oculto. Como mejora propuesta (no aplicada aún por restricciones de tiempo del concurso), se recomienda reemplazar el split por uno cronológico:

python# Alternativa recomendada para trabajo futuro (no implementada en la versión actual)
df_feat = df_feat.sort_values("mes")
corte = df_feat["mes"].quantile(0.8)
train = df_feat[df_feat["mes"] <= corte]
test  = df_feat[df_feat["mes"] > corte]
Otras decisiones de diseño documentadas para transparencia ante el jurado

nivel_riesgo se determina por reglas sobre cuantiles históricos del municipio (p25/p50/p75), no como salida directa del árbol de decisión.

confianza_pct es una heurística de cercanía entre la predicción y el promedio histórico del municipio+tipo (acotada 50–95 %), no un intervalo de confianza estadístico derivado del modelo.

Las predicciones de los meses 2 y 3 del horizonte reutilizan los mismos valores de lag_1/lag_3 del último dato real disponible (no se recalculan de forma iterativa mes a mes), por lo que se espera mayor error en esos meses frente al mes 1.

El modelo actual no usa armas_medios como variable predictiva (esa dimensión solo se usa en el módulo de estadísticas del dashboard).

3. Las 6 dimensiones de calidad de datos

DimensiónEstado real en cargar_csv_supabase.pyExactitudParcial: se valida que existan las columnas obligatorias (CODIGO DANE, FECHA HECHO, TIPO DE HURTO, CANTIDAD) antes de procesar, pero no se valida el contenido semántico de cada celda.UnicidadParcial: el catálogo ubicaciones usa ON CONFLICT (codigo_dane) DO UPDATE (no se duplican municipios), pero no hay deduplicación a nivel de fila en registros_hurto — si el CSV trae una fila repetida, se inserta dos veces.CompletitudSe descartan filas con CODIGO DANE inválido o ausente (control real de completitud/validez). Los campos ARMAS MEDIOS y GRUPO ETARIO vacíos se rellenan con valores por defecto (NO REPORTADO / ADULTOS) en vez de dejarse nulos.ConsistenciaSe normaliza texto de municipio/departamento a mayúsculas y se recorta el sufijo " (CT)". La fecha se interpreta con formato día/mes/año fijo (dayfirst=True).ActualidadCada ejecución queda registrada en ingestas_dataset con fecha, total procesado, insertados y omitidos — permite saber qué tan vigente está la información cargada.ValidezRestricciones CHECK/UNIQUE/FK a nivel de base de datos (ver data_dictionary.md), más el filtro de CODIGO DANE > 0 en el ETL.
Riesgos de calidad identificados (para documentar con transparencia)

Clasificación de modalidad por palabra clave (riesgo menor de lo esperado): se confirmó con los datos ya cargados que tipos_hurto solo contiene dos categorías reales (ART239-COM y ART239-RES), por lo que la heurística por palabra clave "RESIDENCIA" está capturando correctamente la modalidad real del dataset, no forzando una clasificación artificial. El fuerte desbalance observado (~89 % comercial / ~11 % residencial, ver sección 1) refleja la composición real del dataset de la Policía Nacional, no un artefacto del ETL.
Fechas no parseables se reemplazan por la fecha actual del sistema, en lugar de descartarse o marcarse como pendientes de revisión — puede introducir registros con fecha incorrecta sin que se note a simple vista.
No hay deduplicación de filas del CSV antes de insertar en registros_hurto; si la fuente trae registros repetidos, el conteo total de hurtos puede estar inflado.

4. Limitaciones conocidas

El dataset ya cargado (633.803 registros, 1.017 municipios, 2010–2026) es sustancialmente más grande de lo estimado al inicio del proyecto; algunos municipios pequeños igual pueden tener pocos hurtos históricos, lo que limita la granularidad de sus predicciones específicas.

✅ Resuelto (era bloqueante): cargar_csv_supabase.py intentaba insertar una columna genero en registros_hurto que no existe en el esquema real de Supabase (confirmado contra el export actual de la base de datos). Se corrigió el script para que el INSERT coincida exactamente con las columnas reales de la tabla (id, ubicacion_id, tipo_hurto_id, arma_medio_id, fecha_hecho, grupo_etario, cantidad).

El split de entrenamiento/prueba del modelo es aleatorio, no cronológico (ver sección 2), lo que puede sobreestimar el desempeño del modelo frente al escenario real de predicción a futuro. Queda como mejora prioritaria antes de la entrega final si el tiempo lo permite.

Las predicciones a 2 y 3 meses reutilizan los lag_1/lag_3 del último dato real, sin recalcularlos de forma iterativa, por lo que se espera menor precisión conforme el horizonte de predicción se aleja.

El modelo no incorpora armas_medios como variable predictiva; esa información se usa únicamente a nivel descriptivo en el dashboard.
confianza_pct es una heurística de cercanía al promedio histórico, no una medida estadística de incertidumbre del modelo — se documenta así para no sobrerrepresentar su rigor ante el jurado.

La clasificación de TIPO DE HURTO en residencial/comercial se hace por palabra clave ("RESIDENCIA") en el ETL; se confirmó con los datos reales que esto captura correctamente las 2 modalidades existentes en el dataset (ver sección 3 para el detalle).

Las fechas no parseables durante la carga se reemplazan por la fecha del sistema en el momento de la ingesta, en lugar de descartarse.
No hay deduplicación de filas del CSV antes de insertar en registros_hurto.

El chatbot SEPH no implementa RAG real: usa un prompt de sistema con estadísticas y recomendaciones escritas a mano, sin consultar Supabase por pregunta. Las cifras del prompt (p. ej. "2.150 municipios") ya no coinciden con los datos reales tras la carga masiva (1.017 municipios). Ver detalle completo en docs/chatbot_rag_matriz.md.

El panel AdminFeedback implementa moderación de comentarios ciudadanos (lectura y eliminación de registros en la tabla interacciones con tipo = 'comentario'), no un sistema de calificación de respuestas del chatbot. No incluye métricas de satisfacción ni valoración 👍/👎 — esa funcionalidad queda como trabajo futuro.

Los reportes ciudadanos en redes sociales son una fuente complementaria no verificada oficialmente; se tratan como señal comunitaria, no como fuente de verdad para las predicciones del modelo.

La integración de redes sociales está limitada actualmente a X; Facebook e Instagram quedan como trabajo futuro.

5. Trabajo futuro

Reemplazar el split aleatorio por un split cronológico para una evaluación más realista del desempeño en producción.

Recalcular lag_1/lag_3 de forma iterativa mes a mes en la proyección a 3 meses, en lugar de reutilizar el último dato real.

Evaluar la inclusión de armas_medios como variable predictiva adicional del modelo.

Extender el módulo de reportes ciudadanos a Facebook e Instagram.

Incorporar variables socioeconómicas adicionales (si se dispone de datos abiertos complementarios) para enriquecer el modelo.

Evaluar modelos alternativos (Random Forest, Gradient Boosting) manteniendo la interpretabilidad como criterio de selección.

Implementar calificación de respuestas del chatbot (👍/👎) conectada a Supabase, que permita medir la utilidad real de las respuestas generadas y alimentar mejoras futuras al prompt.
