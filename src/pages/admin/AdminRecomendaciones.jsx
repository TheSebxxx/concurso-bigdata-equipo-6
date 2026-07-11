import { useEffect, useState } from 'react'
import {
  getRecomendacionesAdmin, crearRecomendacion,
  editarRecomendacion
} from '../../services/adminService'

const NIVELES = ['ALTO', 'MEDIO', 'BAJO']
const TIPOS   = ['Comercial', 'Residencia', 'Ambos']
const FORM_VACIO = {
  titulo: '', descripcion: '', nivel_riesgo: 'ALTO',
  tipo_aplicacion: 'Ambos', activa: true
}
const badge = {
  ALTO:  { bg: '#fee2e2', color: '#dc2626' },
  MEDIO: { bg: '#fef9c3', color: '#ca8a04' },
  BAJO:  { bg: '#dcfce7', color: '#16a34a' },
}

export default function AdminRecomendaciones() {
  const [lista,       setLista]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [exito,       setExito]       = useState(null)
  const [form,        setForm]        = useState(FORM_VACIO)
  const [editandoId,  setEditandoId]  = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando,   setGuardando]   = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true); setError(null)
    try { setLista(await getRecomendacionesAdmin()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function abrirNuevo() {
    setForm(FORM_VACIO); setEditandoId(null)
    setMostrarForm(true); setExito(null); setError(null)
  }

  function abrirEditar(r) {
    setForm({
      titulo: r.titulo, descripcion: r.descripcion,
      nivel_riesgo: r.nivel_riesgo, tipo_aplicacion: r.tipo_aplicacion,
      activa: r.activa
    })
    setEditandoId(r.id); setMostrarForm(true); setExito(null); setError(null)
  }

  function cancelar() {
    setMostrarForm(false); setEditandoId(null); setForm(FORM_VACIO)
  }

  async function guardar() {
    if (!form.titulo.trim() || !form.descripcion.trim()) {
      setError('Título y descripción son obligatorios.'); return
    }
    setGuardando(true); setError(null)
    try {
      if (editandoId) await editarRecomendacion(editandoId, form)
      else            await crearRecomendacion(form)
      setExito(editandoId ? 'Recomendación actualizada.' : 'Recomendación creada.')
      cancelar(); await cargar()
    } catch (e) { setError(e.message) }
    finally { setGuardando(false) }
  }

  async function toggleActiva(r) {
    if (!confirm(r.activa ? '¿Desactivar esta recomendación?' : '¿Activar esta recomendación?')) return
    try {
      await editarRecomendacion(r.id, { activa: !r.activa })
      await cargar()
    } catch (e) { setError(e.message) }
  }

  const s = {
    input: {
      width:'100%', background:'#f4f7fc', border:'1px solid #e2e6ed',
      color:'#1a2b4a', padding:'9px 12px', borderRadius:'8px',
      fontSize:'12px', outline:'none', fontFamily:'inherit',
      boxSizing:'border-box', marginBottom:'10px'
    },
    label: {
      fontSize:'11px', color:'#5a6e8a', fontWeight:500,
      display:'block', marginBottom:'4px'
    },
  }

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <div>
          <h1 style={{ fontSize:'18px', fontWeight:600, color:'#1a2b4a', margin:0 }}>
            💡 Recomendaciones preventivas
          </h1>
          <p style={{ fontSize:'11px', color:'#8a9bbf', marginTop:'3px' }}>
            {lista.length} recomendaciones registradas
          </p>
        </div>
        <button onClick={abrirNuevo} style={{
          background:'#1a3a6b', border:'none', color:'#fff',
          padding:'9px 18px', borderRadius:'8px', fontSize:'12px',
          cursor:'pointer', fontFamily:'inherit', fontWeight:500
        }}>
          + Nueva recomendación
        </button>
      </div>

      {error && <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:'8px', padding:'10px 14px', marginBottom:'14px', fontSize:'12px', color:'#dc2626' }}>❌ {error}</div>}
      {exito && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 14px', marginBottom:'14px', fontSize:'12px', color:'#16a34a' }}>✅ {exito}</div>}

      {/* Formulario */}
      {mostrarForm && (
        <div style={{ background:'#fff', border:'1px solid #e2e6ed', borderRadius:'12px', padding:'20px', marginBottom:'20px', boxShadow:'0 2px 8px rgba(26,58,107,.06)' }}>
          <h3 style={{ fontSize:'14px', fontWeight:600, color:'#1a2b4a', marginBottom:'16px' }}>
            {editandoId ? '✏️ Editar recomendación' : '➕ Nueva recomendación'}
          </h3>

          <label style={s.label}>Título *</label>
          <input style={s.input} value={form.titulo} maxLength={120}
            onChange={e => setForm({...form, titulo: e.target.value})}
            placeholder="Ej: Sistemas de vigilancia" />

          <label style={s.label}>Descripción *</label>
          <textarea style={{...s.input, resize:'vertical'}} rows={3}
            value={form.descripcion}
            onChange={e => setForm({...form, descripcion: e.target.value})}
            placeholder="Descripción detallada de la medida preventiva..." />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={s.label}>Nivel de riesgo</label>
              <select style={{...s.input, marginBottom:0, cursor:'pointer'}}
                value={form.nivel_riesgo}
                onChange={e => setForm({...form, nivel_riesgo: e.target.value})}>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Tipo de aplicación</label>
              <select style={{...s.input, marginBottom:0, cursor:'pointer'}}
                value={form.tipo_aplicacion}
                onChange={e => setForm({...form, tipo_aplicacion: e.target.value})}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Estado</label>
              <select style={{...s.input, marginBottom:0, cursor:'pointer'}}
                value={form.activa ? 'true' : 'false'}
                onChange={e => setForm({...form, activa: e.target.value === 'true'})}>
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>
          </div>

          <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
            <button onClick={guardar} disabled={guardando} style={{
              background:'#1a3a6b', border:'none', color:'#fff',
              padding:'9px 20px', borderRadius:'8px', fontSize:'12px',
              cursor:'pointer', fontFamily:'inherit', fontWeight:500,
              opacity: guardando ? 0.6 : 1
            }}>
              {guardando ? '⏳ Guardando...' : editandoId ? '💾 Actualizar' : '✅ Crear'}
            </button>
            <button onClick={cancelar} style={{
              background:'transparent', border:'1px solid #e2e6ed', color:'#8a9bbf',
              padding:'9px 16px', borderRadius:'8px', fontSize:'12px',
              cursor:'pointer', fontFamily:'inherit'
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#8a9bbf' }}>⏳ Cargando...</div>
      ) : (
        <div style={{ background:'#fff', border:'1px solid #e2e6ed', borderRadius:'12px', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead>
              <tr>
                {['Título','Nivel','Tipo','Estado','Acciones'].map(h => (
                  <th key={h} style={{ background:'#f4f7fc', color:'#5a6e8a', padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'11px', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid #e2e6ed' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(r => (
                <tr key={r.id} style={{ borderBottom:'1px solid #f0f2f7', opacity: r.activa ? 1 : 0.55 }}>
                  <td style={{ padding:'10px 14px', fontWeight:500, color:'#1a2b4a', maxWidth:'260px' }}>
                    <div>{r.titulo}</div>
                    <div style={{ fontSize:'11px', color:'#8a9bbf', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.descripcion}
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:'10px', fontWeight:600, padding:'3px 9px', borderRadius:'20px', background: badge[r.nivel_riesgo]?.bg, color: badge[r.nivel_riesgo]?.color }}>
                      {r.nivel_riesgo}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', color:'#5a6e8a' }}>{r.tipo_aplicacion}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:'10px', fontWeight:600, padding:'3px 9px', borderRadius:'20px', background: r.activa ? '#dcfce7' : '#f4f7fc', color: r.activa ? '#16a34a' : '#8a9bbf' }}>
                      {r.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={() => abrirEditar(r)} style={{ background:'#e8eef8', border:'none', color:'#1a3a6b', padding:'5px 10px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontFamily:'inherit' }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => toggleActiva(r)} style={{ background: r.activa ? '#fff5f5' : '#f0fdf4', border:'none', color: r.activa ? '#dc2626' : '#16a34a', padding:'5px 10px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontFamily:'inherit' }}>
                        {r.activa ? '🚫 Desactivar' : '✅ Activar'}
                      </button>
                    </div>
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