// supabase/functions/google-sync-push/index.ts
// Pushes a Kin event to Google Calendar.
// Called when a user with Google connected adds/updates/deletes an event.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  supabase,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  flockEventToGoogle,
} from '../_shared/google-api.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, event, user_id, family_id } = await req.json()
    // action: 'create' | 'update' | 'delete'
    // event: Kin event object (for create/update) or { id } (for delete)

    if (!user_id || !action) throw new Error('user_id and action required')

    // Get user's Google connection
    const { data: conn } = await supabase
      .from('google_connections')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (!conn?.sync_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no connection or sync disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const calendarId = (conn.calendars_selected as string[])?.[0] || 'primary'

    if (action === 'create') {
      // Create in Google
      const gEvent = await createGoogleEvent(conn, calendarId, flockEventToGoogle(event))

      // Save the mapping
      await supabase.from('google_event_map').insert({
        flock_event_id: event.id,
        google_event_id: gEvent.id,
        calendar_id: calendarId,
        user_id,
        family_id,
        direction: 'flock_to_google',
      })

      return new Response(JSON.stringify({ google_event_id: gEvent.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      // Find the mapping
      const { data: mapping } = await supabase
        .from('google_event_map')
        .select('google_event_id, calendar_id')
        .eq('flock_event_id', event.id)
        .eq('user_id', user_id)
        .single()

      if (!mapping) {
        // Not mapped yet — create it
        const gEvent = await createGoogleEvent(conn, calendarId, flockEventToGoogle(event))
        await supabase.from('google_event_map').insert({
          flock_event_id: event.id,
          google_event_id: gEvent.id,
          calendar_id: calendarId,
          user_id, family_id,
          direction: 'flock_to_google',
        })
        return new Response(JSON.stringify({ google_event_id: gEvent.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await updateGoogleEvent(conn, mapping.calendar_id, mapping.google_event_id, flockEventToGoogle(event))
      return new Response(JSON.stringify({ updated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const { data: mapping } = await supabase
        .from('google_event_map')
        .select('google_event_id, calendar_id')
        .eq('flock_event_id', event.id)
        .eq('user_id', user_id)
        .single()

      if (mapping) {
        await deleteGoogleEvent(conn, mapping.calendar_id, mapping.google_event_id)
        await supabase.from('google_event_map')
          .delete().eq('flock_event_id', event.id).eq('user_id', user_id)
      }

      return new Response(JSON.stringify({ deleted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
