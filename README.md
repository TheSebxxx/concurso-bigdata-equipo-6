<<<<<<< HEAD
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
# SEPH — Sistema de Estadísticas y Predicción de Hurtos

**Reto:** Seguridad Ciudadana y Justicia · **Nivel de complejidad:** Básico
**Convocatoria:** Datos al Ecosistema 2026: IA para Colombia (MinTIC)

> Sustituye el enlace de abajo por la URL pública real antes de cerrar la entrega.

🔗 **Dashboard / Solución en vivo:** `https://<tu-enlace-de-despliegue>`
🎥 **Video demo:** ver `RECURSOS/demo_video.mp4`
📊 **Pitch:** ver `RECURSOS/presentacion_pitch.pdf`

---

## 1. Problema

La seguridad ciudadana en Colombia enfrenta desafíos por el aumento de hurtos, lo que exige que la respuesta institucional pase de ser reactiva a ser ágil y basada en evidencia.

**Pregunta de investigación:** ¿de qué manera la analítica diagnóstica y predictiva aplicada al dataset de la Policía Nacional permite identificar zonas críticas y orientar la toma de decisiones preventivas?

## 2. Justificación (ODS 16)

El proyecto se alinea con el **ODS 16 — Paz, Justicia e Instituciones Sólidas**, al fortalecer instituciones eficaces, responsables y transparentes mediante decisiones de seguridad basadas en evidencia, y se integra en la hoja de ruta nacional de Seguridad Humana y Justicia Social.

## 3. Datos

- **Fuente:** Reporte Hurto por Modalidades — Policía Nacional ([datos.gov.co](https://www.datos.gov.co)).
- **Volumen:** ~1.800–2.000 registros (nivel básico).
- **Variables clave:** `DEPARTAMENTO`, `MUNICIPIO`, `CODIGO DANE`, `ARMAS MEDIOS`, `FECHA HECHO`, `TIPO DE HURTO`, `CANTIDAD`.
- Diccionario completo → [`docs/data_dictionary.md`](docs/data_dictionary.md)

## 4. Solución / Modelo de IA

- **Metodología:** CRISP-ML(Q), 6 fases → [`docs/marco_metodologico.md`](docs/marco_metodologico.md)
- **Modelo:** Árbol de Decisión (v1.0.0), entrenado sobre variables temporales, espaciales y contextuales, con proyección a 3 meses.
- **Interpretabilidad:** el modelo no es una caja negra; expone los factores que más influyen en cada predicción.
- **Asistente conversacional (SEPH):** IA + RAG sobre el dataset, predicciones y recomendaciones, con trazabilidad de fuente.
- **Arquitectura completa:** → [`docs/arquitectura.md`](docs/arquitectura.md)

## 5. Diferenciador

Módulo de **reportes ciudadanos publicables en redes sociales** (X, con proyección a Facebook e Instagram): cualquier ciudadano puede registrar un hurto, compartirlo como publicación estructurada y generar interacción comunitaria (likes, comentarios, ranking semanal), convirtiendo a la ciudadanía en un sensor activo de seguridad.

## 6. Impacto

- **Policía Nacional / entes territoriales:** priorización de recursos de prevención basada en zonas de riesgo.
- **Ciudadanía:** acceso público a estadísticas, predicciones y un canal de reporte y consulta vía chatbot.
- **Impacto territorial:** arquitectura ligera (Supabase + procesamiento por lotes), pensada para poder adaptarse a zonas con conectividad limitada.

Resultados, métricas y limitaciones → [`docs/conclusiones.md`](docs/conclusiones.md)

## 7. Estructura del repositorio

```
├── data/
│   ├── raw/            # Dataset original (Policía Nacional / datos.gov.co)
│   └── processed/      # Dataset limpio, cargado a Supabase
├── docs/
│   ├── data_dictionary.md
│   ├── marco_metodologico.md
│   ├── arquitectura.md
│   ├── conclusiones.md
│   └── chatbot_rag_matriz.md
├── notebooks/
│   ├── 01_EDA.ipynb
│   ├── 02_Limpieza.ipynb
│   └── 03_Modelo.ipynb
├── src/
│   ├── data_load.py
│   ├── model_predict.py
│   └── chatbot_service.py
├── RECURSOS/
│   ├── presentacion_pitch.pdf
│   └── demo_video.mp4
├── README.md
├── requirements.txt
└── LICENSE
```

## 8. Instalación y ejecución local

```bash
git clone <url-del-repo>
cd seph
pip install -r requirements.txt

# Variables de entorno necesarias (crear archivo .env, NO subirlo al repo):
# SUPABASE_URL=
# SUPABASE_KEY=
# GROQ_API_KEY=
# X_API_KEY / X_API_SECRET

python src/data_load.py        # Carga inicial del dataset a Supabase
python src/model_predict.py    # Entrena y genera predicciones
```

## 9. Equipo

- Mariana Rivera Pereira
- Johan Sebastián Ramírez Orozco
- Yuli Andrea Álvarez Pizarro

## 10. Licencia

Este proyecto se distribuye bajo licencia **MIT** (ver [`LICENSE`](LICENSE)). El dataset original pertenece a la Policía Nacional y se publica bajo los términos de [datos.gov.co](https://www.datos.gov.co).
>>>>>>> 1b56acdff08ace3b5095a301ec1bae2fcd2afcfe
