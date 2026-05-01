// supabase/functions/send-push/index.ts
// Sends a Web Push notification to all subscribed devices in a family
// (or optionally a specific user)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Web Push requires VAPID keys. Generate once with:
//   npx web-push generate-vapid-keys
// Then set as Supabase secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain.com)

async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: object) {
  const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@kinfamily.app'

  // Import web-push compatible implementation for Deno
  const { default: webpush } = await import('https://esm.sh/web-push@3.6.7')

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload),
    { TTL: 60 * 60 } // 1 hour TTL
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      family_id,
      user_id,       // optional: target specific user
      title,
      body,
      tag,
      data,
      actions,
    } = await req.json()

    if (!family_id || !title) throw new Error('family_id and title are required')

    // Fetch subscriptions
    let query = supabase.from('push_subscriptions').select('*').eq('family_id', family_id)
    if (user_id) query = query.eq('user_id', user_id)

    const { data: subs, error } = await query
    if (error) throw error
    if (!subs?.length) return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

    const payload = { title, body, tag: tag || 'flock', data: data || {}, actions: actions || [] }

    // Send to all subscriptions, remove dead ones
    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await sendWebPush(sub, payload)
          // Update last_used_at
          await supabase.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', sub.id)
        } catch (err: any) {
          // 410 Gone = subscription expired/revoked, clean it up
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
          throw err
        }
      })
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
