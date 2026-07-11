import { useState, useRef, useEffect } from 'react'
import { enviarMensaje } from '../services/groqService'

const SUGERENCIAS = [
  '¿Cuáles son los departamentos más peligrosos?',
  '¿Cómo protejo mi negocio del robo?',
  '¿Qué hacer si me roban?',
  '¿Qué es la escopolamina y cómo evitarla?',
  '¿En qué horarios hay más hurtos?',
]

export default function Chatbot() {
  const [abierto,   setAbierto]   = useState(false)
  const [mensajes,  setMensajes]  = useState([
    {
      rol: 'bot',
      texto: '¡Hola! Soy **SEPH**, tu asistente de seguridad ciudadana. Puedo responderte preguntas sobre hurtos en Colombia, zonas de riesgo y medidas preventivas. ¿En qué te ayudo?'
    }
  ])
  const [input,     setInput]     = useState('')
  const [cargando,  setCargando]  = useState(false)
  const [error,     setError]     = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  // Focus al abrir
  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 100)
  }, [abierto])

  async function enviar(texto) {
    const pregunta = (texto ?? input).trim()
    if (!pregunta || cargando) return

    setInput('')
    setError(null)
    setMensajes(prev => [...prev, { rol: 'user', texto: pregunta }])
    setCargando(true)

    try {
      // Construir historial para Groq (últimos 10 turnos)
      const historial = mensajes
        .slice(-10)
        .map(m => ({
          role:    m.rol === 'user' ? 'user' : 'assistant',
          content: m.texto,
        }))
      historial.push({ role: 'user', content: pregunta })

      const respuesta = await enviarMensaje(historial)
      setMensajes(prev => [...prev, { rol: 'bot', texto: respuesta }])
    } catch (e) {
      setError(e.message)
      setMensajes(prev => [...prev, {
        rol: 'bot',
        texto: '⚠️ Lo siento, tuve un problema al procesar tu pregunta. Por favor intenta de nuevo.',
        esError: true,
      }])
    } finally {
      setCargando(false)
    }
  }

  function renderTexto(texto) {
    // Soporte básico de markdown: **negrita**
    return texto.split('**').map((parte, i) =>
      i % 2 === 1
        ? <strong key={i}>{parte}</strong>
        : <span key={i}>{parte}</span>
    )
  }

  return (
    <>
      {/* ── Botón flotante ── */}
      <button
        onClick={() => setAbierto(v => !v)}
        style={{
          position:'fixed', bottom:'24px', right:'24px', zIndex:1000,
          width:'56px', height:'56px', borderRadius:'50%',
          background: abierto ? '#334155' : '#1d4ed8',
          border:'none', cursor:'pointer', fontSize:'24px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.2s',
        }}
        title={abierto ? 'Cerrar asistente' : 'Abrir asistente SEPH'}
      >
        {abierto ? '✕' : '🤖'}
      </button>

      {/* ── Panel del chat ── */}
      {abierto && (
        <div style={{
          position:'fixed', bottom:'90px', right:'24px', zIndex:999,
          width:'360px', height:'520px',
          background:'#1e293b', border:'1px solid #334155',
          borderRadius:'16px', display:'flex', flexDirection:'column',
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          overflow:'hidden',
        }}>

          {/* Header */}
          <div style={{
            background:'#1a3c6b', padding:'12px 16px',
            display:'flex', alignItems:'center', gap:'10px'
          }}>
            <div style={{
              width:'36px', height:'36px', borderRadius:'50%',
              background:'#2563eb', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:'18px', flexShrink:0
            }}>🤖</div>
            <div>
              <div style={{fontSize:'13px', fontWeight:700, color:'#f1f5f9'}}>SEPH IA</div>
              <div style={{fontSize:'10px', color:'#93c5fd'}}>
                {cargando ? '⏳ Escribiendo...' : '🟢 En línea · Groq llama-3.3-70b'}
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{
            flex:1, overflowY:'auto', padding:'12px',
            display:'flex', flexDirection:'column', gap:'10px'
          }}>
            {mensajes.map((m, i) => (
              <div key={i} style={{
                display:'flex',
                justifyContent: m.rol === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth:'85%', padding:'8px 12px', borderRadius:'12px',
                  fontSize:'12px', lineHeight:'1.5',
                  background: m.rol === 'user'
                    ? '#1d4ed8'
                    : m.esError ? '#7f1d1d' : '#0f172a',
                  color: m.rol === 'user' ? '#fff' : '#e2e8f0',
                  borderBottomRightRadius: m.rol === 'user' ? '4px' : '12px',
                  borderBottomLeftRadius:  m.rol === 'bot'  ? '4px' : '12px',
                  border: m.rol === 'bot' ? '1px solid #334155' : 'none',
                }}>
                  {renderTexto(m.texto)}
                </div>
              </div>
            ))}

            {/* Indicador de escritura */}
            {cargando && (
              <div style={{display:'flex', justifyContent:'flex-start'}}>
                <div style={{
                  background:'#0f172a', border:'1px solid #334155',
                  padding:'8px 14px', borderRadius:'12px', borderBottomLeftRadius:'4px',
                  fontSize:'18px', letterSpacing:'2px'
                }}>
                  <span style={{animation:'pulse 1s infinite'}}>●</span>
                  <span style={{animation:'pulse 1s infinite 0.2s', opacity:0.6}}>●</span>
                  <span style={{animation:'pulse 1s infinite 0.4s', opacity:0.3}}>●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugerencias (solo al inicio) */}
          {mensajes.length === 1 && (
            <div style={{
              padding:'0 12px 8px',
              display:'flex', gap:'6px', flexWrap:'wrap'
            }}>
              {SUGERENCIAS.map((s, i) => (
                <button key={i} onClick={() => enviar(s)} style={{
                  background:'#0f172a', border:'1px solid #334155',
                  color:'#94a3b8', padding:'4px 8px', borderRadius:'12px',
                  fontSize:'10px', cursor:'pointer', textAlign:'left',
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding:'10px 12px', borderTop:'1px solid #334155',
            display:'flex', gap:'8px', alignItems:'center'
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
              placeholder="Escribe tu pregunta..."
              disabled={cargando}
              style={{
                flex:1, background:'#0f172a', border:'1px solid #334155',
                color:'#e2e8f0', padding:'8px 12px', borderRadius:'20px',
                fontSize:'12px', outline:'none',
                opacity: cargando ? 0.6 : 1,
              }}
            />
            <button
              onClick={() => enviar()}
              disabled={!input.trim() || cargando}
              style={{
                width:'34px', height:'34px', borderRadius:'50%',
                background: input.trim() && !cargando ? '#1d4ed8' : '#334155',
                border:'none', cursor: input.trim() && !cargando ? 'pointer' : 'default',
                fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, transition:'background 0.2s',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}