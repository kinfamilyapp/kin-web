import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: DashIcon },
  { id: 'calendar', label: 'Calendar', icon: CalIcon },
  { id: 'chores', label: 'Chores', icon: ChoreIcon },
  { id: 'meals', label: 'Meal Plan', icon: MealIcon },
  { id: 'ai', label: 'AI Assistant', icon: AIIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

function DashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.1 3.1l1 1M11.9 11.9l1 1M12.9 3.1l-1 1M4.1 11.9l-1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function CalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 1v2M11 1v2M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function ChoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
function MealIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 2v5a3 3 0 006 0V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 7v7M5 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function AIIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 9.5s.75 1.5 2.5 1.5 2.5-1.5 2.5-1.5M6 6.5h.01M10 6.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function Sidebar() {
  const { page, setPage, members, openModal, isSupabaseEnabled, dbReady } = useApp()
  const auth = useAuth()
  const billing = useBilling()

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '1.25rem 0',
      height: '100vh',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, letterSpacing: -0.5 }}>
          Kin<span style={{ color: 'var(--green)' }}>.</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Family calendar</div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', letterSpacing: 0.8, textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: 6 }}>
          Menu
        </div>
        {NAV.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--green-light)' : 'transparent',
              color: active ? 'var(--green-dark)' : 'var(--text-2)',
              fontSize: 14, fontWeight: active ? 500 : 400,
              marginBottom: 2, transition: 'all 0.12s',
              border: 'none', textAlign: 'left',
            }}>
              <item.icon />
              {item.label}
              {item.id === 'ai' && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--green)', color: '#fff', padding: '1px 6px', borderRadius: 99 }}>AI</span>
              )}
              {item.id === 'dashboard' && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: '#EF9F27', color: '#fff', padding: '1px 6px', borderRadius: 99 }}>NEW</span>
              )}
            </button>
          )
        })}

        {/* Family members */}
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', letterSpacing: 0.8, textTransform: 'uppercase', padding: '0 0.5rem', marginTop: '1.25rem', marginBottom: 6 }}>
          Family
        </div>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 13, color: 'var(--text-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            {m.name}
          </div>
        ))}
        <button onClick={() => openModal('addMember')} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)',
          background: 'transparent', color: 'var(--text-3)',
          fontSize: 13, border: 'none', cursor: 'pointer', marginTop: 2,
        }}>
          <PlusIcon /> Add member
        </button>
      </nav>

      {/* Upgrade nudge for free users */}
      {billing && !billing.isPro && !billing.isTrial && isSupabaseEnabled && (
        <div style={{ margin: '0 0.75rem 0.75rem', padding: '10px 12px', background: 'var(--green-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} onClick={billing.startCheckout}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--green-dark)', marginBottom: 2 }}>Upgrade to Family ✨</div>
          <div style={{ fontSize: 11, color: 'var(--green-dark)', opacity: 0.8 }}>AI + unlimited members · $4.99/mo</div>
        </div>
      )}

      {/* Sync status */}
      {isSupabaseEnabled && (
        <div style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dbReady ? '#1D9E75' : '#EF9F27' }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{dbReady ? 'Synced' : 'Connecting...'}</span>
        </div>
      )}

      {/* User */}
      <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'var(--green-dark)' }}>
          {members[0]?.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{members[0]?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{isSupabaseEnabled ? 'Family admin' : 'Demo mode'}</div>
        </div>
        {auth?.signOut && (
          <button onClick={auth.signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, borderRadius: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
      </div>
    </aside>
  )
}
