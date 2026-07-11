import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminReportes() {
  const [reportes, setReportes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('reportes_ciudadanos')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setReportes(data ?? [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function toggleModeracion(rep) {
    const accion = rep.activo ? 'ocultar' : 'restaurar'
    if (!confirm(`¿Estás seguro de que deseas ${accion} este reporte ciudadano?`)) return
    
    try {
      const { error: err } = await supabase
        .from('reportes_ciudadanos')
        .update({ activo: !rep.activo })
        .eq('id', rep.id)
        
      if (err) throw err
      
      // Optimización reactiva: cambia el estado en memoria de inmediato
      setReportes(prev => 
        prev.map(item => item.id === rep.id ? { ...item, activo: !rep.activo } : item)
      )
    } catch (e) { 
      alert(`Error de seguridad RLS: ${e.message}`) 
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1a2b4a', margin: 0 }}>
          📢 Moderación de Reportes Ciudadanos
        </h1>
        <p style={{ fontSize: '11px', color: '#8a9bbf', marginTop: '3px' }}>
          Revisa y gestiona la visibilidad de los reportes publicados por la comunidad
        </p>
      </div>

      {error && <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#dc2626' }}>❌ {error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8a9bbf' }}>⏳ Obteniendo feed ciudadano...</div>
      ) : reportes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b0bcd4', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e6ed' }}>No se han enviado reportes ciudadanos todavía.</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e6ed', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Autor', 'Contenido', 'Ubicación', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ background: '#f4f7fc', color: '#5a6e8a', padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid #e2e6ed' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportes.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0f2f7', opacity: r.activo ? 1 : 0.5 }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1a2b4a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {r.autor_avatar && <img src={r.autor_avatar} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />}
                      <span>{r.autor_nombre}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8a9bbf', marginTop: '2px' }}>𝕏 User</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#5a6e8a', maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, color: '#1a2b4a', marginBottom: '2px' }}>{r.titulo}</div>
                    <div style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.descripcion}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#1a2b4a' }}>{r.municipio}, {r.departamento || 'ST'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: r.activo ? '#dcfce7' : '#fee2e2', color: r.activo ? '#16a34a' : '#dc2626' }}>
                      {r.activo ? 'Visible' : 'Oculto'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggleModeracion(r)} style={{
                      background: r.activo ? '#fff5f5' : '#e8eef8', border: 'none',
                      color: r.activo ? '#dc2626' : '#1a3a6b', padding: '5px 10px',
                      borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                      {r.activo ? '🚫 Ocultar' : '👁️ Mostrar'}
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