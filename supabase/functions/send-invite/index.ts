// supabase/functions/send-invite/index.ts
// Creates an invite record and sends email via Resend (or any email API)

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

    const { email, appUrl } = await req.json()
    if (!email) throw new Error('Email is required')

    // Get inviter's profile + family
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id, display_name')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) throw new Error('No family found')

    // Get family name
    const { data: family } = await supabase
      .from('families')
      .select('name')
      .eq('id', profile.family_id)
      .single()

    // Create invite record
    const { data: invite, error: inviteErr } = await supabase
      .from('invites')
      .insert({
        family_id: profile.family_id,
        invited_email: email.toLowerCase(),
        invited_by: user.id,
      })
      .select()
      .single()

    if (inviteErr) throw inviteErr

    const inviteUrl = `${appUrl}/join?token=${invite.token}`
    const inviterName = profile.display_name || 'Someone'
    const familyName = family?.name || 'their family'

    // Send email via Resend (https://resend.com — free tier: 100 emails/day)
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')

    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Kin <noreply@yourdomain.com>',
          to: [email],
          subject: `${inviterName} invited you to join ${familyName} on Kin`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
              <div style="font-size: 28px; font-weight: 300; margin-bottom: 1rem;">
                Kin<span style="color: #1D9E75;">.</span>
              </div>
              <h2 style="font-size: 20px; margin-bottom: 0.5rem;">You're invited!</h2>
              <p style="color: #6B6B6B; margin-bottom: 1.5rem;">
                <strong>${inviterName}</strong> invited you to join <strong>${familyName}</strong> on Kin — the shared family calendar.
              </p>
              <a href="${inviteUrl}" style="
                display: inline-block; padding: 12px 28px;
                background: #1D9E75; color: white; border-radius: 999px;
                text-decoration: none; font-size: 15px; font-weight: 500;
              ">
                Accept invite →
              </a>
              <p style="color: #A0A0A0; font-size: 12px; margin-top: 2rem;">
                This invite expires in 7 days. If you didn't expect this, you can ignore it.
              </p>
            </div>
          `,
        }),
      })
    } else {
      // Log invite link when email is not configured (dev mode)
      console.log(`[DEV] Invite link for ${email}: ${inviteUrl}`)
    }

    return new Response(JSON.stringify({ success: true, token: invite.token, inviteUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
