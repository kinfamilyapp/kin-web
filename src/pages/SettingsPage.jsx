import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import NotificationSettings from '../components/NotificationSettings'
import GoogleCalendarSettings from '../components/GoogleCalendarSettings'
import { format } from 'date-fns'

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function CopyIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 9V2a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
}
function SendIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11.5 6.5L1.5 1l2 5.5-2 5.5 10-5.5z" fill="currentColor"/></svg>
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: '0.75rem' }}>{title}</div>
      {children}
    </div>
  )
}

function PlanCard({ isPro, isTrial, subscription, onUpgrade, loading }) {
  const periodEnd = subscription?.current_period_end
    ? format(new Date(subscription.current_period_end), 'MMMM d, yyyy')
    : null

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              {isPro ? 'Family Plan' : 'Free Plan'}
            </div>
            {isTrial && (
              <span style={{ fontSize: 11, background: '#FAEEDA', color: '#854F0B', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>Trial</span>
            )}
            {isPro && !isTrial && (
              <span style={{ fontSize: 11, background: 'var(--green-light)', color: 'var(--green-dark)', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>Active</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {isPro
              ? `$4.99/month${periodEnd ? ` · Renews ${periodEnd}` : ''}`
              : 'Up to 4 family members · Core features'}
          </div>
          {subscription?.cancel_at_period_end && (
            <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 4 }}>Cancels {periodEnd}</div>
          )}
        </div>
        {!isPro && (
          <button className="btn btn-primary btn-sm" onClick={onUpgrade} disabled={loading}>
            Upgrade — $4.99/mo
          </button>
        )}
      </div>

      {/* Feature comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        {[
          ['Shared family calendar', true],
          ['Chore tracker + rewards', true],
          ['Meal planner', true],
          ['Unlimited family members', isPro],
          ['AI assistant', isPro],
          ['Smart email import', isPro],
          ['Priority support', isPro],
          ['14-day free trial', true],
        ].map(([feat, included]) => (
          <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: included ? 'var(--text)' : 'var(--text-3)' }}>
            <span style={{ color: included ? 'var(--green)' : 'var(--text-3)', flexShrink: 0 }}>
              {included ? <CheckIcon /> : '–'}
            </span>
            {feat}
          </div>
        ))}
      </div>
    </div>
  )
}

function InviteSection({ sendInvite, isPro }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | { error }
  const [inviteUrl, setInviteUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleSend = async () => {
    if (!email.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const result = await sendInvite(email.trim())
      setInviteUrl(result.inviteUrl)
      setStatus('sent')
      setEmail('')
    } catch (err) {
      setStatus({ error: err.message })
    }
  }

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Invite a family member</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1rem' }}>
        They'll get an email with a link to join your family on Kin.
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="family@example.com"
          style={{ flex: 1 }}
          disabled={status === 'sending'}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSend}
          disabled={!email.trim() || status === 'sending'}
          style={{ gap: 6 }}
        >
          <SendIcon />
          {status === 'sending' ? 'Sending...' : 'Send invite'}
        </button>
      </div>

      {status === 'sent' && inviteUrl && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--green-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--green-dark)' }}>Invite sent! ✅</div>
            <div style={{ fontSize: 11, color: 'var(--green-dark)', marginTop: 2, wordBreak: 'break-all' }}>{inviteUrl}</div>
          </div>
          <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green-dark)', flexShrink: 0 }}>
            {copied ? '✓' : <CopyIcon />}
          </button>
        </div>
      )}

      {status?.error && (
        <div style={{ marginTop: '0.75rem', fontSize: 13, color: '#A32D2D', padding: '8px 12px', background: '#FCEBEB', borderRadius: 'var(--radius-sm)' }}>
          {status.error}
        </div>
      )}

      {!isPro && (
        <div style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--text-3)' }}>
          Free plan supports up to 4 members. Upgrade for unlimited.
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { members, addMember } = useApp()
  const { user, profile, signOut } = useAuth()
  const { subscription, isPro, isTrial, startCheckout, sendInvite, loading } = useBilling()
  const [upgrading, setUpgrading] = useState(false)
  const familyId = profile?.family_id

  const handleUpgrade = async () => {
    setUpgrading(true)
    try { await startCheckout() }
    catch (err) { alert('Could not start checkout: ' + err.message); setUpgrading(false) }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', maxWidth: 640 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{user?.email}</p>
      </div>

      <Section title="Plan & billing">
        <PlanCard
          isPro={isPro} isTrial={isTrial}
          subscription={subscription}
          onUpgrade={handleUpgrade}
          loading={upgrading || loading}
        />
      </Section>

      <Section title="Family members">
        <div className="card" style={{ padding: '0.5rem', marginBottom: 12 }}>
          {members.map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: m.color }}>
                {m.initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Family member</div>
              </div>
              <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: m.color }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Invite family">
        <InviteSection sendInvite={sendInvite} isPro={isPro} />
      </Section>

      <Section title="Calendar sync">
        <GoogleCalendarSettings familyId={familyId} />
      </Section>

      <Section title="Notifications">
        <NotificationSettings familyId={familyId} />
      </Section>

      <Section title="Account">
        <div className="card" style={{ padding: '0.5rem' }}>
          <button
            onClick={signOut}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: 14, color: '#A32D2D', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#FCEBEB'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3M10 11l4-3.5L10 4M14 7.5H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </div>
      </Section>
    </div>
  )
}
