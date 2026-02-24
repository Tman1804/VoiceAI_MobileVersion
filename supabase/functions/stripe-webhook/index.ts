// VoxWarp Stripe Webhook Edge Function
// Deploy: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// Pro plan configuration
const PRO_TOKENS_LIMIT = 50000
const TRIAL_TOKENS_LIMIT = 5000

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('Missing stripe-signature header')
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      throw new Error('Invalid signature')
    }

    console.log('Received Stripe event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(supabase, stripe, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handleCheckoutComplete(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  console.log('Checkout completed:', session.id)

  if (session.mode !== 'subscription') return

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Get the subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata.supabase_user_id

  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  // Update subscription record
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan: 'pro',
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, {
      onConflict: 'user_id',
    })

  // Update user_usage to pro
  await supabase
    .from('user_usage')
    .upsert({
      user_id: userId,
      plan: 'pro',
      tokens_limit: PRO_TOKENS_LIMIT,
      tokens_used: 0, // Reset tokens on upgrade
    }, {
      onConflict: 'user_id',
    })

  console.log(`User ${userId} upgraded to Pro`)
}

async function handleSubscriptionUpdate(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log('Subscription updated:', subscription.id)

  const userId = subscription.metadata.supabase_user_id
  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  const status = subscription.status === 'active' ? 'active' : 
                 subscription.status === 'past_due' ? 'past_due' :
                 subscription.status === 'canceled' ? 'canceled' : 'incomplete'

  // Update subscription record
  await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id)

  // If subscription is no longer active, downgrade user
  if (status !== 'active') {
    await supabase
      .from('user_usage')
      .update({
        plan: 'trial',
        tokens_limit: TRIAL_TOKENS_LIMIT,
      })
      .eq('user_id', userId)
  }
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log('Subscription deleted:', subscription.id)

  const userId = subscription.metadata.supabase_user_id
  if (!userId) {
    // Try to find user by subscription ID
    const { data: subRecord } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()
    
    if (!subRecord) {
      console.error('Could not find user for deleted subscription')
      return
    }
  }

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      plan: 'trial',
    })
    .eq('stripe_subscription_id', subscription.id)

  // Downgrade user to trial
  if (userId) {
    await supabase
      .from('user_usage')
      .update({
        plan: 'trial',
        tokens_limit: TRIAL_TOKENS_LIMIT,
      })
      .eq('user_id', userId)

    console.log(`User ${userId} downgraded to Trial`)
  }
}

async function handleInvoicePaid(
  supabase: any,
  invoice: Stripe.Invoice
) {
  console.log('Invoice paid:', invoice.id)

  if (!invoice.subscription) return

  // Get subscription to find user
  const { data: subRecord } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single()

  if (!subRecord) return

  // Reset tokens on successful payment (monthly renewal)
  await supabase
    .from('user_usage')
    .update({
      tokens_used: 0,
    })
    .eq('user_id', subRecord.user_id)

  console.log(`Tokens reset for user ${subRecord.user_id}`)
}

async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  console.log('Payment failed:', invoice.id)

  if (!invoice.subscription) return

  // Update subscription status to past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', invoice.subscription)
}
