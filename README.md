# SEPH — Sistema de Estadísticas y Predicción de Hurtos

**Reto:** Seguridad Ciudadana y Justicia · **Nivel de complejidad:** Básico
**Convocatoria:** Datos al Ecosistema 2026: IA para Colombia (MinTIC)

 **Dashboard / Solución en vivo:** https://seph-colombia.onrender.com/#
 **Pitch:** ver `recursos/Informe_Tecnico_SEPH_V1.0.pdf`

---

## 1. Problema

La seguridad ciudadana en Colombia enfrenta desafíos por el aumento de hurtos, lo que exige que la respuesta institucional pase de ser reactiva a ser ágil y basada en evidencia.

**Pregunta de investigación:** ¿de qué manera la analítica diagnóstica y predictiva aplicada al dataset de la Policía Nacional permite identificar zonas críticas y orientar la toma de decisiones preventivas?

## 2. Justificación (ODS 16)

El proyecto se alinea con el **ODS 16 — Paz, Justicia e Instituciones Sólidas**, al fortalecer instituciones eficaces, responsables y transparentes mediante decisiones de seguridad basadas en evidencia, y se integra en la hoja de ruta nacional de Seguridad Humana y Justicia Social.

## 3. Datos

- **Fuente:** Reporte Hurto por Modalidades — Policía Nacional ([datos.gov.co](https://www.datos.gov.co)).
- **Volumen:** 633.803 registros individuales de hurto (2010-01-01 a 2026-03-01), cubriendo 1.017 municipios.
- **Variables clave:** `DEPARTAMENTO`, `MUNICIPIO`, `CODIGO DANE`, `ARMAS MEDIOS`, `FECHA HECHO`, `TIPO DE HURTO`, `CANTIDAD`.
- Diccionario completo → [`docs/data_dictionary.md`](docs/data_dictionary.md)

## 4. Solución / Modelo de IA

- **Metodología:** CRISP-ML(Q), 6 fases → [`docs/marco_metodologico.md`](docs/marco_metodologico.md)
- **Modelo:** Árbol de Decisión (v1.0.0), entrenado sobre variables temporales, espaciales y contextuales, con proyección a 3 meses.
- **Interpretabilidad:** el modelo no es una caja negra; expone los factores que más influyen en cada predicción.
- **Asistente conversacional (SEPH):** en lugar de un RAG dinámico, aprovechamos la amplia ventana de contexto del modelo Llama 3.3 70B en Groq. Diseñamos un prompt de sistema optimizado donde inyectamos la síntesis analítica de los 633.803 registros, garantizando respuestas inmediatas, institucionales y blindadas contra alucinaciones métricas. Ver detalle → [`docs/chatbot_rag_matriz.md`](docs/chatbot_rag_matriz.md)
- **Arquitectura completa:** → [`docs/arquitectura.md`](docs/arquitectura.md)

## 5. Diferenciador

Módulo de **reportes ciudadanos publicables en redes sociales** (X, con proyección a Facebook e Instagram): cualquier ciudadano puede registrar un hurto, compartirlo como publicación estructurada y generar interacción comunitaria (likes, comentarios, ranking semanal), convirtiendo a la ciudadanía en un sensor activo de seguridad.

## 6. Impacto

- **Policía Nacional / entes territoriales:** priorización de recursos de prevención basada en zonas de riesgo.
- **Ciudadanía:** acceso público a estadísticas, predicciones y un canal de reporte y consulta vía chatbot.
- **Impacto territorial:** arquitectura ligera (Supabase + procesamiento por lotes), pensada para adaptarse a zonas con conectividad limitada.

Resultados, métricas y limitaciones → [`docs/conclusiones.md`](docs/conclusiones.md)

## 7. Estructura del repositorio

```
concurso-bigdata-equipo-6/
├── src/                          # App React/Vite (dashboard, chatbot, panel admin)
│   ├── components/               # Chatbot.jsx, etc.
│   ├── pages/                    # Dashboard, Estadisticas, MapaCalor, Predicciones,
│   │                             # Recomendaciones, Reportes, admin/*
│   └── services/                 # groqService.js, hurtosService.js, reportesService.js,
│                                 # adminService.js, supabaseClient.js
├── public/
├── index.html, vite.config.js, package.json, eslint.config.js
│
├── scripts/
│   ├── cargar_coordenadas.py     # Geocodificación de municipios
│   ├── cargar_csv_supabase.py    # ETL CSV → Supabase
│   └── modelo_prediccion.py      # Modelo predictivo (Árbol de Decisión)
│
├── database/
│   └── supabase_schema_prediccion_hurtos.sql   # Esquema completo de la base de datos
│
├── notebooks/
│   ├── 02_Validacion_y_Carga.ipynb    # Validación real vs. constraints de BD
│   └── 03_Modelo.ipynb               # Entrenamiento y evaluación (MAE, R²)
│
├── Diagramas/                    # Diagramas de arquitectura y flujos
├── docs/
│   ├── data_dictionary.md
│   ├── marco_metodologico.md
│   ├── arquitectura.md
│   ├── conclusiones.md
│   └── chatbot_rag_matriz.md
├── recursos/
│   ├── Informe_Tecnico_SEPH_V1.0.pdf
│   ├── Product_Backlog_Prediccion_Hurtos_Colombia.xlsx
│   └── mockup_prediccion_hurtos_dashboard.html
│
├── .env                          # NUNCA se sube (ver .gitignore)
├── .gitignore
├── README.md
├── requirements.txt
└── LICENSE
```

## 8. Instalación y ejecución local

```bash
git clone <url-del-repo>
cd concurso-bigdata-equipo-6
pip install -r requirements.txt
```

Variables de entorno necesarias — crear archivo `.env` en la raíz (**no subirlo al repo**):

```
SUPABASE_URL=
SUPABASE_KEY=
GROQ_API_KEY=
X_API_KEY=
X_API_SECRET=
```

Ejecución de scripts (en orden):

```bash
python scripts/cargar_csv_supabase.py   # Carga inicial del dataset a Supabase
python scripts/cargar_coordenadas.py    # Geocodifica municipios (lat/lng)
python scripts/modelo_prediccion.py     # Entrena el modelo y genera predicciones
```

Ejecución del frontend:

```bash
npm install
npm run dev
```

## 9. Equipo

- Mariana Rivera Pereira
- Johan Sebastián Ramírez Orozco
- Yuli Andrea Álvarez Pizarro

## 10. Licencia

Este proyecto se distribuye bajo licencia **MIT** (ver [`LICENSE`](LICENSE)). El dataset original pertenece a la Policía Nacional y se publica bajo los términos de [datos.gov.co](https://www.datos.gov.co).
