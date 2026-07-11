import { useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import {
  getReportes, crearReporte, toggleLike, agregarComentario,
  getComentarios, getTop3Semanal, getMetricas, getMisLikes,
  loginConX, cerrarSesion, getUsuarioActual
} from '../services/reportesService'
import './Reportes.css'

const TIPOS_HURTO = [
  'Hurto a persona', 'Hurto a residencia', 'Hurto a comercio',
  'Hurto de vehículo', 'Hurto de celular', 'Otro'
]

/* ── Tarjeta individual de reporte ── */
function TarjetaReporte({ reporte, usuario, misLikes, onLike, onVerComentarios }) {
  const yaDioLike = misLikes.includes(reporte.id)

  const fechaRelativa = (fecha) => {
    const diff = Date.now() - new Date(fecha)
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    return `hace ${Math.floor(hrs / 24)}d`
  }

  const compartirEnX = () => {
    const texto = encodeURIComponent(
      `🚨 Reporte de hurto en ${reporte.municipio}, ${reporte.departamento}: ${reporte.titulo} #SEPH #SeguridadColombia`
    )
    window.open(`https://twitter.com/intent/tweet?text=${texto}`, '_blank')
  }

  return (
    <div className="rep-card">
      <div className="rep-card-header">
        <img
          className="rep-card-avatar"
          src={reporte.autor_avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(reporte.autor_nombre)}&background=1a3a6b&color=fff`}
          alt={reporte.autor_nombre}
        />
        <div style={{ flex: 1 }}>
          <div className="rep-card-autor">{reporte.autor_nombre}</div>
          <div className="rep-card-meta">
            𝕏 · {fechaRelativa(reporte.created_at)} · 📍 {reporte.municipio}, {reporte.departamento}
          </div>
        </div>
        <span className="rep-card-tipo">{reporte.tipo_hurto}</span>
      </div>

      <div className="rep-card-body">
        <h3 className="rep-card-titulo">{reporte.titulo}</h3>
        <p className="rep-card-desc">{reporte.descripcion}</p>
        {reporte.imagen_url && (
          <img className="rep-card-img" src={reporte.imagen_url} alt="Evidencia del reporte" />
        )}
      </div>

      <div className="rep-card-acciones">
        <button
          className={`btn-like ${yaDioLike ? 'liked' : ''}`}
          onClick={() => onLike(reporte.id)}
        >
          {yaDioLike ? '❤️' : '🤍'} {reporte.likes_count}
        </button>
        <button className="btn-comentar" onClick={() => onVerComentarios(reporte)}>
          💬 {reporte.comentarios_count}
        </button>
        <button className="btn-compartir-x" onClick={compartirEnX}>
          𝕏 Compartir
        </button>
      </div>
    </div>
  )
}

/* ── Modal de comentarios ── */
function ModalComentarios({ reporte, usuario, onCerrar }) {
  const [comentarios, setComentarios] = useState([])
  const [texto,       setTexto]       = useState('')
  const [enviando,    setEnviando]    = useState(false)

  useEffect(() => {
    if (reporte) getComentarios(reporte.id).then(setComentarios)
  }, [reporte])

  const enviar = async () => {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    try {
      await agregarComentario(reporte.id, texto.trim())
      setTexto('')
      setComentarios(await getComentarios(reporte.id))
    } catch (e) {
      alert(e.message)
    } finally {
      setEnviando(false)
    }
  }

  if (!reporte) return null

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-header-titulo">💬 {reporte.titulo}</span>
          <button className="btn-cerrar-modal" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-body">
          {comentarios.length === 0 ? (
            <p style={{ color: '#b0bcd4', fontSize: '13px', textAlign: 'center', paddingTop: '20px' }}>
              Sé el primero en comentar
            </p>
          ) : (
            comentarios.map((c, i) => (
              <div key={i} className="comentario-item">
                <p className="comentario-texto">{c.contenido}</p>
                <p className="comentario-fecha">
                  {new Date(c.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
            ))
          )}
        </div>

        {usuario ? (
          <div className="modal-input-row">
            <input
              className="modal-input"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Escribe un comentario..."
            />
            <button
              className="btn-enviar-comentario"
              onClick={enviar}
              disabled={enviando || !texto.trim()}
            >
              {enviando ? '...' : 'Enviar'}
            </button>
          </div>
        ) : (
          <p className="modal-login-aviso">Inicia sesión con 𝕏 para comentar</p>
        )}
      </div>
    </div>
  )
}

/* ── Página principal ── */
export default function Reportes() {
  const [usuario,       setUsuario]       = useState(null)
  const [reportes,      setReportes]      = useState([])
  const [top3,          setTop3]          = useState([])
  const [metricas,      setMetricas]      = useState(null)
  const [misLikes,      setMisLikes]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [mostrarForm,   setMostrarForm]   = useState(false)
  const [reporteActivo, setReporteActivo] = useState(null)
  const [imagen,        setImagen]        = useState(null)
  const [preview,       setPreview]       = useState(null)
  const [enviando,      setEnviando]      = useState(false)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', tipo_hurto: 'Hurto a persona',
    municipio: '', departamento: ''
  })
  const fileRef = useRef()

  useEffect(() => {
    cargarDatos()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUsuario(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [user, r, t, m] = await Promise.all([
        getUsuarioActual(), getReportes(), getTop3Semanal(), getMetricas()
      ])
      setUsuario(user)
      setReportes(r)
      setTop3(t)
      setMetricas(m)
      if (user && r.length > 0) setMisLikes(await getMisLikes(r.map(x => x.id)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin   = async () => { try { await loginConX() } catch (e) { alert(e.message) } }
  const handleLogout  = async () => { await cerrarSesion(); setUsuario(null); setMisLikes([]) }
  const handleImagen  = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImagen(file)
    setPreview(URL.createObjectURL(file))
  }

  const handlePublicar = async () => {
    if (!form.titulo || !form.descripcion || !form.municipio) {
      alert('Completa título, descripción y municipio')
      return
    }
    setEnviando(true)
    try {
      await crearReporte(form, imagen)
      setForm({ titulo: '', descripcion: '', tipo_hurto: 'Hurto a persona', municipio: '', departamento: '' })
      setImagen(null); setPreview(null); setMostrarForm(false)
      await cargarDatos()
    } catch (e) {
      alert(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const handleLike = async (id) => {
    if (!usuario) { alert('Inicia sesión con 𝕏 para dar like'); return }
    try {
      const dioLike = await toggleLike(id)
      setMisLikes(prev => dioLike ? [...prev, id] : prev.filter(x => x !== id))
      setReportes(prev => prev.map(r =>
        r.id === id ? { ...r, likes_count: r.likes_count + (dioLike ? 1 : -1) } : r
      ))
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="rep-header">
        <h1 className="rep-title">Reportes Ciudadanos</h1>
        {usuario ? (
          <div className="rep-usuario">
            <img className="rep-usuario-avatar" src={usuario.user_metadata?.avatar_url || ''} alt="" />
            <span className="rep-usuario-nombre">
              {usuario.user_metadata?.full_name ?? usuario.user_metadata?.name ?? 'Usuario'}
            </span>
            <button className="btn-salir" onClick={handleLogout}>Salir</button>
          </div>
        ) : (
          <button className="btn-login-x" onClick={handleLogin}>
            𝕏 Iniciar sesión con X
          </button>
        )}
      </div>

      {/* KPIs */}
      {metricas && (
        <div className="rep-kpis">
          <div className="kpi-card">
            <div className="kpi-label">Total reportes</div>
            <div className="kpi-value">{metricas.total_reportes ?? 0}</div>
            <div className="kpi-sub">{metricas.reportes_semana ?? 0} esta semana</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Interacciones</div>
            <div className="kpi-value">
              {Number(metricas.total_likes ?? 0) + Number(metricas.total_comentarios ?? 0)}
            </div>
            <div className="kpi-sub">
              ❤️ {metricas.total_likes ?? 0} · 💬 {metricas.total_comentarios ?? 0}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Ciudadanos activos</div>
            <div className="kpi-value">{metricas.ciudadanos_activos ?? 0}</div>
            <div className="kpi-sub">{metricas.municipios_con_reporte ?? 0} municipios</div>
          </div>
        </div>
      )}

      {/* Layout feed + sidebar */}
      <div className="rep-layout">

        {/* Feed */}
        <div>
          {usuario && (
            <button className="btn-nueva-pub" onClick={() => setMostrarForm(v => !v)}>
              📝 ¿Qué hurto quieres reportar?
            </button>
          )}

          {/* Formulario */}
          {mostrarForm && usuario && (
            <div className="rep-form-card">
              <h3 className="rep-form-titulo-h3">📢 Nuevo reporte</h3>

              <input
                className="rep-form-input"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="Título del reporte *"
              />

              <textarea
                className="rep-form-textarea"
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe lo que ocurrió *"
                rows={3}
              />

              <div className="rep-form-grid">
                <select
                  className="rep-form-select"
                  value={form.tipo_hurto}
                  onChange={e => setForm({ ...form, tipo_hurto: e.target.value })}
                >
                  {TIPOS_HURTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  className="rep-form-input"
                  style={{ margin: 0 }}
                  value={form.municipio}
                  onChange={e => setForm({ ...form, municipio: e.target.value })}
                  placeholder="Municipio *"
                />
              </div>

              <input
                className="rep-form-input"
                value={form.departamento}
                onChange={e => setForm({ ...form, departamento: e.target.value })}
                placeholder="Departamento"
              />

              <div style={{ marginBottom: '12px' }}>
                <input type="file" accept="image/*" ref={fileRef} onChange={handleImagen} style={{ display: 'none' }} />
                <button className="btn-adjuntar" onClick={() => fileRef.current.click()}>
                  📷 {imagen ? imagen.name : 'Adjuntar imagen (opcional)'}
                </button>
                {preview && <img className="rep-preview-img" src={preview} alt="preview" />}
              </div>

              <div className="rep-form-acciones">
                <button className="btn-publicar" onClick={handlePublicar} disabled={enviando}>
                  {enviando ? '⏳ Publicando...' : '📢 Publicar reporte'}
                </button>
                <button className="btn-cancelar-form" onClick={() => { setMostrarForm(false); setPreview(null); setImagen(null) }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="loading">⏳ Cargando reportes...</div>
          ) : reportes.length === 0 ? (
            <div className="loading">📭 Aún no hay reportes. ¡Sé el primero!</div>
          ) : (
            reportes.map(r => (
              <TarjetaReporte
                key={r.id}
                reporte={r}
                usuario={usuario}
                misLikes={misLikes}
                onLike={handleLike}
                onVerComentarios={setReporteActivo}
              />
            ))
          )}
        </div>

        {/* Panel lateral */}
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">🏆 Top 3 de la semana</span>
            </div>
            <div className="card-body" style={{ padding: '12px 14px' }}>
              {top3.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#b0bcd4', textAlign: 'center', padding: '8px 0' }}>
                  Aún no hay reportes esta semana
                </p>
              ) : (
                top3.map((r, i) => (
                  <div key={r.id} className="top3-item">
                    <span className="top3-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <div style={{ flex: 1 }}>
                      <p className="top3-titulo">{r.titulo}</p>
                      <p className="top3-meta">
                        {r.municipio} · ❤️ {r.likes_count} · 💬 {r.comentarios_count}
                      </p>
                      <span className="top3-score">
                        Score: {Number(r.score_semanal).toFixed(0)} pts
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rep-ml-info">
            🤖 <strong>Score ML</strong> calculado automáticamente:<br />
            <code>(likes × 2) + comentarios + factor recencia</code>
          </div>
        </div>
      </div>

      {/* Modal */}
      <ModalComentarios
        reporte={reporteActivo}
        usuario={usuario}
        onCerrar={() => setReporteActivo(null)}
      />
    </div>
  )
}