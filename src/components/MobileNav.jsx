import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'

const TABS = [
  { id: 'dashboard', label: 'Home',     emoji: '🏠' },
  { id: 'calendar',  label: 'Calendar', emoji: '📅' },
  { id: 'chores',    label: 'Chores',   emoji: '✅' },
  { id: 'meals',     label: 'Meals',    emoji: '🍽️' },
  { id: 'lists',     label: 'Lists',    emoji: '🛒' },
]

const MORE_ITEMS = [
  { id: 'ai',       label: 'AI Assistant', emoji: '🤖' },
  { id: 'settings', label: 'Settings',     emoji: '⚙️' },
]

export default function MobileNav({ children }) {
  const { page, setPage, members, openModal, deleteMember, updateMember } = useApp()
  const { signOut } = useAuth()
  const billing = useBilling()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [page])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navigate = (id) => { setPage(id); setMenuOpen(false); setShowMore(false) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0, zIndex: 50 }}>
        <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, padding: 4 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 22, height: 2, background: 'var(--text)', borderRadius: 2 }} />)}
        </button>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>Kin<span style={{ color: 'var(--green)' }}>.</span></div>
        <button onClick={() => setPage('calendar')} style={{ background: 'var(--green)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</main>

      <div style={{ display: 'flex', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0, zIndex: 50 }}>
        {TABS.map(tab => {
          const active = page === tab.id
          return (
            <button key={tab.id} onClick={() => navigate(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px 6px', background: 'none', border: 'none', cursor: 'pointer', gap: 2 }}>
              <span style={{ fontSize: 20 }}>{tab.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? 'var(--green)' : 'var(--text-3)' }}>{tab.label}</span>
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }} />}
            </button>
          )
        })}
        <button onClick={() => setShowMore(s => !s)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px 6px', background: 'none', border: 'none', cursor: 'pointer', gap: 2 }}>
          <span style={{ fontSize: 20 }}>⋯</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>More</span>
        </button>
      </div>

      {showMore && (
        <div style={{ position: 'fixed', bottom: 70, right: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 8, zIndex: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', minWidth: 160 }} onClick={() => setShowMore(false)}>
          {MORE_ITEMS.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 14, color: 'var(--text)', textAlign: 'left' }}>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>{item.label}
            </button>
          ))}
        </div>
      )}

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, background: 'var(--surface)', zIndex: 400, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>Kin<span style={{ color: 'var(--green)' }}>.</span></div>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-2)', padding: 4 }}>x</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 0.8, textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>Menu</div>
              {[...TABS, ...MORE_ITEMS].map(item => (
                <button key={item.id} onClick={() => navigate(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 12px', background: page === item.id ? 'var(--green-light)' : 'none', border: 'none', cursor: 'pointer', borderRadius: 10, fontSize: 15, color: page === item.id ? 'var(--green-dark)' : 'var(--text)', fontWeight: page === item.id ? 600 : 400, marginBottom: 2, textAlign: 'left' }}>
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>{item.label}
                </button>
              ))}
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 0.8, textTransform: 'uppercase', padding: '4px 8px', marginTop: 16, marginBottom: 4 }}>Family</div>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8 }}>
                  <div onClick={() => { const colors = ['#1D9E75','#378ADD','#EF9F27','#D85A30','#9B59B6','#E91E63']; const bgs = ['#E1F5EE','#E6F1FB','#FAEEDA','#FAECE7','#F5EEF8','#FCE4EC']; const next = (colors.indexOf(m.color) + 1) % colors.length; updateMember(m.id, { color: colors[next], bg: bgs[next] }) }} style={{ width: 10, height: 10, borderRadius: '50%', background: m.color, flexShrink: 0, cursor: 'pointer' }} />
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text-2)' }}>{m.name}</span>
                  <button onClick={() => { if (window.confirm('Remove ' + m.name + '?')) deleteMember(m.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18, padding: '0 4px' }}>x</button>
                </div>
              ))}
              <button onClick={() => { openModal('addMember'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14, borderRadius: 8 }}>+ Add member</button>
            </div>
            {billing && !billing.isPro && !billing.isTrial && (
              <div onClick={billing.startCheckout} style={{ margin: 12, padding: '12px 14px', background: 'var(--green-light)', borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>Upgrade to Family</div>
                <div style={{ fontSize: 12, color: 'var(--green-dark)', opacity: 0.8, marginTop: 2 }}>AI + unlimited members · $4.99/mo</div>
              </div>
            )}
            <button onClick={signOut} style={{ margin: '0 12px 20px', padding: '10px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 14, color: 'var(--text-2)', textAlign: 'left' }}>Sign out</button>
          </div>
        </>
      )}
    </div>
  )
}