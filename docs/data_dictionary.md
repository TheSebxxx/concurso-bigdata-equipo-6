# Diccionario de datos

Este documento describe (1) las variables del dataset original de la Policía Nacional tal como llegan en el CSV, y (2) el modelo de datos procesado y almacenado en Supabase PostgreSQL, para que cualquier persona externa pueda entender el flujo completo del dato: de la fuente cruda a las tablas que alimentan el dashboard, el modelo predictivo y el chatbot.

## 1. Dataset original (`data/raw/`)

Fuente: *Reporte Hurto por Modalidades — Policía Nacional* (datos.gov.co).

| Campo | Descripción | Tipo de dato | Ejemplo |
|---|---|---|---|
| `DEPARTAMENTO` | Ubicación administrativa de nivel superior. | String | `ANTIOQUIA` |
| `MUNICIPIO` | Ciudad o municipio donde ocurrió el hurto. | String | `MEDELLÍN` |
| `CODIGO DANE` | Identificador oficial del municipio (DANE). | Integer | `05001` |
| `ARMAS MEDIOS` | Objeto o método usado en el delito. | String | `ARMA BLANCA` |
| `FECHA HECHO` | Fecha de reporte del incidente. | Date (`YYYY-MM-DD`) | `2026-06-19` |
| `TIPO DE HURTO` | Modalidad (residencial o comercial). | String | `HURTO RESIDENCIAS` |
| `CANTIDAD` | Número de eventos registrados en esa fila. | Integer | `1` |

**Notas de calidad aplicadas antes de la carga (ver `docs/conclusiones.md` para el detalle completo de las 6 dimensiones):**
- Estandarización de nombres de municipios y departamentos (mayúsculas, sin tildes duplicadas, cruce contra el listado oficial DANE).
- Normalización del formato de fecha a ISO 8601.
- Descarte de duplicados exactos (mismo municipio + fecha + modalidad + cantidad).

## 2. Modelo de datos procesado (Supabase PostgreSQL)

Esquema `public`, base de datos maestra que alimenta el dashboard, el modelo predictivo y el chatbot.

### 2.1 Tablas de dimensión

| Tabla | Campo | Tipo | Descripción |
|---|---|---|---|
| `ubicaciones` | `id` | uuid (PK) | Identificador interno. |
| | `codigo_dane` | bigint (UK) | Código oficial DANE del municipio. |
| | `departamento` / `municipio` | varchar | Nombres normalizados. |
| | `lat` / `lng` | numeric | Coordenadas usadas en los mapas de calor. |
| `tipos_hurto` | `id` | uuid (PK) | Identificador interno. |
| | `codigo` | varchar (UK) | Código de la modalidad. |
| | `descripcion` | text | Descripción de la modalidad (residencial/comercial). |
| `armas_medios` | `id` | uuid (PK) | Identificador interno. |
| | `nombre` | varchar (UK) | Arma o medio empleado. |

### 2.2 Tabla de hechos

| Tabla | Campo | Tipo | Descripción |
|---|---|---|---|
| `registros_hurto` | `id` | uuid (PK) | Identificador del registro. |
| | `ubicacion_id`, `tipo_hurto_id`, `arma_medio_id` | uuid (FK) | Relación con las dimensiones. |
| | `fecha_hecho` | date | Fecha del hurto. |
| | `grupo_etario` | varchar | `ADULTOS` / `ADOLESCENTES` / `MENORES` / `NO REPORTA`. |
| | `cantidad` | smallint | Número de eventos (> 0). |

### 2.3 Tablas de resultados del modelo

| Tabla | Campo | Tipo | Descripción |
|---|---|---|---|
| `predicciones` | `ubicacion_id`, `tipo_hurto_id` | uuid (FK) | Zona y modalidad proyectada. |
| | `periodo_prediccion` | date | Mes proyectado (horizonte de 3 meses). |
| | `cantidad_predicha` | numeric | Hurtos proyectados. |
| | `nivel_riesgo` | varchar | `BAJO` / `MEDIO` / `ALTO` / `CRITICO`. |
| | `confianza_pct` | numeric (0–100) | Confianza reportada de la predicción. |
| | `modelo_version` | varchar | Versión del modelo (`1.0.0`). |

### 2.4 Tablas de producto (dashboard, participación ciudadana y administración)

| Tabla | Propósito |
|---|---|
| `recomendaciones` / `recomendaciones_ubicaciones` | Estrategias de prevención (automáticas o creadas por admin), asociadas a nivel de riesgo, tipo de aplicación y ubicaciones. |
| `alertas` | Umbrales por ubicación/tipo de hurto y periodo (diario, semanal, mensual) que disparan notificaciones internas. |
| `reportes_ciudadanos` | Reportes de hurto tipo publicación, con geolocalización, red social de origen y métricas de interacción (`likes_count`, `comentarios_count`, `score_semanal`). |
| `interacciones` | Likes y comentarios asociados a `reportes_ciudadanos`. |
| `ingestas_dataset` | Log de cada carga de CSV: registros totales, nuevos, omitidos y estado (`EXITO`/`FALLIDO`/`PARCIAL`). |
| `admins` | Usuarios administrativos, con rol (`superadmin`/`admin`) y control de creación jerárquico. |

> El diagrama entidad-relación completo está disponible en [`docs/img/modelo_entidad_relacion.jpeg`](img/modelo_entidad_relacion.jpeg) y referenciado en [`docs/arquitectura.md`](arquitectura.md).
