import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'

// ── Icons ──────────────────────────────────────────────────────
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M10 3.5l-.7 7a1 1 0 01-1 .9H4.7a1 1 0 01-1-.9L3 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
}
function ListIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4h8M6 8h8M6 12h8M2 4h.5M2 8h.5M2 12h.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
function GroceryIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h2l2 8h6l2-6H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="13" r="1" fill="currentColor"/><circle cx="12" cy="13" r="1" fill="currentColor"/></svg>
}
function PackingIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
function TodoIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8l2.5 2.5 4-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const LIST_TYPES = [
  { id: 'grocery',  label: 'Grocery',  icon: GroceryIcon,  color: '#1D9E75', bg: '#E1F5EE', emoji: '🛒' },
  { id: 'todo',     label: 'To-Do',    icon: TodoIcon,     color: '#378ADD', bg: '#E6F1FB', emoji: '✅' },
  { id: 'packing',  label: 'Packing',  icon: PackingIcon,  color: '#EF9F27', bg: '#FAEEDA', emoji: '🧳' },
  { id: 'custom',   label: 'Custom',   icon: ListIcon,     color: '#9B59B6', bg: '#F5EEF8', emoji: '📝' },
]

// Confetti burst component
function ConfettiBurst({ show }) {
  if (!show) return null
  const pieces = ['🎉','⭐','✨','🌟','💫']
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${20 + i * 15}%`,
          top: '40%',
          fontSize: 28,
          animation: `confettiFall${i} 1s ease-out forwards`,
        }}>{p}</div>
      ))}
      <style>{`
        ${pieces.map((_, i) => `
          @keyframes confettiFall${i} {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-120px) rotate(${(i-2)*45}deg); opacity: 0; }
          }
        `).join('')}
      `}</style>
    </div>
  )
}

// Generate grocery list from meal plan
function generateGroceryFromMeals(meals) {
  const items = []
  Object.values(meals).forEach(day => {
    Object.values(day).forEach(meal => {
      if (meal && meal.trim()) {
        meal.split(',').forEach(item => {
          const trimmed = item.trim()
          if (trimmed && !items.includes(trimmed)) items.push(trimmed)
        })
      }
    })
  })
  return items
}

export default function ListsPage() {
  const { meals } = useApp()

  const [lists, setLists] = useState([
    {
      id: 'l1', name: 'Weekly Groceries', type: 'grocery',
      items: [
        { id: 'i1', text: 'Milk', done: false },
        { id: 'i2', text: 'Eggs', done: false },
        { id: 'i3', text: 'Bread', done: true },
        { id: 'i4', text: 'Chicken breast', done: false },
        { id: 'i5', text: 'Apples', done: false },
      ]
    },
    {
      id: 'l2', name: 'Household To-Dos', type: 'todo',
      items: [
        { id: 'i6', text: 'Call dentist for Lily', done: false },
        { id: 'i7', text: 'Pay electricity bill', done: false },
        { id: 'i8', text: 'Oil change for the car', done: true },
      ]
    },
  ])

  const [activeListId, setActiveListId] = useState('l1')
  const [newItemText, setNewItemText] = useState('')
  const [showNewListModal, setShowNewListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListType, setNewListType] = useState('grocery')
  const [confetti, setConfetti] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  const activeList = lists.find(l => l.id === activeListId)
  const listType = LIST_TYPES.find(t => t.id === activeList?.type) || LIST_TYPES[0]

  const toggleItem = useCallback((listId, itemId) => {
    setLists(prev => prev.map(list => {
      if (list.id !== listId) return list
      const updatedItems = list.items.map(item => {
        if (item.id !== itemId) return item
        const newDone = !item.done
        if (newDone) {
          setConfetti(true)
          setTimeout(() => setConfetti(false), 1200)
        }
        return { ...item, done: newDone }
      })
      return { ...list, items: updatedItems }
    }))
  }, [])

  const addItem = useCallback(() => {
    if (!newItemText.trim() || !activeListId) return
    setLists(prev => prev.map(list => {
      if (list.id !== activeListId) return list
      return {
        ...list,
        items: [...list.items, { id: 'i' + Date.now(), text: newItemText.trim(), done: false }]
      }
    }))
    setNewItemText('')
  }, [newItemText, activeListId])

  const deleteItem = useCallback((listId, itemId) => {
    setLists(prev => prev.map(list => {
      if (list.id !== listId) return list
      return { ...list, items: list.items.filter(i => i.id !== itemId) }
    }))
  }, [])

  const clearDone = useCallback(() => {
    setLists(prev => prev.map(list => {
      if (list.id !== activeListId) return list
      return { ...list, items: list.items.filter(i => !i.done) }
    }))
  }, [activeListId])

  const createList = useCallback(() => {
    if (!newListName.trim()) return
    const newList = {
      id: 'l' + Date.now(),
      name: newListName.trim(),
      type: newListType,
      items: []
    }
    setLists(prev => [...prev, newList])
    setActiveListId(newList.id)
    setNewListName('')
    setShowNewListModal(false)
  }, [newListName, newListType])

  const deleteList = useCallback((listId) => {
    setLists(prev => prev.filter(l => l.id !== listId))
    if (activeListId === listId) {
      setActiveListId(lists.find(l => l.id !== listId)?.id || null)
    }
  }, [activeListId, lists])

  const generateFromMeals = useCallback(() => {
    const ingredients = generateGroceryFromMeals(meals)
    if (!ingredients.length) { alert('Add some meals to your meal plan first!'); return }
    const existing = activeList?.items.map(i => i.text.toLowerCase()) || []
    const newItems = ingredients
      .filter(ing => !existing.includes(ing.toLowerCase()))
      .map(text => ({ id: 'i' + Date.now() + Math.random(), text, done: false }))
    setLists(prev => prev.map(list => {
      if (list.id !== activeListId) return list
      return { ...list, items: [...list.items, ...newItems] }
    }))
    setShowGenerateModal(false)
  }, [meals, activeList, activeListId])

  const done = activeList?.items.filter(i => i.done).length || 0
  const total = activeList?.items.length || 0

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>
      <ConfettiBurst show={confetti} />

      {/* Left panel — list selector */}
      <div style={{
        width: 240, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>Lists</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewListModal(true)} style={{ borderRadius: 99, padding: '5px 10px' }}>
            <PlusIcon />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
          {lists.map(list => {
            const type = LIST_TYPES.find(t => t.id === list.type) || LIST_TYPES[0]
            const isActive = list.id === activeListId
            const doneCount = list.items.filter(i => i.done).length
            return (
              <button key={list.id} onClick={() => setActiveListId(list.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 10px', borderRadius: 'var(--radius-sm)',
                background: isActive ? type.bg : 'transparent',
                border: 'none', textAlign: 'left', cursor: 'pointer',
                marginBottom: 2, transition: 'background 0.12s',
              }}>
                <span style={{ fontSize: 16 }}>{type.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? type.color : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {list.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {list.items.length - doneCount} remaining
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel — list items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeList ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40 }}>📝</div>
            <div>Create a list to get started</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewListModal(true)}>Create list</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{listType.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{activeList.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                  {done}/{total} completed
                  {total > 0 && (
                    <span style={{ display: 'inline-block', width: 60, height: 4, background: 'var(--surface-2)', borderRadius: 99, marginLeft: 8, verticalAlign: 'middle', overflow: 'hidden' }}>
                      <span style={{ display: 'block', width: `${total > 0 ? (done/total)*100 : 0}%`, height: '100%', background: listType.color, borderRadius: 99, transition: 'width 0.3s' }} />
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeList.type === 'grocery' && (
                  <button className="btn btn-ghost btn-sm" onClick={generateFromMeals} style={{ fontSize: 12 }}>
                    🍽 From meal plan
                  </button>
                )}
                {done > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={clearDone} style={{ fontSize: 12 }}>
                    Clear done
                  </button>
                )}
                <button onClick={() => deleteList(activeList.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', padding: 6, borderRadius: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                  <TrashIcon />
                </button>
              </div>
            </div>

            {/* Add item input */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder={`Add to ${activeList.name}...`}
                style={{ flex: 1 }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={addItem} disabled={!newItemText.trim()}>
                <PlusIcon /> Add
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
              {activeList.items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{listType.emoji}</div>
                  <div>Nothing here yet — add your first item above</div>
                </div>
              )}

              {/* Pending items */}
              {activeList.items.filter(i => !i.done).map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  marginBottom: 4, background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = listType.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <button onClick={() => toggleItem(activeList.id, item.id)} style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: `2px solid var(--border-strong)`,
                    background: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = listType.color; e.currentTarget.style.background = listType.bg }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'transparent' }}>
                  </button>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{item.text}</span>
                  <button onClick={() => deleteItem(activeList.id, item.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'transparent', padding: 4, borderRadius: 4,
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                  onMouseLeave={e => e.currentTarget.style.color = 'transparent'}>
                    <TrashIcon />
                  </button>
                </div>
              ))}

              {/* Completed items */}
              {activeList.items.filter(i => i.done).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                    Completed ({activeList.items.filter(i => i.done).length})
                  </div>
                  {activeList.items.filter(i => i.done).map(item => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                      marginBottom: 3, opacity: 0.5,
                    }}>
                      <button onClick={() => toggleItem(activeList.id, item.id)} style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${listType.color}`,
                        background: listType.color,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
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

      {/* New List Modal */}
      {showNewListModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={() => setShowNewListModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>New list</div>
              <button className="btn-icon" onClick={() => setShowNewListModal(false)} style={{ fontSize: 18, padding: '4px 8px' }}>×</button>
            </div>
            <div className="form-group">
              <label>List name</label>
              <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)}
                placeholder="e.g. Weekend groceries" autoFocus
                onKeyDown={e => e.key === 'Enter' && createList()} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LIST_TYPES.map(type => (
                  <button key={type.id} onClick={() => setNewListType(type.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 999, fontSize: 13, border: 'none', cursor: 'pointer',
                    background: newListType === type.id ? type.bg : 'var(--surface-2)',
                    color: newListType === type.id ? type.color : 'var(--text-2)',
                    fontWeight: newListType === type.id ? 500 : 400,
                    border: `1px solid ${newListType === type.id ? type.color : 'transparent'}`,
                  }}>
                    {type.emoji} {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewListModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={createList} disabled={!newListName.trim()}>Create list</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
