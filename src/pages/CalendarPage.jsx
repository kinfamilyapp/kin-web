import { useState, useCallback, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, addWeeks, subWeeks, addDays, subDays, isToday } from 'date-fns'
import { useApp } from '../context/AppContext'
import { useIsMobile } from '../hooks/useIsMobile'

function ChevronLeft() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function ChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4l-.75 7.5a1 1 0 01-1 .9H4.75a1 1 0 01-1-.9L3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
}
function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3.5v2.75l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
}
function LocationIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 11s4-3.5 4-6a4 4 0 10-8 0c0 2.5 4 6 4 6z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
}

function EventDot({ color }) {
  return <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function EventPill({ event, member, onClick }) {
  return (
    <div onClick={() => onClick(event)} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 6px', borderRadius: 4,
      background: member ? member.bg : '#F4F3F1',
      color: member ? member.color : 'var(--text-2)',
      fontSize: 11, fontWeight: 500, cursor: 'pointer',
      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      marginBottom: 2, maxWidth: '100%',
    }}>
      <EventDot color={member ? member.color : 'var(--text-3)'} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
    </div>
  )
}

function DayCell({ date, isCurrentMonth, events, onSelectDate, onEventClick, getMember }) {
  const today = isToday(date)
  const hasEvents = events.length > 0

  return (
    <div onClick={() => onSelectDate(date)} style={{
      minHeight: 90, padding: '6px 8px',
      background: today ? 'rgba(29,158,117,0.04)' : 'transparent',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer', transition: 'background 0.1s',
      opacity: isCurrentMonth ? 1 : 0.4,
    }}
    onMouseEnter={e => { if (!today) e.currentTarget.style.background = 'var(--surface-2)' }}
    onMouseLeave={e => { if (!today) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: '50%', fontSize: 13,
        background: today ? 'var(--green)' : 'transparent',
        color: today ? '#fff' : 'var(--text)',
        fontWeight: today ? 500 : 400, marginBottom: 4,
      }}>
        {format(date, 'd')}
      </div>
      <div>
        {events.slice(0, 3).map(ev => (
          <EventPill key={ev.id} event={ev} member={ev.memberId ? getMember(ev.memberId) : null} onClick={onEventClick} />
        ))}
        {events.length > 3 && (
          <div style={{ fontSize: 10, color: 'var(--text-3)', paddingLeft: 4 }}>+{events.length - 3} more</div>
        )}
      </div>
    </div>
  )
}

function EventDetail({ event, member, onClose, onDelete }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: member ? member.color : 'var(--text-3)', flexShrink: 0, marginTop: 3 }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 500 }}>{event.title}</div>
              {member && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{member.name}</div>}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18, lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '1rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
            <ClockIcon />
            {format(new Date(event.date + 'T' + event.time), 'EEEE, MMMM d')} at {event.time} · {event.duration} min
          </div>
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
              <LocationIcon />
              {event.location}
            </div>
          )}
          {event.notes && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', paddingLeft: 20 }}>{event.notes}</div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { onDelete(event.id); onClose() }} style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)' }}>
            <TrashIcon /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function AddEventModal({ onClose, onAdd, members, defaultDate }) {
  const [form, setForm] = useState({
    title: '', date: format(defaultDate || new Date(), 'yyyy-MM-dd'),
    time: '09:00', duration: 60, memberId: '', location: '', notes: '', countdown: false
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.title.trim()) return
    onAdd(form)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>New event</div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18, lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        <div className="form-group">
          <label>Event title</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What's happening?" autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Duration (min)</label>
            <select value={form.duration} onChange={e => set('duration', Number(e.target.value))}>
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
            </select>
          </div>
          <div className="form-group">
            <label>Family member</label>
            <select value={form.memberId} onChange={e => set('memberId', e.target.value)}>
              <option value="">Everyone</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Location</label>
          <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Optional" />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." rows={2} style={{ resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }} onClick={() => set('countdown', !form.countdown)}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${form.countdown ? 'var(--green)' : 'var(--border-strong)'}`, background: form.countdown ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {form.countdown && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Show countdown on Dashboard</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Displays a countdown timer on the wall display</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Add event</button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { currentDate, setCurrentDate, selectedDate, setSelectedDate, view, setView, members, getEventsForDate, getMemberById, addEvent, deleteEvent, openModal } = useApp()
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const handler = () => setShowAddModal(true)
    window.addEventListener('kin-add-event', handler)
    return () => window.removeEventListener('kin-add-event', handler)
  }, [])

  // Month view grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const navigate = (dir) => {
    if (view === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    else if (view === 'week') setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
    else setCurrentDate(dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1))
  }

  const todayEvents = getEventsForDate(selectedDate).sort((a, b) => a.time.localeCompare(b.time))
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>
      {/* Calendar main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-icon" onClick={() => navigate(-1)}><ChevronLeft /></button>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, minWidth: 200 }}>
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d')}`}
              {view === 'day' && format(currentDate, 'EEEE, MMMM d')}
            </div>
            <button className="btn-icon" onClick={() => navigate(1)}><ChevronRight /></button>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()) }}>Today</button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 3, gap: 2 }}>
              {['month', 'week', 'day'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 13,
                  background: view === v ? 'var(--surface)' : 'transparent',
                  color: view === v ? 'var(--text)' : 'var(--text-2)',
                  fontWeight: view === v ? 500 : 400,
                  border: view === v ? '1px solid var(--border)' : '1px solid transparent',
                  boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
                }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" data-add-event="true" onClick={() => setShowAddModal(true)}>
              <PlusIcon /> Add event
            </button>
          </div>
        </div>

        {/* Month grid */}
        {view === 'month' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '0 1rem 1rem' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: '8px 0 4px' }}>
              {DAYS.map(d => (
                <div key={d} style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textAlign: 'center', padding: '4px 0', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1 }}>
              {allDays.map(day => (
                <DayCell
                  key={day.toISOString()}
                  date={day}
                  isCurrentMonth={isSameMonth(day, currentDate)}
                  events={getEventsForDate(day)}
                  onSelectDate={setSelectedDate}
                  onEventClick={setSelectedEvent}
                  getMember={getMemberById}
                />
              ))}
            </div>
          </div>
        )}

        {/* Week view */}
        {view === 'week' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
            {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map(day => {
              const dayEvents = getEventsForDate(day)
              return (
                <div key={day.toISOString()} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 60, textAlign: 'right', paddingTop: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{format(day, 'EEE')}</div>
                    <div style={{
                      fontSize: 20, fontWeight: 300,
                      color: isToday(day) ? 'var(--green)' : 'var(--text)',
                    }}>{format(day, 'd')}</div>
                  </div>
                  <div style={{ flex: 1, minHeight: 50, background: isToday(day) ? 'rgba(29,158,117,0.03)' : 'transparent', borderRadius: 'var(--radius-sm)', padding: dayEvents.length ? 8 : 0 }}>
                    {dayEvents.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 4px' }}>No events</div>}
                    {dayEvents.map(ev => {
                      const m = ev.memberId ? getMemberById(ev.memberId) : null
                      return (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                          background: m ? m.bg : 'var(--surface-2)',
                          marginBottom: 4, cursor: 'pointer',
                          borderLeft: `3px solid ${m ? m.color : 'var(--text-3)'}`,
                        }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: m ? m.color : 'var(--text)' }}>{ev.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{ev.time}{ev.location ? ` · ${ev.location}` : ''}</div>
                          </div>
                          {m && <div style={{ marginLeft: 'auto', fontSize: 11, color: m.color, fontWeight: 500 }}>{m.name}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Day view */}
        {view === 'day' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
            {getEventsForDate(currentDate).length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 15 }}>No events today</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>Add event</button>
              </div>
            )}
            {getEventsForDate(currentDate).map(ev => {
              const m = ev.memberId ? getMemberById(ev.memberId) : null
              return (
                <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                  display: 'flex', gap: 16, marginBottom: 12, cursor: 'pointer',
                  padding: '1rem', borderRadius: 'var(--radius-md)',
                  background: m ? m.bg : 'var(--surface)', border: '1px solid var(--border)',
                  borderLeft: `4px solid ${m ? m.color : 'var(--border-strong)'}`,
                }}>
                  <div style={{ textAlign: 'right', minWidth: 50 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.time}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ev.duration}m</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{ev.title}</div>
                    {ev.location && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>📍 {ev.location}</div>}
                    {ev.notes && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{ev.notes}</div>}
                    {m && <div style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 500, color: m.color, background: m.bg, padding: '2px 8px', borderRadius: 99 }}>{m.name}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!isMobile && <div style={{ width: 280, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 2 }}>{format(selectedDate, 'EEEE')}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{format(selectedDate, 'MMMM d')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          {todayEvents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
              <div style={{ fontSize: 13 }}>Nothing scheduled</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddModal(true)}>Add event</button>
            </div>
          )}
          {todayEvents.map(ev => {
            const m = ev.memberId ? getMemberById(ev.memberId) : null
            return (
              <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                marginBottom: 8, cursor: 'pointer',
                borderLeft: `3px solid ${m ? m.color : 'var(--border-strong)'}`,
                background: m ? m.bg : 'var(--surface-2)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: m ? m.color : 'var(--text)' }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClockIcon />{ev.time}
                  {m && <> · <span style={{ fontWeight: 500 }}>{m.name}</span></>}
                </div>
                {ev.location && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><LocationIcon />{ev.location}</div>}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAddModal(true)}>
            <PlusIcon /> Add event
          </button>
        </div>
      </div>}

      {/* Modals */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          member={selectedEvent.memberId ? getMemberById(selectedEvent.memberId) : null}
          onClose={() => setSelectedEvent(null)}
          onDelete={deleteEvent}
        />
      )}
      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onAdd={addEvent}
          members={members}
          defaultDate={selectedDate}
        />
      )}
    </div>
  )
}
