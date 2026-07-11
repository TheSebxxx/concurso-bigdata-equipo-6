import { useState } from 'react'
import { loginAdmin } from '../../services/adminService'

export default function AdminLogin({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos corporativos.'); return }
    setLoading(true); setError(null)
    try {
      const adminData = await loginAdmin(email, password)
      onLogin(adminData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e2e6ed', borderRadius: '16px', padding: '40px', width: '380px', boxShadow: '0 8px 32px rgba(26,58,107,.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a2b4a', margin: 0 }}>SEPH Colombia</h2>
          <p style={{ fontSize: '12px', color: '#8a9bbf', marginTop: '4px' }}>Panel de Control de Seguridad y Big Data</p>
        </div>

        {error && <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#dc2626' }}>❌ {error}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', color: '#5a6e8a', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Correo Electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@seph.gov.co" style={{ width: '100%', background: '#f4f7fc', border: '1px solid #e2e6ed', color: '#1a2b4a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing:'border-box' }} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', color: '#5a6e8a', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', background: '#f4f7fc', border: '1px solid #e2e6ed', color: '#1a2b4a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing:'border-box' }} />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', background: '#1a3a6b', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
          {loading ? '⏳ Autenticando...' : 'Ingresar al Panel Seguro'}
        </button>
      </form>
    </div>
  )
}