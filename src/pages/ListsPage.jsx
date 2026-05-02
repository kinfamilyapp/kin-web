import { useState } from 'react'
import { useApp } from '../context/AppContext'

const LIST_TYPES = [
  { id: 'grocery', label: 'Grocery',  emoji: '🛒', color: '#1D9E75', bg: '#E1F5EE' },
  { id: 'todo',    label: 'To-Do',    emoji: '✅', color: '#378ADD', bg: '#E6F1FB' },
  { id: 'packing', label: 'Packing',  emoji: '🧳', color: '#EF9F27', bg: '#FAEEDA' },
  { id: 'custom',  label: 'Custom',   emoji: '📝', color: '#9B59B6', bg: '#F5EEF8' },
]

function Confetti({ show }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {['🎉','⭐','✨','🌟','💫','🎊'].map((e, i) => (
        <span key={i} style={{
          position: 'absolute', left: `${15 + i * 13}%`, top: '40%',
          fontSize: 28, animation: `pop${i} 1.1s ease-out forwards`,
        }}>{e}</span>
      ))}
      <style>{[0,1,2,3,4,5].map(i => `
        @keyframes pop${i} {
          0%   { opacity:1; transform: translateY(0) rotate(0deg); }
          100% { opacity:0; transform: translateY(-140px) rotate(${(i-2)*45}deg); }
        }
      `).join('')}</style>
    </div>
  )
}

export default function ListsPage() {
  const { meals } = useApp()

  const [lists, setLists] = useState([
    { id: 'l1', name: 'Weekly Groceries', type: 'grocery', items: [
      { id: 'i1', text: 'Milk', done: false },
      { id: 'i2', text: 'Eggs', done: false },
      { id: 'i3', text: 'Bread', done: true },
    ]},
    { id: 'l2', name: 'Household To-Dos', type: 'todo', items: [
      { id: 'i4', text: 'Call dentist', done: false },
      { id: 'i5', text: 'Pay electricity bill', done: false },
    ]},
  ])

  const [activeId, setActiveId]     = useState('l1')
  const [newItem, setNewItem]       = useState('')
  const [confetti, setConfetti]     = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [modalName, setModalName]   = useState('')
  const [modalType, setModalType]   = useState('grocery')

  const active = lists.find(l => l.id === activeId)
  const type   = LIST_TYPES.find(t => t.id === active?.type) || LIST_TYPES[0]

  const toggleItem = (listId, itemId) => {
    setLists(prev => prev.map(l => {
      if (l.id !== listId) return l
      return { ...l, items: l.items.map(i => {
        if (i.id !== itemId) return i
        if (!i.done) { setConfetti(true); setTimeout(() => setConfetti(false), 1200) }
        return { ...i, done: !i.done }
      })}
    }))
  }

  const addItem = () => {
    if (!newItem.trim() || !activeId) return
    setLists(prev => prev.map(l =>
      l.id !== activeId ? l : { ...l, items: [...l.items, { id: 'i' + Date.now(), text: newItem.trim(), done: false }] }
    ))
    setNewItem('')
  }

  const removeItem = (listId, itemId) => {
    setLists(prev => prev.map(l =>
      l.id !== listId ? l : { ...l, items: l.items.filter(i => i.id !== itemId) }
    ))
  }

  const clearDone = () => {
    setLists(prev => prev.map(l =>
      l.id !== activeId ? l : { ...l, items: l.items.filter(i => !i.done) }
    ))
  }

  const deleteList = (id) => {
    setLists(prev => prev.filter(l => l.id !== id))
    if (activeId === id) setActiveId(lists.find(l => l.id !== id)?.id || null)
  }

  const createList = () => {
    if (!modalName.trim()) return
    const newList = { id: 'l' + Date.now(), name: modalName.trim(), type: modalType, items: [] }
    setLists(prev => [...prev, newList])
    setActiveId(newList.id)
    setModalName('')
    setModalType('grocery')
    setShowModal(false)
  }

  const fromMealPlan = () => {
    const found = []
    Object.values(meals).forEach(day =>
      Object.values(day).forEach(meal => {
        if (meal) meal.split(',').forEach(i => { const t = i.trim(); if (t) found.push(t) })
      })
    )
    if (!found.length) { alert('Add meals to your Meal Plan first!'); return }
    const existing = active?.items.map(i => i.text.toLowerCase()) || []
    const newItems = found.filter(t => !existing.includes(t.toLowerCase()))
      .map(text => ({ id: 'i' + Date.now() + Math.random(), text, done: false }))
    setLists(prev => prev.map(l =>
      l.id !== activeId ? l : { ...l, items: [...l.items, ...newItems] }
    ))
  }

  const pending   = active?.items.filter(i => !i.done) || []
  const completed = active?.items.filter(i => i.done)  || []
  const total     = active?.items.length || 0
  const doneCount = completed.length

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>
      <Confetti show={confetti} />

      {/* ── Left sidebar ─────────────────────────── */}
      <div style={{ width: 240, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>Lists</span>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            + New
          </button>
        </div>

        {/* List items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {lists.map(list => {
            const t = LIST_TYPES.find(x => x.id === list.type) || LIST_TYPES[0]
            const isActive = list.id === activeId
            return (
              <button key={list.id} onClick={() => setActiveId(list.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 8, marginBottom: 2, border: 'none', cursor: 'pointer', textAlign: 'left', background: isActive ? t.bg : 'transparent' }}>
                <span style={{ fontSize: 16 }}>{t.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? t.color : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{list.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{list.items.filter(i => !i.done).length} remaining</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main content ──────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!active ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 12 }}>
            <div style={{ fontSize: 40 }}>📝</div>
            <div style={{ fontSize: 15 }}>Create a list to get started</div>
            <button onClick={() => setShowModal(true)} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 20px', fontSize: 14, cursor: 'pointer' }}>
              + New list
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{type.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{active.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {doneCount}/{total} done
                  <div style={{ width: 60, height: 4, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: total > 0 ? `${(doneCount/total)*100}%` : '0%', height: '100%', background: type.color, borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {active.type === 'grocery' && (
                  <button onClick={fromMealPlan} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    🍽 From meal plan
                  </button>
                )}
                {doneCount > 0 && (
                  <button onClick={clearDone} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    Clear done
                  </button>
                )}
                <button onClick={() => deleteList(active.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: '4px 8px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                  ×
                </button>
              </div>
            </div>

            {/* Add item */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder={`Add to ${active.name}...`}
                style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none' }} />
              <button onClick={addItem} disabled={!newItem.trim()}
                style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: newItem.trim() ? 1 : 0.5 }}>
                Add
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {pending.length === 0 && completed.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{type.emoji}</div>
                  <div>Add your first item above</div>
                </div>
              )}

              {pending.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <button onClick={() => toggleItem(active.id, item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid var(--border-strong)`, background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{item.text}</span>
                  <button onClick={() => removeItem(active.id, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>×</button>
                </div>
              ))}

              {completed.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                    Completed ({completed.length})
                  </div>
                  {completed.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', marginBottom: 3, opacity: 0.5 }}>
                      <button onClick={() => toggleItem(active.id, item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${type.color}`, background: type.color, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--text-2)', textDecoration: 'line-through' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── New List Modal ────────────────────────── */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>New list</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-2)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>List name</label>
              <input type="text" value={modalName} onChange={e => setModalName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createList()}
                placeholder="e.g. Weekend groceries" autoFocus
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LIST_TYPES.map(t => (
                  <button key={t.id} onClick={() => setModalType(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)', background: modalType === t.id ? t.bg : 'var(--surface-2)', color: modalType === t.id ? t.color : 'var(--text-2)', border: `1px solid ${modalType === t.id ? t.color : 'transparent'}`, fontWeight: modalType === t.id ? 500 : 400 }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 999, padding: '7px 18px', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--text-2)' }}>Cancel</button>
              <button onClick={createList} disabled={!modalName.trim()} style={{ background: modalName.trim() ? '#1D9E75' : 'var(--border-strong)', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 18px', fontSize: 14, cursor: modalName.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>Create list</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
