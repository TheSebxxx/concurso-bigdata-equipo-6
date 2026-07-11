import { useState } from 'react'
import { logoutAdmin, esSuperAdmin } from '../../services/adminService'
import AdminUsuarios from './AdminUsuarios'
import AdminRecomendaciones from './AdminRecomendaciones'
import AdminReportes from './AdminReportes'
import AdminFeedback from './AdminFeedback'

const MODULOS = [
  { id: 'recomendaciones', label: '💡 Recomendaciones', solo: false },
  { id: 'reportes',        label: '📢 Moderar Reportes', solo: false },
  { id: 'feedback',        label: '⭐ Feedback & Com.',  solo: false },
  { id: 'usuarios',        label: '👥 Usuarios Admin',   solo: true  },
]

export default function AdminPanel({ admin, onLogout }) {
  const [modulo, setModulo] = useState('recomendaciones')
  const superAdmin = esSuperAdmin()

  const handleLogout = () => { logoutAdmin(); onLogout() }
  const modulosFiltrados = MODULOS.filter(m => !m.solo || superAdmin)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh', background: '#f4f7fc' }}>
      <aside style={{ background: '#fff', borderRight: '1px solid #e2e6ed', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ padding: '20px 14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a6b', marginBottom: '20px', letterSpacing: '.03em' }}>💼 SEPH ADMIN PANELS</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {modulosFiltrados.map(m => (
              <button key={m.id} onClick={() => setModulo(m.id)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: modulo === m.id ? '#e8eef8' : 'transparent', color: modulo === m.id ? '#1a3a6b' : '#5a6e8a', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: modulo === m.id ? 600 : 400, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {m.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ padding: '14px', borderTop: '1px solid #e2e6ed', background: '#fafbfd' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a2b4a' }}>{admin.nombre}</div>
          <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>● {admin.rol}</div>
          <button onClick={handleLogout} style={{ marginTop: '12px', width: '100%', padding: '8px', background: '#fff', border: '1px solid #dc2626', borderRadius: '6px', fontSize: '11px', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            🚪 Salir del Panel
          </button>
        </div>
      </aside>

      <main style={{ padding: '32px', overflowY: 'auto', background: '#f0f2f7' }}>
        {modulo === 'recomendaciones' && <AdminRecomendaciones />}
        {modulo === 'reportes'        && <AdminReportes />}
        {modulo === 'feedback'        && <AdminFeedback />}
        {modulo === 'usuarios'        && <AdminUsuarios adminLogueado={admin} />}
      </main>
    </div>
  )
}