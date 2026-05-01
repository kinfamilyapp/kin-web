import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useGoogleCalendar(familyId) {
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [syncing, setSyncing]       = useState(false)

  const fetch_ = useCallback(async () => {
    if (!isSupabaseEnabled || !user) { setLoading(false); return }
    const { data } = await supabase
      .from('google_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setConnection(data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetch_() }, [fetch_])

  // Real-time: react when connection row changes
  useEffect(() => {
    if (!isSupabaseEnabled || !user) return
    const ch = supabase.channel('google-conn-' + user.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'google_connections',
        filter: `user_id=eq.${user.id}`,
      }, fetch_)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, fetch_])

  // Handle ?google=connected|error in URL after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('google')
    if (status) {
      // Clean the URL
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
      if (status === 'connected') fetch_()
    }
  }, [fetch_])

  const connect = useCallback(async () => {
    if (!isSupabaseEnabled || !user || !familyId) return
    const { data: { session } } = await supabase.auth.getSession()

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!GOOGLE_CLIENT_ID) {
      alert('VITE_GOOGLE_CLIENT_ID not set. See .env.example.')
      return
    }

    const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`
    const state = `${user.id}|${familyId}`

    const params = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      access_type:   'offline',
      prompt:        'consent',
      state,
    })

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }, [user, familyId])

  const disconnect = useCallback(async () => {
    if (!isSupabaseEnabled || !user) return
    await supabase.from('google_connections').delete().eq('user_id', user.id)
    setConnection(null)
  }, [user])

  const syncNow = useCallback(async () => {
    if (!isSupabaseEnabled || !user || !familyId || syncing) return
    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sync-pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: user.id, family_id: familyId, full_sync: false }),
      })
      return await res.json()
    } finally {
      setSyncing(false)
    }
  }, [user, familyId, syncing])

  const toggleSync = useCallback(async (enabled) => {
    if (!isSupabaseEnabled || !user) return
    await supabase.from('google_connections')
      .update({ sync_enabled: enabled })
      .eq('user_id', user.id)
    setConnection(prev => prev ? { ...prev, sync_enabled: enabled } : prev)
  }, [user])

  return {
    connection, loading, syncing, connected: !!connection,
    connect, disconnect, syncNow, toggleSync, refetch: fetch_,
  }
}
