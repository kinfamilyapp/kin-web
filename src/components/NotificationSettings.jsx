import { useState, useEffect } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePushNotifications } from '../hooks/usePushNotifications'

function BellIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2a5 5 0 00-5 5v3l-1.5 2h13L14 10V7a5 5 0 00-5-5z"
        stroke="currentColor" strokeWidth="1.4"
        fill={filled ? 'currentColor' : 'none'}
        strokeLinejoin="round" />
      <path d="M7 15a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 40, height: 22, borderRadius: 11,
      background: value ? 'var(--green)' : 'var(--border-strong)',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function PrefRow({ label, sublabel, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sublabel}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

export default function NotificationSettings({ familyId }) {
  const { user } = useAuth()
  const { permission, subscribed, loading, supported, subscribe, unsubscribe } = usePushNotifications(familyId)

  const [prefs, setPrefs] = useState({
    reminders_enabled: true,
    reminder_minutes: 30,
    chore_reminders: true,
    new_events: true,
    daily_digest: false,
    digest_time: '08:00',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isSupabaseEnabled || !user) return
    supabase.from('notification_preferences')
      .select('*').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setPrefs(p => ({ ...p, ...data })) })
  }, [user])

  const setPref = (key, val) => setPrefs(p => ({ ...p, [key]: val }))

  const savePrefs = async () => {
    if (!isSupabaseEnabled || !user) return
    setSaving(true)
    await supabase.from('notification_preferences')
      .upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!supported) {
    return (
      <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-2)' }}>
        Push notifications aren't supported in this browser. Try Chrome, Edge, or Firefox.
      </div>
    )
  }

  return (
    <div>
      {/* Enable / disable push */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: subscribed ? '1rem' : 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: subscribed ? 'var(--green-light)' : 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: subscribed ? 'var(--green)' : 'var(--text-3)',
          }}>
            <BellIcon filled={subscribed} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {subscribed ? 'Notifications on' : 'Enable notifications'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {subscribed
                ? `This device (${navigator.userAgent.includes('iPhone') ? 'iPhone' : 'this browser'}) will receive alerts`
                : 'Get reminders for events, chores, and family updates'}
            </div>
          </div>
          {subscribed ? (
            <button className="btn btn-ghost btn-sm" onClick={unsubscribe} disabled={loading}>
              {loading ? '...' : 'Turn off'}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={subscribe} disabled={loading}>
              {loading ? 'Enabling...' : permission === 'denied' ? 'Blocked in browser' : 'Enable →'}
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <div style={{ fontSize: 12, color: '#A32D2D', padding: '8px 12px', background: '#FCEBEB', borderRadius: 'var(--radius-sm)' }}>
            Notifications are blocked. Go to your browser settings → Site Settings → Notifications → allow for this site.
          </div>
        )}
      </div>

      {/* Preferences (only shown when subscribed) */}
      {subscribed && (
        <div className="card" style={{ padding: '0 1.25rem' }}>
          <PrefRow
            label="Event reminders"
            sublabel="Get notified before events start"
            value={prefs.reminders_enabled}
            onChange={(v) => setPref('reminders_enabled', v)}
          />

          {prefs.reminders_enabled && (
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Remind me</div>
              <select
                value={prefs.reminder_minutes}
                onChange={(e) => setPref('reminder_minutes', Number(e.target.value))}
                style={{ width: 'auto', padding: '6px 10px' }}
              >
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
              </select>
            </div>
          )}

          <PrefRow
            label="Chore reminders"
            sublabel="Daily reminder for pending chores"
            value={prefs.chore_reminders}
            onChange={(v) => setPref('chore_reminders', v)}
          />

          <PrefRow
            label="New family events"
            sublabel="When a family member adds an event"
            value={prefs.new_events}
            onChange={(v) => setPref('new_events', v)}
          />

          <PrefRow
            label="Daily digest"
            sublabel="Morning summary of today's schedule"
            value={prefs.daily_digest}
            onChange={(v) => setPref('daily_digest', v)}
          />

          {prefs.daily_digest && (
            <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Digest time</div>
              <input
                type="time"
                value={prefs.digest_time}
                onChange={(e) => setPref('digest_time', e.target.value)}
                style={{ width: 'auto', padding: '6px 10px' }}
              />
            </div>
          )}

          <div style={{ padding: '1rem 0' }}>
            <button className="btn btn-primary btn-sm" onClick={savePrefs} disabled={saving}>
              {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
