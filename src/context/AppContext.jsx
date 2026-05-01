import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

const AppContext = createContext(null)

const MEMBER_COLORS = ['#1D9E75','#378ADD','#EF9F27','#D85A30','#9B59B6','#E91E63']
const MEMBER_BG    = ['#E1F5EE','#E6F1FB','#FAEEDA','#FAECE7','#F5EEF8','#FCE4EC']

const today = new Date()
const tf = (d) => format(d, 'yyyy-MM-dd')

// ── Demo data (used when Supabase is not configured) ─────────────────────────
const DEMO_MEMBERS = [
  { id: '1', name: 'Mom',  initials: 'Mo', color: MEMBER_COLORS[0], bg: MEMBER_BG[0] },
  { id: '2', name: 'Dad',  initials: 'Da', color: MEMBER_COLORS[1], bg: MEMBER_BG[1] },
  { id: '3', name: 'Lily', initials: 'Li', color: MEMBER_COLORS[2], bg: MEMBER_BG[2] },
  { id: '4', name: 'Jake', initials: 'Ja', color: MEMBER_COLORS[3], bg: MEMBER_BG[3] },
]

const DEMO_EVENTS = [
  { id: 'e1', title: 'Soccer practice',  date: tf(today),            time: '16:00', duration: 90,  memberId: '3', location: 'Woodland Park Rec', notes: 'Bring water bottle' },
  { id: 'e2', title: 'Dentist — Jake',   date: tf(today),            time: '17:30', duration: 60,  memberId: '4', location: "Dr. Miller's",      notes: '' },
  { id: 'e3', title: 'Family dinner',    date: tf(today),            time: '19:00', duration: 60,  memberId: null, location: 'Home',             notes: 'Taco Tuesday!' },
  { id: 'e4', title: 'Piano lesson',     date: tf(addDays(today,1)), time: '15:30', duration: 60,  memberId: '3', location: 'Music Studio',      notes: '' },
  { id: 'e5', title: 'Work meeting',     date: tf(addDays(today,1)), time: '10:00', duration: 60,  memberId: '1', location: 'Zoom',              notes: 'Q2 review' },
  { id: 'e6', title: 'Basketball game',  date: tf(addDays(today,3)), time: '14:00', duration: 120, memberId: '4', location: 'Community Center',  notes: '' },
  { id: 'e7', title: 'Book club',        date: tf(addDays(today,5)), time: '19:00', duration: 120, memberId: '1', location: "Sarah's house",     notes: '' },
  { id: 'e8', title: "Lily's birthday",  date: tf(addDays(today,12)),time: '14:00', duration: 180, memberId: '3', location: 'Home',             notes: 'Pizza and cake!' },
]

const DEMO_CHORES = [
  { id: 'c1', title: 'Set the dinner table', memberId: '3', frequency: 'daily',  done: false, reward: 5  },
  { id: 'c2', title: 'Take out trash',        memberId: '4', frequency: 'weekly', done: true,  reward: 10 },
  { id: 'c3', title: 'Feed the dog',          memberId: '3', frequency: 'daily',  done: true,  reward: 5  },
  { id: 'c4', title: 'Clean bedroom',         memberId: '4', frequency: 'weekly', done: false, reward: 15 },
  { id: 'c5', title: 'Dishes after dinner',   memberId: '4', frequency: 'daily',  done: false, reward: 5  },
]

const DEMO_MEALS = {
  [tf(today)]:            { breakfast: 'Oatmeal with berries', lunch: 'Turkey sandwiches', dinner: 'Tacos',            snack: 'Apple slices' },
  [tf(addDays(today,1))]: { breakfast: 'Pancakes',             lunch: 'Leftovers',         dinner: 'Spaghetti',        snack: 'Yogurt'       },
  [tf(addDays(today,2))]: { breakfast: 'Eggs & toast',         lunch: 'Caesar salad',      dinner: 'Grilled chicken',  snack: 'Crackers'     },
}

// ── Row mappers (DB → app shape) ──────────────────────────────────────────────
const mapMember = (r) => ({
  id: r.id, name: r.name, initials: r.initials,
  color: r.color, bg: r.color_bg,
})
const mapEvent = (r) => ({
  id: r.id, title: r.title,
  date: r.date, time: r.time.slice(0,5),
  duration: r.duration_minutes,
  memberId: r.member_id ?? null,
  location: r.location ?? '', notes: r.notes ?? '',
})
const mapChore = (r, completions) => ({
  id: r.id, title: r.title, memberId: r.member_id ?? null,
  frequency: r.frequency, reward: r.reward_stars,
  done: completions.some(c => c.chore_id === r.id),
})
const mapMeal = (r) => ({
  date: r.date,
  breakfast: r.breakfast ?? '', lunch: r.lunch ?? '',
  dinner: r.dinner ?? '',       snack: r.snack ?? '',
})

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children, familyId }) {
  const [members,  setMembers]  = useState(DEMO_MEMBERS)
  const [events,   setEvents]   = useState(DEMO_EVENTS)
  const [chores,   setChores]   = useState(DEMO_CHORES)
  const [meals,    setMeals]    = useState(DEMO_MEALS)
  const [dbReady,  setDbReady]  = useState(false)

  const [currentDate,  setCurrentDate]  = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [view, setView] = useState('month')
  const [page, setPage] = useState('calendar')
  const [modal, setModal] = useState(null)

  const fid = useRef(familyId)
  useEffect(() => { fid.current = familyId }, [familyId])

  // ── Load from Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !familyId) return

    const load = async () => {
      const [
        { data: mems },
        { data: evts },
        { data: chrs },
        { data: comps },
        { data: mls },
      ] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', familyId).order('sort_order'),
        supabase.from('events').select('*').eq('family_id', familyId).order('date').order('time'),
        supabase.from('chores').select('*').eq('family_id', familyId),
        supabase.from('chore_completions').select('*').eq('family_id', familyId).eq('completed_date', tf(today)),
        supabase.from('meals').select('*').eq('family_id', familyId),
      ])

      if (mems) setMembers(mems.map(mapMember))
      if (evts) setEvents(evts.map(mapEvent))
      if (chrs && comps) setChores(chrs.map(r => mapChore(r, comps)))
      if (mls) {
        const obj = {}
        mls.forEach(r => { obj[r.date] = mapMeal(r) })
        setMeals(obj)
      }
      setDbReady(true)
    }

    load()
  }, [familyId])

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !familyId) return

    const channels = []

    const evtCh = supabase.channel('events-' + familyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, async () => {
        const { data } = await supabase.from('events').select('*').eq('family_id', familyId).order('date').order('time')
        if (data) setEvents(data.map(mapEvent))
      })
      .subscribe()
    channels.push(evtCh)

    const choreCh = supabase.channel('chores-' + familyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores', filter: `family_id=eq.${familyId}` }, async () => {
        const [{ data: chrs }, { data: comps }] = await Promise.all([
          supabase.from('chores').select('*').eq('family_id', familyId),
          supabase.from('chore_completions').select('*').eq('family_id', familyId).eq('completed_date', tf(today)),
        ])
        if (chrs && comps) setChores(chrs.map(r => mapChore(r, comps)))
      })
      .subscribe()
    channels.push(choreCh)

    const compCh = supabase.channel('completions-' + familyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_completions', filter: `family_id=eq.${familyId}` }, async () => {
        const [{ data: chrs }, { data: comps }] = await Promise.all([
          supabase.from('chores').select('*').eq('family_id', familyId),
          supabase.from('chore_completions').select('*').eq('family_id', familyId).eq('completed_date', tf(today)),
        ])
        if (chrs && comps) setChores(chrs.map(r => mapChore(r, comps)))
      })
      .subscribe()
    channels.push(compCh)

    const mealCh = supabase.channel('meals-' + familyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals', filter: `family_id=eq.${familyId}` }, async () => {
        const { data } = await supabase.from('meals').select('*').eq('family_id', familyId)
        if (data) {
          const obj = {}
          data.forEach(r => { obj[r.date] = mapMeal(r) })
          setMeals(obj)
        }
      })
      .subscribe()
    channels.push(mealCh)

    const memCh = supabase.channel('members-' + familyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `family_id=eq.${familyId}` }, async () => {
        const { data } = await supabase.from('members').select('*').eq('family_id', familyId).order('sort_order')
        if (data) setMembers(data.map(mapMember))
      })
      .subscribe()
    channels.push(memCh)

    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [familyId])

  // ── CRUD helpers ───────────────────────────────────────────────────────────
  const getEventsForDate  = useCallback((date) => {
    const ds = tf(date)
    return events.filter(e => e.date === ds).sort((a,b) => a.time.localeCompare(b.time))
  }, [events])

  const getMemberById = useCallback((id) => members.find(m => m.id === id), [members])

  // Helper: push event change to Google for any family member who has Google connected
  const pushToGoogle = useCallback(async (action, event) => {
    if (!isSupabaseEnabled || !fid.current) return
    const { data: connections } = await supabase
      .from('google_connections')
      .select('user_id, family_id')
      .eq('family_id', fid.current)
      .eq('sync_enabled', true)

    if (!connections?.length) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    for (const conn of connections) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sync-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, event, user_id: conn.user_id, family_id: conn.family_id }),
      }).catch(() => {})
    }
  }, [])

  const addEvent = useCallback(async (ev) => {
    if (isSupabaseEnabled && fid.current) {
      const { data: newEv } = await supabase.from('events').insert({
        family_id: fid.current, title: ev.title, date: ev.date,
        time: ev.time, duration_minutes: ev.duration || 60,
        member_id: ev.memberId || null, location: ev.location || null,
        notes: ev.notes || null,
      }).select().single()

      // Notify other family members
      if (newEv) {
          pushToGoogle('create', { ...ev, id: newEv.id })
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              family_id: fid.current,
              title: `📅 New event: ${ev.title}`,
              body: `${ev.date} at ${ev.time}${ev.location ? ' · ' + ev.location : ''}`,
              tag: 'new-event-' + newEv.id,
              data: { url: '/?page=calendar' },
            }),
          }).catch(() => {}) // fire and forget
        }
      }
    } else {
      setEvents(prev => [...prev, { ...ev, id: 'e' + Date.now() }])
    }
  }, [])

  const deleteEvent = useCallback(async (id) => {
    if (isSupabaseEnabled && fid.current) {
      await supabase.from('events').delete().eq('id', id)
      pushToGoogle('delete', { id })
    } else {
      setEvents(prev => prev.filter(e => e.id !== id))
    }
  }, [pushToGoogle])

  const updateEvent = useCallback(async (id, updates) => {
    if (isSupabaseEnabled && fid.current) {
      const patch = {}
      if (updates.title    !== undefined) patch.title           = updates.title
      if (updates.date     !== undefined) patch.date            = updates.date
      if (updates.time     !== undefined) patch.time            = updates.time
      if (updates.duration !== undefined) patch.duration_minutes = updates.duration
      if (updates.memberId !== undefined) patch.member_id       = updates.memberId
      if (updates.location !== undefined) patch.location        = updates.location
      if (updates.notes    !== undefined) patch.notes           = updates.notes
      await supabase.from('events').update(patch).eq('id', id)
    } else {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    }
  }, [])

  const toggleChore = useCallback(async (id) => {
    const chore = chores.find(c => c.id === id)
    if (!chore) return

    if (isSupabaseEnabled && fid.current) {
      if (chore.done) {
        await supabase.from('chore_completions').delete()
          .eq('chore_id', id).eq('completed_date', tf(today))
      } else {
        await supabase.from('chore_completions').upsert({
          chore_id: id, family_id: fid.current, completed_date: tf(today),
        })
      }
      // real-time updates state
    } else {
      setChores(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
    }
  }, [chores])

  const addChore = useCallback(async (chore) => {
    if (isSupabaseEnabled && fid.current) {
      await supabase.from('chores').insert({
        family_id: fid.current, title: chore.title,
        member_id: chore.memberId || null,
        frequency: chore.frequency || 'daily',
        reward_stars: chore.reward || 5,
      })
    } else {
      setChores(prev => [...prev, { ...chore, id: 'c' + Date.now(), done: false }])
    }
  }, [])

  const addMember = useCallback(async (member) => {
    const idx = members.length % MEMBER_COLORS.length
    const newMember = {
      name: member.name,
      initials: member.name.slice(0, 2),
      color: MEMBER_COLORS[idx],
      bg: MEMBER_BG[idx],
    }
    if (isSupabaseEnabled && fid.current) {
      await supabase.from('members').insert({
        family_id: fid.current, ...newMember,
        color_bg: newMember.bg, sort_order: members.length,
      })
    } else {
      setMembers(prev => [...prev, { ...newMember, id: 'm' + Date.now() }])
    }
  }, [members.length])

  const saveMeal = useCallback(async (dateStr, slot, value) => {
    if (isSupabaseEnabled && fid.current) {
      await supabase.from('meals').upsert({
        family_id: fid.current, date: dateStr,
        [slot]: value,
      }, { onConflict: 'family_id,date', ignoreDuplicates: false })
    } else {
      setMeals(prev => ({ ...prev, [dateStr]: { ...(prev[dateStr] || {}), [slot]: value } }))
    }
  }, [])

  const openModal  = useCallback((type, data = null) => setModal({ type, data }), [])
  const closeModal = useCallback(() => setModal(null), [])

  return (
    <AppContext.Provider value={{
      members, events, chores, meals,
      currentDate, setCurrentDate,
      selectedDate, setSelectedDate,
      view, setView, page, setPage,
      modal, openModal, closeModal,
      getEventsForDate, getMemberById,
      addEvent, deleteEvent, updateEvent,
      toggleChore, addChore,
      addMember, saveMeal, setMeals,
      dbReady, isSupabaseEnabled,
      MEMBER_COLORS, MEMBER_BG,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
