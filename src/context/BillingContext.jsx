import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import { useAuth } from './AuthContext'

const BillingContext = createContext(null)

export function BillingProvider({ children, familyId }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSub = useCallback(async () => {
    if (!isSupabaseEnabled || !familyId) { setLoading(false); return }
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('family_id', familyId)
      .single()
    setSubscription(data)
    setLoading(false)
  }, [familyId])

  useEffect(() => { fetchSub() }, [fetchSub])

  // Real-time sub updates
  useEffect(() => {
    if (!isSupabaseEnabled || !familyId) return
    const ch = supabase.channel('sub-' + familyId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'subscriptions',
        filter: `family_id=eq.${familyId}`,
      }, () => fetchSub())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [familyId, fetchSub])

  const plan = subscription?.plan ?? 'free'
  const isPro = plan === 'family' && subscription?.status !== 'canceled'
  const isTrial = subscription?.status === 'trialing'

  const startCheckout = useCallback(async () => {
    if (!isSupabaseEnabled || !user) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ returnUrl: window.location.origin }),
    })
    const { url, error } = await res.json()
    if (error) throw new Error(error)
    window.location.href = url
  }, [user])

  const sendInvite = useCallback(async (email) => {
    if (!isSupabaseEnabled || !user) throw new Error('Not connected')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, appUrl: window.location.origin }),
    })
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    return result
  }, [user])

  const acceptInvite = useCallback(async (token) => {
    if (!isSupabaseEnabled || !user) throw new Error('Not connected')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token }),
    })
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    return result
  }, [user])

  return (
    <BillingContext.Provider value={{
      subscription, plan, isPro, isTrial, loading,
      startCheckout, sendInvite, acceptInvite, refetch: fetchSub,
    }}>
      {children}
    </BillingContext.Provider>
  )
}

export const useBilling = () => useContext(BillingContext)
