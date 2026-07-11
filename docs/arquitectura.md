# Arquitectura del sistema

## 1. Stack tecnológico

| Componente | Tecnología | Función |
|---|---|---|
| Persistencia de datos | PostgreSQL en Supabase | Fuente de verdad única: dataset normalizado, predicciones, recomendaciones, reportes y administración. |
| Procesamiento predictivo | Python (scikit-learn — Árbol de Decisión) | Entrenamiento del modelo, cálculo de proyecciones a 3 meses y niveles de confianza. |
| Asistente conversacional | IA + RAG sobre API de Groq | Respuestas de SEPH fundamentadas en el dataset, predicciones y recomendaciones. |
| Redes sociales | API de X (proyección Facebook/Instagram) | Publicación y difusión de reportes ciudadanos de hurto. |
| Autenticación administrativa | JWT + tabla `admins` | Control de acceso por rol (`superadmin` / `admin`) a la ruta `/admin`. |

## 2. Flujo de datos general

Ingesta de datos abiertos → normalización → almacenamiento en Supabase → procesamiento predictivo (Python/ML) → consumo desde dashboard, chatbot y recomendaciones. En paralelo, el módulo de reportes ciudadanos captura evidencia comunitaria y la persiste en la misma base de datos.

![Flujo de datos general](img/flujo_datos_general.jpeg)

## 3. Modelo de datos

Diseño dimensional: tabla de hechos `registros_hurto` relacionada con las dimensiones `ubicaciones`, `tipos_hurto` y `armas_medios`; tablas de resultados (`predicciones`, `recomendaciones`, `alertas`); y tablas de producto ciudadano/administrativo (`reportes_ciudadanos`, `interacciones`, `admins`, `ingestas_dataset`). Detalle campo a campo en [`data_dictionary.md`](data_dictionary.md).

![Modelo entidad-relación](img/modelo_entidad_relacion.jpeg)

## 4. Navegación de la plataforma

La plataforma se divide en dos árboles de navegación sobre la misma base de datos:

- **Pública/ciudadana:** inicio → dashboard general → mapa de calor (histórico/predictivo) → estadísticas e informes → reportes ciudadanos → recomendaciones → chatbot flotante SEPH.
- **Administrativa:** login (JWT contra `admins`) → panel de administración → gestión de usuarios, recomendaciones, dataset, predicciones, feedback del chatbot y moderación de reportes.

![Mapa de navegación](img/navegacion.jpeg)

## 5. Panel administrativo y control de roles

- **`superadmin`:** acceso total, incluida la creación de nuevos administradores.
- **`admin`:** operación de recomendaciones, dataset, predicciones y reportes, sin gestión de usuarios administrativos.
- **Flujo de dataset:** CSV subido desde el panel → ETL en Python → truncado de `registros_hurto` → re-inserción → re-entrenamiento del modelo → actualización de `predicciones`.

![Estructura del panel administrativo](img/estructura_admin.jpeg)

## 6. Consideraciones de despliegue en zonas de baja conectividad

La arquitectura se apoya en procesamiento por lotes (carga mensual del dataset) y en una base de datos gestionada (Supabase) accesible vía API REST, lo que permite que el consumo desde el frontend sea liviano. Esto facilita adaptar el dashboard a contextos territoriales con conectividad limitada, priorizando vistas estáticas o cacheadas del mapa de calor cuando el ancho de banda es reducido.
