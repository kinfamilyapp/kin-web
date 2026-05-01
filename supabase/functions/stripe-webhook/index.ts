// supabase/functions/stripe-webhook/index.ts
// Handles Stripe events: subscription created, updated, deleted

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

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(`Webhook signature failed: ${err.message}`, { status: 400 })
  }

  const upsertSub = async (stripeSub: Stripe.Subscription) => {
    const familyId = stripeSub.metadata?.family_id
    if (!familyId) return

    await supabase.from('subscriptions').upsert({
      family_id: familyId,
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id: stripeSub.customer as string,
      plan: stripeSub.status === 'active' || stripeSub.status === 'trialing' ? 'family' : 'free',
      status: stripeSub.status,
      current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSub.cancel_at_period_end,
    }, { onConflict: 'family_id' })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        await upsertSub(sub)
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      await upsertSub(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const familyId = sub.metadata?.family_id
      if (familyId) {
        await supabase.from('subscriptions').upsert({
          family_id: familyId,
          plan: 'free',
          status: 'canceled',
          stripe_subscription_id: sub.id,
        }, { onConflict: 'family_id' })
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
