// supabase/functions/google-sync-pull/index.ts
// Pulls events from Google Calendar into Kin.
// Supports both full sync (first time) and incremental sync (delta only).
// Called: on connect, by cron every 15 min, and by webhook push.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  supabase,
  fetchGoogleCalendars,
  fetchGoogleEvents,
  googleEventToKin,
} from '../_shared/google-api.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, family_id, full_sync = false } = await req.json()
    if (!user_id || !family_id) throw new Error('user_id and family_id required')

    // Get the user's Google connection
    const { data: conn, error: connErr } = await supabase
      .from('google_connections')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (connErr || !conn) throw new Error('No Google connection found')
    if (!conn.sync_enabled) return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Determine which calendars to sync
    let calendarIds: string[] = conn.calendars_selected || []

    if (calendarIds.length === 0 || full_sync) {
      // Default: sync the primary calendar
      const calList = await fetchGoogleCalendars(conn)
      const primary = calList.items?.find((c: any) => c.primary)
      calendarIds = primary ? [primary.id] : []

      // Save selected calendars
      if (calendarIds.length > 0) {
        await supabase.from('google_connections')
          .update({ calendars_selected: calendarIds })
          .eq('user_id', user_id)
      }
    }

    let totalImported = 0
    let totalUpdated = 0

    for (const calendarId of calendarIds) {
      // Get sync state for incremental sync
      const { data: syncState } = await supabase
        .from('google_sync_state')
        .select('sync_token')
        .eq('user_id', user_id)
        .eq('calendar_id', calendarId)
        .single()

      const params: Record<string, string> = {
        singleEvents: 'true',
        orderBy: 'startTime',
      }

      if (syncState?.sync_token && !full_sync) {
        // Incremental: only get changes since last sync
        params.syncToken = syncState.sync_token
      } else {
        // Full sync: get events from 30 days ago to 1 year ahead
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        params.timeMin = timeMin
        params.timeMax = timeMax
      }

      let nextSyncToken: string | null = null

      try {
        const data = await fetchGoogleEvents(conn, calendarId, params)
        nextSyncToken = data.nextSyncToken || null
        const gEvents: any[] = data.items || []

        for (const gEvent of gEvents) {
          // Skip declined events, all-day events without a time
          if (gEvent.status === 'cancelled') {
            // Delete from Kin if it exists
            const { data: mapping } = await supabase
              .from('google_event_map')
              .select('flock_event_id')
              .eq('google_event_id', gEvent.id)
              .eq('user_id', user_id)
              .single()

            if (mapping?.flock_event_id) {
              await supabase.from('events').delete().eq('id', mapping.flock_event_id)
              await supabase.from('google_event_map').delete()
                .eq('google_event_id', gEvent.id).eq('user_id', user_id)
            }
            continue
          }

          // Skip all-day events (no time component)
          if (!gEvent.start?.dateTime) continue

          // Check if this event is already mapped
          const { data: existing } = await supabase
            .from('google_event_map')
            .select('flock_event_id')
            .eq('google_event_id', gEvent.id)
            .eq('user_id', user_id)
            .single()

          const flockEvent = googleEventToKin(gEvent, family_id, null)
          if (!flockEvent) continue

          if (existing?.flock_event_id) {
            // Update existing Kin event
            await supabase.from('events')
              .update(flockEvent)
              .eq('id', existing.flock_event_id)

            await supabase.from('google_event_map')
              .update({ last_synced_at: new Date().toISOString() })
              .eq('google_event_id', gEvent.id)
              .eq('user_id', user_id)

            totalUpdated++
          } else {
            // Insert new Kin event
            const { data: newEvent } = await supabase
              .from('events')
              .insert(flockEvent)
              .select()
              .single()

            if (newEvent) {
              await supabase.from('google_event_map').insert({
                flock_event_id: newEvent.id,
                google_event_id: gEvent.id,
                calendar_id: calendarId,
                user_id,
                family_id,
                direction: 'google_to_flock',
              })
              totalImported++
            }
          }
        }
      } catch (err: any) {
        // 410 = sync token expired, do a full sync next time
        if (err.message?.includes('410') || err.message?.includes('Gone')) {
          await supabase.from('google_sync_state')
            .delete().eq('user_id', user_id).eq('calendar_id', calendarId)
          continue
        }
        throw err
      }

      // Save new sync token for incremental sync next time
      if (nextSyncToken) {
        await supabase.from('google_sync_state').upsert({
          user_id,
          calendar_id: calendarId,
          sync_token: nextSyncToken,
        }, { onConflict: 'user_id,calendar_id' })
      }
    }

    // Update last_synced_at
    await supabase.from('google_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user_id)

    return new Response(JSON.stringify({ imported: totalImported, updated: totalUpdated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
