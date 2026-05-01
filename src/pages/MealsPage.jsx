import { useState } from 'react'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isThisWeek } from 'date-fns'
import { useApp } from '../context/AppContext'

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }

function EditMealModal({ date, slot, value, onClose, onSave }) {
  const [text, setText] = useState(value || '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: '1rem' }}>
          {MEAL_EMOJI[slot]} {slot.charAt(0).toUpperCase() + slot.slice(1)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1rem' }}>{format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d')}</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`What's for ${slot}?`}
          rows={3}
          style={{ resize: 'none', marginBottom: '1rem' }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { onSave(text); onClose() }}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function MealsPage() {
  const { meals, saveMeal } = useApp()
  const [editModal, setEditModal] = useState(null)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const goBack    = () => setWeekStart(w => subWeeks(w, 1))
  const goForward = () => setWeekStart(w => addWeeks(w, 1))
  const goToday   = () => setWeekStart(startOfWeek(new Date()))
  const isCurrentWeek = isThisWeek(weekStart)

  const getMeal = (date, slot) => meals[format(date, 'yyyy-MM-dd')]?.[slot] || ''

  const handleSaveMeal = (date, slot, value) => {
    const key = format(date, 'yyyy-MM-dd')
    saveMeal(key, slot, value)
  }

  const groceryItems = []
  days.forEach(day => {
    MEAL_SLOTS.forEach(slot => {
      const meal = getMeal(day, slot)
      if (meal) groceryItems.push({ meal, day: format(day, 'EEE'), slot })
    })
  })

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
      {/* Header with week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 4 }}>Meal Plan</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            {format(weekStart, 'MMMM d')} — {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={goBack} style={{ padding: '6px 12px', fontSize: 18, lineHeight: 1 }}>‹</button>
          {!isCurrentWeek && (
            <button className="btn btn-ghost btn-sm" onClick={goToday} style={{ fontSize: 13 }}>This week</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={goForward} style={{ padding: '6px 12px', fontSize: 18, lineHeight: 1 }}>›</button>
        </div>
      </div>

      {/* Weekly grid */}
      <div style={{ overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: 8, minWidth: 700 }}>
          {/* Header row */}
          <div />
          {days.map(day => (
            <div key={day.toISOString()} style={{
              textAlign: 'center', padding: '8px 4px',
              background: format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'var(--green-light)' : 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{format(day, 'EEE')}</div>
              <div style={{ fontSize: 16, fontWeight: 400, color: format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'var(--green)' : 'var(--text)' }}>{format(day, 'd')}</div>
            </div>
          ))}

          {/* Meal rows */}
          {MEAL_SLOTS.map(slot => (
            <>
              <div key={slot + '-label'} style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '8px 4px', fontSize: 12, color: 'var(--text-2)', fontWeight: 500,
              }}>
                <span style={{ fontSize: 16 }}>{MEAL_EMOJI[slot]}</span>
                <span style={{ textTransform: 'capitalize', marginTop: 2 }}>{slot}</span>
              </div>
              {days.map(day => {
                const meal = getMeal(day, slot)
                return (
                  <div key={day.toISOString() + slot}
                    onClick={() => setEditModal({ date: format(day, 'yyyy-MM-dd'), slot, value: meal })}
                    style={{
                      minHeight: 70, padding: '8px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', background: 'var(--surface)',
                      cursor: 'pointer', transition: 'border-color 0.12s',
                      fontSize: 12, color: meal ? 'var(--text)' : 'var(--text-3)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {meal || <span style={{ fontStyle: 'italic' }}>+ Add</span>}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>

      {/* Quick grocery list */}
      {groceryItems.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: '1rem' }}>This week's meals at a glance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {groceryItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                <span>{MEAL_EMOJI[item.slot]}</span>
                <span style={{ fontWeight: 500, color: 'var(--text-3)', fontSize: 11 }}>{item.day}</span>
                <span>{item.meal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editModal && (
        <EditMealModal
          {...editModal}
          onClose={() => setEditModal(null)}
          onSave={(val) => handleSaveMeal(new Date(editModal.date + 'T12:00:00'), editModal.slot, val)}
        />
      )}
    </div>
  )
}
