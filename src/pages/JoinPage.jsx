import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'

export default function JoinPage({ token }) {
  const { user, signUp, signIn } = useAuth()
  const billing = useBilling()
  const [step, setStep] = useState('loading') // loading | need-account | joining | done | error
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [mode, setMode] = useState('signup')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!token) { setStep('error'); setError('Invalid invite link.'); return }
    // If already logged in, go straight to joining
    if (user) { handleAccept(); return }
    setStep('need-account')
  }, [user, token])

  const handleAccept = async () => {
    setStep('joining')
    try {
      await billing.acceptInvite(token)
      setStep('done')
    } catch (err) {
      setStep('error')
      setError(err.message)
    }
  }

  const handleAuthAndAccept = async () => {
    setError('')
    try {
      if (mode === 'signup') await signUp(form.email, form.password, form.name)
      else await signIn(form.email, form.password)
      // useEffect will trigger handleAccept when user state updates
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, letterSpacing: -1 }}>
            Kin<span style={{ color: 'var(--green)' }}>.</span>
          </div>
        </div>

        {step === 'loading' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-3)' }}>Loading your invite...</div>
          </div>
        )}

        {step === 'joining' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏡</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Joining your family...</div>
          </div>
        )}

        {step === 'done' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 8 }}>You're in!</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: '1.5rem' }}>You've joined your family on Kin.</div>
            <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Go to my calendar →</button>
          </div>
        )}

        {step === 'error' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>😕</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 8 }}>Invite problem</div>
            <div style={{ fontSize: 14, color: '#A32D2D', marginBottom: '1.5rem' }}>{error}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => window.location.href = '/'}>Go home</button>
          </div>
        )}

        {step === 'need-account' && (
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 4 }}>You've been invited!</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Create an account or sign in to join your family.</div>
            </div>

            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 3, marginBottom: '1.25rem' }}>
              {['signup', 'signin'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 13, border: 'none',
                  background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text-2)',
                  fontWeight: mode === m ? 500 : 400,
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                }}>
                  {m === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              ))}
            </div>

            {mode === 'signup' && (
              <div className="form-group">
                <label>Your name</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Grandma" autoFocus />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleAuthAndAccept()} />
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: '#FCEBEB', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#A32D2D', marginBottom: '1rem' }}>{error}</div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', padding: 11 }} onClick={handleAuthAndAccept}>
              {mode === 'signup' ? 'Create account & join family' : 'Sign in & join family'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
