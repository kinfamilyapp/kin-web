import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    if (!form.email || !form.password) return setError('Please fill in all fields.')
    if (mode === 'signup' && !form.name) return setError('Please enter your name.')

    setLoading(true)
    try {
      if (mode === 'signup') await signUp(form.email, form.password, form.name)
      else await signIn(form.email, form.password)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, letterSpacing: -1 }}>
            Kin<span style={{ color: 'var(--green)' }}>.</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>Your family, finally in sync.</div>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 3, marginBottom: '1.5rem' }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 14, border: 'none',
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-2)',
                fontWeight: mode === m ? 500 : 400,
                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              }}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label>Your name</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sarah" autoFocus />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" autoFocus={mode === 'signin'} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#A32D2D', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', padding: '11px' }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create my family'}
          </button>

          {mode === 'signup' && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
              By signing up you agree to our terms. We never sell your data.
            </p>
          )}
        </div>

        {/* Demo note */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 13, color: 'var(--text-3)' }}>
          No Supabase? The app runs in demo mode with local data.
        </div>
      </div>
    </div>
  )
}
