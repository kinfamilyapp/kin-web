// supabase/functions/_shared/google-api.ts
// Shared helpers for Google Calendar API calls

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

// Refresh an expired access token using the refresh token
export async function refreshAccessToken(connection: any): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to refresh token')

  // Save the new access token
  await supabase.from('google_connections').update({
    access_token: data.access_token,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq('user_id', connection.user_id)

  return data.access_token
}

// Get a valid access token (refresh if needed)
export async function getValidToken(connection: any): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()

  // Refresh if expires within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return refreshAccessToken(connection)
  }

  return connection.access_token
}

// Fetch Google Calendar events with automatic token refresh
export async function fetchGoogleEvents(connection: any, calendarId: string, params: Record<string, string> = {}) {
  const token = await getValidToken(connection)
  const qs = new URLSearchParams({ ...params, maxResults: '2500' })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Google API error: ${err.error?.message || res.status}`)
  }

  return res.json()
}

// List user's calendars
export async function fetchGoogleCalendars(connection: any) {
  const token = await getValidToken(connection)
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch calendars')
  return res.json()
}

// Create an event in Google Calendar
export async function createGoogleEvent(connection: any, calendarId: string, event: object) {
  const token = await getValidToken(connection)
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  )
  if (!res.ok) throw new Error('Failed to create Google event')
  return res.json()
}

// Update an event in Google Calendar
export async function updateGoogleEvent(connection: any, calendarId: string, googleEventId: string, event: object) {
  const token = await getValidToken(connection)
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  )
  if (!res.ok) throw new Error('Failed to update Google event')
  return res.json()
}

// Delete an event from Google Calendar
export async function deleteGoogleEvent(connection: any, calendarId: string, googleEventId: string) {
  const token = await getValidToken(connection)
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
}

// Convert Google event → Kin event shape
export function googleEventToKin(gEvent: any, familyId: string, memberId: string | null) {
  const start = gEvent.start?.dateTime || gEvent.start?.date
  const end   = gEvent.end?.dateTime   || gEvent.end?.date

  if (!start) return null

  const startDate = new Date(start)
  const endDate   = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60 * 1000)
  const duration  = Math.round((endDate.getTime() - startDate.getTime()) / 60000)

  return {
    family_id:        familyId,
    title:            gEvent.summary || '(No title)',
    date:             startDate.toISOString().slice(0, 10),
    time:             startDate.toTimeString().slice(0, 5),
    duration_minutes: Math.max(1, duration),
    location:         gEvent.location || null,
    notes:            gEvent.description || null,
    member_id:        memberId,
  }
}

// Convert Kin event → Google event shape
export function flockEventToGoogle(ev: any) {
  const startDt = `${ev.date}T${ev.time}:00`
  const endMs   = new Date(`${ev.date}T${ev.time}:00`).getTime() + (ev.duration || 60) * 60000
  const endDt   = new Date(endMs).toISOString()

  return {
    summary:     ev.title,
    location:    ev.location || undefined,
    description: ev.notes || undefined,
    start: { dateTime: startDt, timeZone: 'UTC' },
    end:   { dateTime: endDt,   timeZone: 'UTC' },
  }
}

export { supabase }
