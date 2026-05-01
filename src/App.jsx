import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { BillingProvider, useBilling } from './context/BillingContext'
import Sidebar from './components/Sidebar'
import CalendarPage from './pages/CalendarPage'
import ChoresPage from './pages/ChoresPage'
import MealsPage from './pages/MealsPage'
import AIPage from './pages/AIPage'
import AuthPage from './pages/AuthPage'
import SettingsPage from './pages/SettingsPage'
import JoinPage from './pages/JoinPage'
import AddMemberModal from './components/AddMemberModal'
import UpgradeGate from './components/UpgradeGate'
import { useApp } from './context/AppContext'
import './index.css'

function AppShell() {
  const { page, modal } = useApp()
  const billing = useBilling()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {page === 'calendar' && <CalendarPage />}
        {page === 'chores'   && <ChoresPage />}
        {page === 'meals'    && <MealsPage />}
        {page === 'ai'       && (
          <UpgradeGate feature="AI Assistant">
            <AIPage />
          </UpgradeGate>
        )}
        {page === 'settings' && <SettingsPage />}
      </main>
      {modal?.type === 'addMember' && <AddMemberModal />}
    </div>
  )
}

function AppWithAuth() {
  const { user, profile, loading, isSupabaseEnabled } = useAuth()

  // Check for invite token in URL
  const params = new URLSearchParams(window.location.search)
  const inviteToken = window.location.pathname === '/join' ? params.get('token') : null

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text-3)' }}>
          Kin<span style={{ color: 'var(--green)' }}>.</span>
        </div>
      </div>
    )
  }

  // Demo mode — no Supabase
  if (!isSupabaseEnabled) {
    return (
      <AppProvider familyId={null}>
        <BillingProvider familyId={null}>
          <AppShell />
        </BillingProvider>
      </AppProvider>
    )
  }

  // Handle invite acceptance flow
  if (inviteToken) {
    return (
      <AppProvider familyId={profile?.family_id ?? null}>
        <BillingProvider familyId={profile?.family_id ?? null}>
          <JoinPage token={inviteToken} />
        </BillingProvider>
      </AppProvider>
    )
  }

  // Not logged in
  if (!user) return <AuthPage />

  const familyId = profile?.family_id ?? null

  return (
    <AppProvider familyId={familyId}>
      <BillingProvider familyId={familyId}>
        <AppShell />
      </BillingProvider>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  )
}
