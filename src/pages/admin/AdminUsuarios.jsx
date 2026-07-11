import { useEffect, useState } from 'react'
import { getAdmins, crearAdmin, editarAdmin, eliminarAdmin } from '../../services/adminService'

const FORM_VACIO = { email: '', nombre: '', rol: 'admin', password: '', activo: true }

export default function AdminUsuarios({ adminLogueado }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true); setError(null)
    try { 
      const data = await getAdmins()
      setUsuarios(data ?? []) 
    } catch (e) { 
      setError(e.message) 
    } finally { 
      setLoading(false) 
    }
  }

  async function handleGuardar(e) {
    e.preventDefault()
    try {
      if (editandoId) {
        await editarAdmin(editandoId, form)
      } else {
        await crearAdmin(form)
      }
      setForm(FORM_VACIO); setEditandoId(null); setMostrarForm(false); cargar()
    } catch (err) { setError(err.message) }
  }

  async function handleEliminar(id) {
    // Validación de seguridad previniendo nulos
    if (adminLogueado && id === adminLogueado.id) { 
      alert('No puedes eliminar tu propia cuenta de administrador.'); 
      return 
    }
    if (!confirm('¿Deseas revocar el acceso y eliminar de forma permanente este usuario administrativo?')) return
    try { await eliminarAdmin(id); cargar() } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', color: '#1a2b4a', margin: 0 }}>👥 Control de Personal Técnico (Admins)</h2>
          <p style={{ fontSize: '11px', color: '#8a9bbf' }}>Solo visible para el Administrador Principal (Superadmin)</p>
        </div>
        <button onClick={() => { setForm(FORM_VACIO); setEditandoId(null); setMostrarForm(!mostrarForm) }} style={{ background: '#1a3a6b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {mostrarForm ? '✖ Cerrar' : '➕ Registrar Nuevo Admin'}
        </button>
      </div>

      {error && <div style={{ background: '#fff5f5', border: '1px solid #fecaca', padding: '10px', borderRadius: '8px', color: '#dc2626', fontSize: '12px', marginBottom: '14px' }}>❌ {error}</div>}

      {mostrarForm && (
        <form onSubmit={handleGuardar} style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e6ed', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#5a6e8a', display: 'block', marginBottom: '4px' }}>Nombre de Funcionario</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e6ed', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#5a6e8a', display: 'block', marginBottom: '4px' }}>Correo de Acceso</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e6ed', fontSize: '12px' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#5a6e8a', display: 'block', marginBottom: '4px' }}>Contraseña Corporativa</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editandoId} placeholder="••••••••" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e6ed', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#5a6e8a', display: 'block', marginBottom: '4px' }}>Rol Asignado</label>
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e6ed', fontSize: '12px' }}>
                <option value="admin">Administrador Regular</option>
                <option value="superadmin">Administrador Principal (Superadmin)</option>
              </select>
            </div>
          </div>
          <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>💾 Guardar Usuario</button>
        </form>
      )}

      {loading ? (
        <p style={{ fontSize: '12px', color: '#8a9bbf' }}>Cargando personal corporativo...</p>
      ) : usuarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#8a9bbf', background: '#fff', borderRadius: '12px', border: '1px solid #e2e6ed' }}>
          No hay usuarios administrativos registrados.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e6ed', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f4f7fc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#5a6e8a' }}>Nombre</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#5a6e8a' }}>Correo</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#5a6e8a' }}>Rol</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#5a6e8a' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f2f7' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{u.nombre}</td>
                  <td style={{ padding: '10px 14px', color: '#5a6e8a' }}>{u.email}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: u.rol === 'superadmin' ? '#dc2626' : '#1a3a6b' }}>
                      {u.rol ? u.rol.toUpperCase() : 'ADMIN'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setForm({ nombre:u.nombre, email:u.email, rol:u.rol, password:'', activo:u.activo }); setEditandoId(u.id); setMostrarForm(true) }} style={{ background: '#e8eef8', border: 'none', color: '#1a3a6b', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => handleEliminar(u.id)} style={{ background: '#fff5f5', border: 'none', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
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