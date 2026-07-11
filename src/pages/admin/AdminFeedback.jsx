import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminFeedback() {
  const [comentarios, setComentarios] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('interacciones')
        .select('*')
        .eq('tipo', 'comentario')
        .order('created_at', { ascending: false })
      if (err) throw err
      setComentarios(data ?? [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function eliminarComentario(id) {
    if (!confirm('¿Eliminar este comentario de forma permanente?')) return
    try {
      const { error: err } = await supabase
        .from('interacciones')
        .delete()
        .eq('id', id)
      if (err) throw err
      await cargar()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1a2b4a', margin: 0 }}>
          ⭐ Moderación de Feedback y Comentarios
        </h1>
        <p style={{ fontSize: '11px', color: '#8a9bbf', marginTop: '3px' }}>
          Monitorea y elimina comentarios ofensivos o fuera de lugar introducidos en los reportes
        </p>
      </div>

      {error && <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#dc2626' }}>❌ {error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8a9bbf' }}>⏳ Recuperando interacciones...</div>
      ) : comentarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b0bcd4', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e6ed' }}>No hay comentarios registrados en la plataforma.</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e6ed', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Comentario', 'Fecha Registro', 'Acción'].map(h => (
                  <th key={h} style={{ background: '#f4f7fc', color: '#5a6e8a', padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid #e2e6ed' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comentarios.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0f2f7' }}>
                  <td style={{ padding: '12px 14px', color: '#1a2b4a', fontSize: '12.5px', maxWith: '500px' }}>
                    "{c.contenido}"
                  </td>
                  <td style={{ padding: '12px 14px', color: '#8a9bbf', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleString('es-CO')}
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => eliminarComentario(c.id)} style={{
                      background: '#fff5f5', border: 'none', color: '#dc2626',
                      padding: '5px 10px', borderRadius: '6px', fontSize: '11px',
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}