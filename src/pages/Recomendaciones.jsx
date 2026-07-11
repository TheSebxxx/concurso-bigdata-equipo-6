import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import './Recomendaciones.css'

const NIVELES = ['Todos', 'ALTO', 'MEDIO', 'BAJO']
const TIPOS   = ['Todos', 'Comercial', 'Residencia']

const NIVEL_CLASE = {
  ALTO:  'nivel-alto',
  MEDIO: 'nivel-medio',
  BAJO:  'nivel-bajo',
}

const BADGE_CLASE = {
  ALTO:  'badge badge-alto',
  MEDIO: 'badge badge-medio',
  BAJO:  'badge badge-bajo',
}

const TIPO_ICONO = {
  Comercial:  '🏪',
  Residencia: '🏠',
  Ambos:      '🔁',
}

// Skeletons mientras carga
function Skeletons() {
  return Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="recom-skeleton">
      <div className="skeleton-line short"  style={{ marginBottom: '12px' }} />
      <div className="skeleton-line full"   />
      <div className="skeleton-line medium" />
      <div className="skeleton-line full"   />
    </div>
  ))
}

export default function Recomendaciones() {
  const [recomendaciones, setRecomendaciones] = useState([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [filtroNivel,     setFiltroNivel]     = useState('Todos')
  const [filtroTipo,      setFiltroTipo]      = useState('Todos')

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('recomendaciones')
          .select('id, titulo, descripcion, nivel_riesgo, tipo_aplicacion')
          .eq('activa', true)
          .order('nivel_riesgo', { ascending: true })
          .order('titulo',       { ascending: true })

        if (err) throw err
        setRecomendaciones(data ?? [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const filtradas = recomendaciones.filter(r =>
    (filtroNivel === 'Todos' || r.nivel_riesgo     === filtroNivel) &&
    (filtroTipo  === 'Todos' || r.tipo_aplicacion  === filtroTipo || r.tipo_aplicacion === 'Ambos')
  )

  return (
    <div>
      {/* Encabezado */}
      <div className="recom-header">
        <div>
          <h1 className="recom-title">Recomendaciones Preventivas</h1>
          <p className="recom-subtitle">
            {loading ? 'Cargando...' : `${filtradas.length} recomendación${filtradas.length !== 1 ? 'es' : ''} disponible${filtradas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '16px' }}>❌ {error}</div>
      )}

      {/* Filtros */}
      <div className="recom-filtros">
        <span className="recom-filtros-label">Nivel</span>
        {NIVELES.map(n => (
          <button
            key={n}
            className={`filter-chip ${filtroNivel === n ? 'active' : ''}`}
            onClick={() => setFiltroNivel(n)}
          >
            {n}
          </button>
        ))}

        <div className="recom-filtros-divider" />

        <span className="recom-filtros-label">Tipo</span>
        {TIPOS.map(t => (
          <button
            key={t}
            className={`filter-chip ${filtroTipo === t ? 'active' : ''}`}
            onClick={() => setFiltroTipo(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Grid de tarjetas */}
      <div className="recom-grid">
        {loading ? (
          <Skeletons />
        ) : filtradas.length === 0 ? (
          <div className="recom-empty">
            🔍 No hay recomendaciones para los filtros seleccionados.
          </div>
        ) : (
          filtradas.map(r => (
            <div
              key={r.id}
              className={`recom-card ${NIVEL_CLASE[r.nivel_riesgo] ?? ''}`}
            >
              <div className="recom-card-header">
                <span className="recom-card-titulo">{r.titulo}</span>
                <span className={BADGE_CLASE[r.nivel_riesgo]}>{r.nivel_riesgo}</span>
              </div>

              <div className="recom-card-body">
                <p className="recom-card-desc">{r.descripcion}</p>
              </div>

              <div className="recom-card-footer">
                <span>{TIPO_ICONO[r.tipo_aplicacion] ?? '📌'}</span>
                <span>Aplica a: <strong>{r.tipo_aplicacion}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}