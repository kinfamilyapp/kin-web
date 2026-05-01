// supabase/functions/google-oauth-callback/index.ts
// Handles the OAuth redirect from Google, exchanges code for tokens,
// stores them, and redirects back to the app.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const APP_URL              = Deno.env.get('APP_URL') || 'http://localhost:5173'
const REDIRECT_URI         = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`

serve(async (req) => {
  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state') // contains user_id|family_id
  const error = url.searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${APP_URL}/settings?google=error&reason=${error || 'missing_code'}`)
  }

  const [userId, familyId] = state.split('|')

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token received')

    // Get user's Google email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const googleUser = await userRes.json()

    // Store tokens
    await supabase.from('google_connections').upsert({
      user_id: userId,
      family_id: familyId,
      google_email: googleUser.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      sync_enabled: true,
    }, { onConflict: 'user_id' })

    // Kick off initial sync
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/google-sync-pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ user_id: userId, family_id: familyId, full_sync: true }),
    })

    return Response.redirect(`${APP_URL}/settings?google=connected`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return Response.redirect(`${APP_URL}/settings?google=error&reason=${encodeURIComponent(err.message)}`)
  }
})
