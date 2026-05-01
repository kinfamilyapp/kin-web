import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseEnabled) { setLoading(false); return }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Create a family for new user
    const { data: family } = await supabase.from('families').insert({ name: `${displayName}'s Family` }).select().single()

    // Update profile
    await supabase.from('profiles').update({
      display_name: displayName,
      family_id: family.id,
      is_admin: true,
    }).eq('id', data.user.id)

    // Create first member (themselves)
    await supabase.from('members').insert({
      family_id: family.id,
      name: displayName,
      initials: displayName.slice(0, 2),
      color: '#1D9E75',
      color_bg: '#E1F5EE',
      sort_order: 0,
    })

    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const joinFamily = async (familyId) => {
    await supabase.from('profiles').update({ family_id: familyId }).eq('id', user.id)
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, joinFamily, isSupabaseEnabled }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
