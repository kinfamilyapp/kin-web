// supabase/functions/accept-invite/index.ts
// Called after a new user signs up via an invite link.
// Adds them to the invited family.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) throw new Error('Unauthorized')

    const { token } = await req.json()
    if (!token) throw new Error('No token provided')

    // Look up the invite
    const { data: invite, error: invErr } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invErr || !invite) throw new Error('Invite not found or expired')

    // Add user to family
    await supabase.from('profiles').update({
      family_id: invite.family_id,
      is_admin: false,
    }).eq('id', user.id)

    // Mark invite as accepted
    await supabase.from('invites').update({
      accepted_at: new Date().toISOString(),
    }).eq('id', invite.id)

    return new Response(JSON.stringify({ success: true, family_id: invite.family_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
