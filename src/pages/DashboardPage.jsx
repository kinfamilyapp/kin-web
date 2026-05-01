import { useState, useEffect, useCallback } from 'react'
import { format, differenceInDays, parseISO, isToday, isTomorrow, addDays } from 'date-fns'
import { useApp } from '../context/AppContext'

// ── Icons ──────────────────────────────────────────────────────
function FullscreenIcon({ active }) {
  return active ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 1H1v4M11 1h4v4M1 11v4h4M15 11v4h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Weather fetcher ────────────────────────────────────────────
const WEATHER_EMOJIS = {
  0:'☀️', 1:'🌤', 2:'⛅', 3:'☁️', 45:'🌫', 48:'🌫',
  51:'🌦', 61:'🌧', 71:'❄️', 80:'🌦', 95:'⛈', 99:'⛈',
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`
  const res = await fetch(url)
  const data = await res.json()
  return {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weathercode,
    emoji: WEATHER_EMOJIS[data.current.weathercode] || '🌡',
  }
}

// ── Clock widget ───────────────────────────────────────────────
function ClockWidget({ theme }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const textColor = theme === 'dark' ? '#fff' : '#1A1A1A'
  const subColor  = theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#6B6B6B'

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 200, color: textColor, letterSpacing: -2, lineHeight: 1, fontFamily: 'system-ui' }}>
        {format(time, 'h:mm')}
        <span style={{ fontSize: '0.4em', opacity: 0.6 }}>{format(time, 'a')}</span>
      </div>
      <div style={{ fontSize: 'clamp(14px, 2vw, 20px)', color: subColor, marginTop: 4, fontWeight: 300 }}>
        {format(time, 'EEEE, MMMM d, yyyy')}
      </div>
    </div>
  )
}

// ── Weather widget ─────────────────────────────────────────────
function WeatherWidget({ theme }) {
  const [weather, setWeather] = useState(null)
  const [city, setCity]       = useState('...')
  const textColor = theme === 'dark' ? '#fff' : '#1A1A1A'
  const subColor  = theme === 'dark' ? 'rgba(255,255,255,0.55)' : '#6B6B6B'

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      const w = await fetchWeather(latitude, longitude).catch(() => null)
      if (w) setWeather(w)

      // Reverse geocode city name
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
        .then(r => r.json())
        .then(d => setCity(d.address?.city || d.address?.town || d.address?.county || ''))
        .catch(() => {})
    }, () => {
      // Fallback: Woodland Park, CO
      fetchWeather(38.9936, -105.0569).then(w => { if(w) setWeather(w); setCity('Woodland Park') }).catch(() => {})
    })
  }, [])

  if (!weather) return null

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1 }}>{weather.emoji}</div>
      <div style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 300, color: textColor, marginTop: 4 }}>
        {weather.temp}°F
      </div>
      <div style={{ fontSize: 'clamp(11px, 1.5vw, 14px)', color: subColor, marginTop: 2 }}>{city}</div>
    </div>
  )
}

// ── Countdown card ─────────────────────────────────────────────
function CountdownCard({ event, member, theme }) {
  const days = differenceInDays(parseISO(event.date), new Date())
  const textColor = theme === 'dark' ? '#fff' : '#1A1A1A'
  const subColor  = theme === 'dark' ? 'rgba(255,255,255,0.55)' : '#6B6B6B'
  const cardBg    = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)'
  const border    = theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ background: cardBg, borderRadius: 16, padding: '14px 18px', border: `1px solid ${border}`, textAlign: 'center', minWidth: 120 }}>
      <div style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 200, color: member?.color || '#1D9E75', lineHeight: 1 }}>
        {days === 0 ? '🎉' : days}
      </div>
      <div style={{ fontSize: 'clamp(9px, 1.2vw, 12px)', color: subColor, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>
        {days === 0 ? 'Today!' : days === 1 ? 'day away' : 'days away'}
      </div>
      <div style={{ fontSize: 'clamp(11px, 1.4vw, 14px)', color: textColor, fontWeight: 500, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
        {event.title}
      </div>
    </div>
  )
}

// ── Upcoming events list ───────────────────────────────────────
function UpcomingEvents({ events, getMemberById, theme }) {
  const textColor = theme === 'dark' ? '#fff' : '#1A1A1A'
  const subColor  = theme === 'dark' ? 'rgba(255,255,255,0.55)' : '#6B6B6B'
  const cardBg    = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)'
  const border    = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'

  const upcoming = events
    .filter(e => {
      const d = parseISO(e.date)
      const diff = differenceInDays(d, new Date())
      return diff >= 0 && diff <= 14
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 6)

  const dayLabel = (dateStr) => {
    const d = parseISO(dateStr)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEE, MMM d')
  }

  return (
    <div>
      <div style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', fontWeight: 600, color: subColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Upcoming
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.length === 0 && (
          <div style={{ color: subColor, fontSize: 13 }}>Nothing in the next 2 weeks</div>
        )}
        {upcoming.map(ev => {
          const m = ev.memberId ? getMemberById(ev.memberId) : null
          return (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: cardBg, borderRadius: 10, border: `1px solid ${border}`, borderLeft: `3px solid ${m?.color || '#1D9E75'}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'clamp(12px, 1.6vw, 15px)', fontWeight: 500, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 'clamp(10px, 1.2vw, 12px)', color: subColor, marginTop: 1 }}>
                  {dayLabel(ev.date)} · {ev.time}
                  {ev.location ? ` · ${ev.location}` : ''}
                </div>
              </div>
              {m && (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: m.color, flexShrink: 0 }}>
                  {m.initials}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Today's chores ─────────────────────────────────────────────
function TodayChores({ chores, getMemberById, theme }) {
  const subColor = theme === 'dark' ? 'rgba(255,255,255,0.55)' : '#6B6B6B'
  const textColor = theme === 'dark' ? '#fff' : '#1A1A1A'
  const pending = chores.filter(c => !c.done && c.frequency === 'daily')

  if (pending.length === 0) return (
    <div>
      <div style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', fontWeight: 600, color: subColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Chores</div>
      <div style={{ color: subColor, fontSize: 13 }}>✅ All done today!</div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', fontWeight: 600, color: subColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Chores · {pending.length} pending
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {pending.slice(0, 4).map(c => {
          const m = c.memberId ? getMemberById(c.memberId) : null
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'clamp(11px, 1.4vw, 14px)', color: textColor }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: m?.color || '#A0A0A0', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{c.title}</span>
              {m && <span style={{ fontSize: '0.85em', color: subColor }}>{m.name}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Meal of the day ────────────────────────────────────────────
function TodayMeals({ meals, theme }) {
  const subColor  = theme === 'dark' ? 'rgba(255,255,255,0.55)' : '#6B6B6B'
  const textColor = theme === 'dark' ? '#fff' : '#1A1A1A'
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayMeals = meals[today]

  if (!todayMeals) return null

  const SLOTS = [
    { key: 'breakfast', emoji: '🌅' },
    { key: 'lunch',     emoji: '☀️' },
    { key: 'dinner',    emoji: '🌙' },
  ]

  const hasMeals = SLOTS.some(s => todayMeals[s.key])
  if (!hasMeals) return null

  return (
    <div>
      <div style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', fontWeight: 600, color: subColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Today's Meals
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SLOTS.map(s => todayMeals[s.key] ? (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'clamp(11px, 1.4vw, 14px)', color: textColor }}>
            <span>{s.emoji}</span>
            <span>{todayMeals[s.key]}</span>
          </div>
        ) : null)}
      </div>
    </div>
  )
}

// ── Main Dashboard page ─────────────────────────────────────────
const THEMES = [
  { id: 'dark',    label: '🌙 Dark',   bg: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)' },
  { id: 'light',   label: '☀️ Light',  bg: 'linear-gradient(135deg, #f0f4f8 0%, #e8f0fe 100%)' },
  { id: 'forest',  label: '🌿 Forest', bg: 'linear-gradient(135deg, #1a2e1a 0%, #0f3d1f 50%, #1a3a2a 100%)' },
  { id: 'sunset',  label: '🌅 Sunset', bg: 'linear-gradient(135deg, #2d1b3d 0%, #4a1942 50%, #7b2d3e 100%)' },
  { id: 'ocean',   label: '🌊 Ocean',  bg: 'linear-gradient(135deg, #0a1628 0%, #0d2b4e 50%, #0a3d62 100%)' },
]

export default function DashboardPage() {
  const { events, chores, meals, members, getMemberById } = useApp()
  const [theme, setTheme]         = useState('dark')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimer, setControlsTimer] = useState(null)

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0]
  const isDark = theme !== 'light'

  // Auto-hide controls after 4 seconds of no mouse movement
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer) clearTimeout(controlsTimer)
    const t = setTimeout(() => setShowControls(false), 4000)
    setControlsTimer(t)
  }, [controlsTimer])

  useEffect(() => {
    resetControlsTimer()
    return () => { if (controlsTimer) clearTimeout(controlsTimer) }
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Countdowns: events more than 1 day away with countdown flag OR birthday-like events
  const countdowns = events
    .filter(e => {
      const days = differenceInDays(parseISO(e.date), new Date())
      return days > 0 && days <= 60 && (
        e.title.toLowerCase().includes('birthday') ||
        e.title.toLowerCase().includes('anniversary') ||
        e.title.toLowerCase().includes('vacation') ||
        e.title.toLowerCase().includes('trip') ||
        e.title.toLowerCase().includes('graduation') ||
        e.title.toLowerCase().includes('wedding') ||
        e.countdown === true
      )
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  return (
    <div
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      style={{
        flex: 1, minHeight: '100vh',
        background: currentTheme.bg,
        display: 'flex', flexDirection: 'column',
        padding: 'clamp(16px, 3vw, 40px)',
        overflow: 'auto', position: 'relative',
        transition: 'background 0.5s ease',
      }}
    >
      {/* Controls bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        opacity: showControls ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: showControls ? 'auto' : 'none',
      }}>
        <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#6B6B6B', marginRight: 8 }}>Theme:</span>
        {THEMES.map(t => (
          <button key={t.id} onClick={() => setTheme(t.id)} style={{
            padding: '4px 10px', borderRadius: 99, fontSize: 11, border: 'none', cursor: 'pointer',
            background: theme === t.id ? (isDark ? 'rgba(255,255,255,0.25)' : '#1D9E75') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            color: theme === t.id ? (isDark ? '#fff' : '#fff') : (isDark ? 'rgba(255,255,255,0.7)' : '#6B6B6B'),
            fontWeight: theme === t.id ? 600 : 400,
          }}>
            {t.label}
          </button>
        ))}
        <button onClick={toggleFullscreen} style={{
          padding: '5px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', marginLeft: 8,
          background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          color: isDark ? '#fff' : '#1A1A1A',
        }}>
          <FullscreenIcon active={isFullscreen} />
        </button>
      </div>

      {/* Top: Clock + Weather */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'clamp(40px, 6vw, 60px)', marginBottom: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap', gap: 24 }}>
        <ClockWidget theme={theme} />
        <WeatherWidget theme={theme} />
      </div>

      {/* Countdowns */}
      {countdowns.length > 0 && (
        <div style={{ marginBottom: 'clamp(20px, 3vw, 36px)' }}>
          <div style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.45)' : '#A0A0A0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Countdowns
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {countdowns.map(ev => (
              <CountdownCard key={ev.id} event={ev} member={ev.memberId ? getMemberById(ev.memberId) : null} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom grid: Upcoming + Chores + Meals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(16px, 2.5vw, 28px)' }}>
        <UpcomingEvents events={events} getMemberById={getMemberById} theme={theme} />
        <TodayChores chores={chores} getMemberById={getMemberById} theme={theme} />
        <TodayMeals meals={meals} theme={theme} />
      </div>

      {/* Family members bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'clamp(20px, 3vw, 36px)', flexWrap: 'wrap' }}>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: m.color }}>
              {m.initials}
            </div>
            <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.55)' : '#6B6B6B' }}>{m.name}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75' }} />
          <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#A0A0A0' }}>Kin Live</span>
        </div>
      </div>

      {/* Hint */}
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>
        Move mouse to show controls · Press F11 for fullscreen
      </div>
    </div>
  )
}
