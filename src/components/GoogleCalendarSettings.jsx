import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { format } from 'date-fns'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function SyncIcon({ spinning }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}>
      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

export default function GoogleCalendarSettings({ familyId }) {
  const { connection, loading, syncing, connected, connect, disconnect, syncNow, toggleSync } = useGoogleCalendar(familyId)

  if (loading) {
    return <div style={{ padding: '1rem', color: 'var(--text-3)', fontSize: 13 }}>Loading...</div>
  }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: connected ? '1rem' : 0 }}>
        {/* Google icon badge */}
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: connected ? '#E6F1FB' : 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <GoogleIcon />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Google Calendar</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {connected
              ? `Connected as ${connection.google_email}`
              : 'Import your Google Calendar events into Kin'}
          </div>
        </div>

        {connected ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={syncNow}
              disabled={syncing}
              style={{ gap: 5 }}
            >
              <SyncIcon spinning={syncing} />
              {syncing ? 'Syncing...' : 'Sync now'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={disconnect} style={{ color: '#A32D2D', borderColor: 'rgba(163,45,45,0.3)' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={connect} style={{ gap: 8, fontWeight: 500 }}>
            <GoogleIcon /> Connect
          </button>
        )}
      </div>

      {connected && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Sync toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Auto-sync enabled</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>Syncs every 15 min + instantly on changes</div>
            </div>
            <button
              onClick={() => toggleSync(!connection.sync_enabled)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: connection.sync_enabled ? 'var(--green)' : 'var(--border-strong)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: connection.sync_enabled ? 21 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          {/* Sync direction info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>Google → Kin</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--green)' }}>✓ Active</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Events appear in your calendar</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>Kin → Google</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--green)' }}>✓ Active</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>New events sync back to Google</div>
            </div>
          </div>

          {/* Last synced */}
          {connection.last_synced_at && (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Last synced: {format(new Date(connection.last_synced_at), 'MMM d, h:mm a')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
