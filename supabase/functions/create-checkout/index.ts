// supabase/functions/create-checkout/index.ts
// Deployed as a Supabase Edge Function
// Creates a Stripe Checkout session for the Family plan

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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
    // Auth: verify the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) throw new Error('Unauthorized')

    // Get user's profile + family
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id, display_name, email')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) throw new Error('No family found')

    // Get or create Stripe customer
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .single()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email,
        name: profile.display_name || undefined,
        metadata: { family_id: profile.family_id, user_id: user.id },
      })
      customerId = customer.id

      await supabase.from('subscriptions').upsert({
        family_id: profile.family_id,
        stripe_customer_id: customerId,
      }, { onConflict: 'family_id' })
    }

    const { returnUrl } = await req.json()

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: Deno.env.get('STRIPE_PRICE_ID'), // your $4.99/mo price ID
        quantity: 1,
      }],
      success_url: `${returnUrl}?checkout=success`,
      cancel_url: `${returnUrl}?checkout=canceled`,
      metadata: { family_id: profile.family_id },
      subscription_data: {
        metadata: { family_id: profile.family_id },
        trial_period_days: 14, // 14-day free trial
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
