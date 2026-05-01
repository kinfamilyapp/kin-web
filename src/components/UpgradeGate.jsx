import { useBilling } from '../context/BillingContext'

export default function UpgradeGate({ feature, children }) {
  const billing = useBilling()

  // No billing context (demo mode) or already pro → render normally
  if (!billing || billing.isPro || billing.isTrial) return children

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '3rem 2rem', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--green-light)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: '1rem',
      }}>✨</div>

      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, marginBottom: '0.5rem' }}>
        {feature} is a Family plan feature
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 380, lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Upgrade to unlock the AI assistant, unlimited family members, smart email import, and meal planning — for just $4.99/month with a 14-day free trial.
      </p>

      <button
        className="btn btn-primary"
        onClick={billing.startCheckout}
        style={{ marginBottom: '0.75rem' }}
      >
        Start free trial →
      </button>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No credit card required for trial · Cancel anytime</div>
    </div>
  )
}
