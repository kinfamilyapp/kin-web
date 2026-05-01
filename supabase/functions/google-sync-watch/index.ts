// supabase/functions/google-sync-watch/index.ts
// Two modes:
//  POST { action: 'subscribe', user_id, family_id } — sets up a Google push channel
//  POST { action: 'webhook' } + Google headers — processes an incoming webhook notification
//  POST { action: 'cron' } — poll all connected users (run every 15 min via cron)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabase, getValidToken } from '../_shared/google-api.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-resource-state',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Google sends HEAD requests to verify webhook endpoint
  if (req.method === 'HEAD') return new Response(null, { status: 200 })

  try {
    // Check if this is a Google webhook notification (has X-Goog-Channel-Id header)
    const channelId = req.headers.get('x-goog-channel-id')
    const resourceState = req.headers.get('x-goog-resource-state')

    if (channelId && resourceState === 'exists') {
      // Google is telling us something changed — find which user owns this channel
      const { data: syncState } = await supabase
        .from('google_sync_state')
        .select('user_id, calendar_id')
        .eq('channel_id', channelId)
        .single()

      if (syncState) {
        // Get family_id
        const { data: conn } = await supabase
          .from('google_connections')
          .select('family_id')
          .eq('user_id', syncState.user_id)
          .single()

        if (conn) {
          // Trigger incremental sync for this user
          await fetch(`${SUPABASE_URL}/functions/v1/google-sync-pull`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              user_id: syncState.user_id,
              family_id: conn.family_id,
              full_sync: false,
            }),
          })
        }
      }

      return new Response('ok', { status: 200 })
    }

    const body = await req.json().catch(() => ({}))
    const { action, user_id, family_id } = body

    // ── Subscribe: set up a Google push channel ─────────────────
    if (action === 'subscribe') {
      const { data: conn } = await supabase
        .from('google_connections')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (!conn) throw new Error('No Google connection')

      const calendarIds: string[] = conn.calendars_selected || ['primary']
      const token = await getValidToken(conn)

      for (const calendarId of calendarIds) {
        const newChannelId = crypto.randomUUID()
        const watchRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newChannelId,
              type: 'web_hook',
              address: `${SUPABASE_URL}/functions/v1/google-sync-watch`,
              expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }),
          }
        )

        if (watchRes.ok) {
          const watchData = await watchRes.json()
          await supabase.from('google_sync_state').upsert({
            user_id,
            calendar_id: calendarId,
            channel_id: newChannelId,
            channel_expiry: new Date(Number(watchData.expiration)).toISOString(),
          }, { onConflict: 'user_id,calendar_id' })
        }
      }

      return new Response(JSON.stringify({ subscribed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Cron: sync all connected users ───────────────────────────
    if (action === 'cron') {
      const { data: connections } = await supabase
        .from('google_connections')
        .select('user_id, family_id')
        .eq('sync_enabled', true)

      const results = await Promise.allSettled(
        (connections || []).map((c) =>
          fetch(`${SUPABASE_URL}/functions/v1/google-sync-pull`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ user_id: c.user_id, family_id: c.family_id }),
          })
        )
      )

      const synced = results.filter((r) => r.status === 'fulfilled').length
      return new Response(JSON.stringify({ synced, total: connections?.length || 0 }), {
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
