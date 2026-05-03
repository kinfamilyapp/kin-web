import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useIsMobile } from '../hooks/useIsMobile'

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function StarIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill={filled ? '#EF9F27' : 'none'}>
      <path d="M7 1.5l1.5 3.5 3.5.5-2.5 2.5.5 3.5L7 10l-3 1.5.5-3.5L2 5.5l3.5-.5z" stroke="#EF9F27" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

function AddChoreModal({ onClose, onAdd, members }) {
  const [form, setForm] = useState({ title: '', memberId: '', frequency: 'daily', reward: 5 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>New chore</div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18, padding: '4px 8px' }}>×</button>
        </div>
        <div className="form-group">
          <label>Chore title</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Set the dinner table" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Assign to</label>
            <select value={form.memberId} onChange={e => set('memberId', e.target.value)}>
              <option value="">Anyone</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Frequency</label>
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Reward points (stars)</label>
          <select value={form.reward} onChange={e => set('reward', Number(e.target.value))}>
            <option value={5}>5 ⭐ (quick task)</option>
            <option value={10}>10 ⭐ (medium task)</option>
            <option value={15}>15 ⭐ (big task)</option>
            <option value={20}>20 ⭐ (extra credit)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (form.title.trim()) { onAdd(form); onClose() } }}>Add chore</button>
        </div>
      </div>
    </div>
  )
}

export default function ChoresPage() {
  const { chores, members, toggleChore, addChore, getMemberById } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [confetti, setConfetti] = useState(false)
  const isMobile = useIsMobile()

  const handleToggle = (id) => {
    const chore = chores.find(c => c.id === id)
    if (chore && !chore.done) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 1400)
    }
    toggleChore(id)
  }

  const filtered = chores.filter(c => {
    if (filter === 'done') return c.done
    if (filter === 'pending') return !c.done
    return true
  })

  const totalStars = chores.filter(c => c.done).reduce((sum, c) => sum + (c.reward || 0), 0)
  const pending = chores.filter(c => !c.done).length

  const memberScores = members.map(m => ({
    ...m,
    stars: chores.filter(c => c.memberId === m.id && c.done).reduce((sum, c) => sum + (c.reward || 0), 0),
    total: chores.filter(c => c.memberId === m.id).length,
    done: chores.filter(c => c.memberId === m.id && c.done).length,
  })).filter(m => m.total > 0)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
      {/* Confetti burst */}
      {confetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
          {['🎉','⭐','✨','🌟','💫','🎊','🏆','🥳'].map((emoji, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${10 + i * 11}%`,
              top: '35%',
              fontSize: i % 2 === 0 ? 32 : 24,
              animation: `choreConfetti${i} 1.2s ease-out forwards`,
            }}>{emoji}</div>
          ))}
          <style>{`
            ${[0,1,2,3,4,5,6,7].map(i => `
              @keyframes choreConfetti${i} {
                0% { transform: translateY(0) rotate(0deg) scale(0.5); opacity: 1; }
                50% { opacity: 1; transform: translateY(-80px) rotate(${(i-3)*30}deg) scale(1.2); }
                100% { transform: translateY(-160px) rotate(${(i-3)*60}deg) scale(0.8); opacity: 0; }
              }
            `).join('')}
          `}</style>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 4 }}>Chores</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{pending} tasks pending today</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <PlusIcon /> Add chore
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Total stars earned</div>
          <div style={{ fontSize: 28, fontWeight: 300 }}>⭐ {totalStars}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Completed today</div>
          <div style={{ fontSize: 28, fontWeight: 300, color: 'var(--green)' }}>{chores.filter(c => c.done).length}/{chores.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Top performer</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 6 }}>
            {memberScores.sort((a,b) => b.stars - a.stars)[0]?.name || '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Chore list */}
        <div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 3, marginBottom: '1rem', width: 'fit-content' }}>
            {['all', 'pending', 'done'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 16px', borderRadius: 6, fontSize: 13, border: 'none',
                background: filter === f ? 'var(--surface)' : 'transparent',
                color: filter === f ? 'var(--text)' : 'var(--text-2)',
                fontWeight: filter === f ? 500 : 400,
                boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(chore => {
              const member = chore.memberId ? getMemberById(chore.memberId) : null
              return (
                <div key={chore.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12, opacity: chore.done ? 0.65 : 1 }}>
                  {/* Checkbox */}
                  <button onClick={() => handleToggle(chore.id)} style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${chore.done ? 'var(--green)' : 'var(--border-strong)'}`,
                    background: chore.done ? 'var(--green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    {chore.done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l3 3 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, textDecoration: chore.done ? 'line-through' : 'none', color: chore.done ? 'var(--text-3)' : 'var(--text)' }}>
                      {chore.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{chore.frequency}</div>
                  </div>

                  {/* Member badge */}
                  {member && (
                    <div style={{ fontSize: 11, fontWeight: 500, color: member.color, background: member.bg, padding: '3px 8px', borderRadius: 99 }}>
                      {member.name}
                    </div>
                  )}

                  {/* Stars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: chore.done ? '#EF9F27' : 'var(--text-3)', fontSize: 12, fontWeight: 500 }}>
                    <StarIcon filled={chore.done} />
                    {chore.reward}
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div>All done!</div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: '1rem' }}>Leaderboard</div>
          {memberScores.sort((a,b) => b.stars - a.stars).map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 16, width: 20, textAlign: 'center' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: m.color }}>
                {m.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.done}/{m.total} done</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#EF9F27' }}>⭐ {m.stars}</div>
            </div>
          ))}
          {memberScores.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '1rem' }}>No chores assigned yet</div>
          )}
        </div>
      </div>

      {showModal && <AddChoreModal onClose={() => setShowModal(false)} onAdd={addChore} members={members} />}
    </div>
  )
}
