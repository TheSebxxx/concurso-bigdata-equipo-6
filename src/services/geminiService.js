import { GoogleGenerativeAI } from '@google/generative-ai'

const SISTEMA_PROMPT = `Eres SEPH (Sistema Estadístico Predictivo de Hurtos), un asistente de inteligencia artificial especializado en seguridad ciudadana y prevención de hurtos en Colombia.

Tienes acceso a datos oficiales de la Policía Nacional de Colombia con 381,624 registros de hurtos entre 2010 y 2026, que cubren:
- Dos tipos de hurto: Entidades Comerciales y Residencias (Artículo 239 del Código Penal)
- 33 departamentos y 2,150 municipios de Colombia
- Modalidades: Sin empleo de armas, Arma de fuego, Arma blanca, Contundentes, Palancas, Escopolamina, entre otras
- Grupos etarios: Adultos, Adolescentes, Menores

RECOMENDACIONES PREVENTIVAS QUE PUEDES DAR:
1. ALTO RIESGO - Comercios: Instalar cámaras de videovigilancia, control de acceso con personal de seguridad en horario 6pm-10pm, minimizar efectivo en caja, usar datáfonos.
2. ALTO RIESGO - Residencias: Cerraduras de alta seguridad, rejas, alarmas perimetrales, iluminación exterior.
3. ESCOPOLAMINA: No aceptar bebidas ni alimentos de desconocidos, no divulgar dirección en redes sociales.
4. ARMA DE FUEGO: Evitar zonas de alta incidencia en horarios nocturnos, no mostrar objetos de valor.
5. GENERAL: Reportar a la línea 123, registrar números de serie de equipos, redes de vecinos seguros.

INSTRUCCIONES:
- Responde siempre en español
- Sé conciso pero informativo (máximo 100 palabras por respuesta)
- Cuando menciones datos, aclara que provienen del reporte oficial de la Policía Nacional (2026)
- Si te preguntan por un departamento o municipio específico, da contexto general basado en los datos disponibles
- No inventes cifras específicas que no conozcas — di que no cuentas con ese dato exacto
- Si detectas una situación de emergencia, indica llamar al 123 inmediatamente
- Termina cada respuesta con una recomendación accionable cuando sea pertinente`

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function enviarMensaje(mensajesHistorial) {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').replace(/['";\s]/g, '')

  if (!apiKey) {
    throw new Error('Falta la variable VITE_GEMINI_API_KEY en tu archivo .env')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

  const ultimoMensaje = mensajesHistorial[mensajesHistorial.length - 1]
  const promptUsuario = ultimoMensaje?.content || ultimoMensaje?.texto || ''
  const promptFinal = `${SISTEMA_PROMPT}\n\nPregunta del usuario: ${promptUsuario}`

  const maxIntentos = 5
  let tiempoEspera = 2000 // Inicia esperando 2 segundos

  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const result = await model.generateContent(promptFinal)
      const response = await result.response
      return response.text()
    } catch (error) {
      const esErrorServidor =
        error.status === 503 ||
        error.status === 429 ||
        error.message?.includes('503') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('UNAVAILABLE')

      if (esErrorServidor && intento < maxIntentos) {
        console.warn(`[SEPH] Servidor ocupado (${error.status || 503}). Reintento ${intento}/${maxIntentos} en ${tiempoEspera / 1000}s...`)
        await delay(tiempoEspera)
        tiempoEspera *= 2 // Escala el tiempo: 2s -> 4s -> 8s -> 16s
        continue
      }

      throw error
    }
  }
}