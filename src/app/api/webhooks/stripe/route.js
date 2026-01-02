// =====================================================
// FILE: src/app/api/webhooks/stripe/route.js
// Handle Stripe webhook events
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;

  try {
    // 1. Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log("✅ Webhook received:", event.type, event.id);

  // 2. Check if event already processed (idempotency)
  const { data: existingEvent } = await supabaseAdmin
    .from("stripe_events")
    .select("id, processed")
    .eq("id", event.id)
    .single();

  if (existingEvent) {
    console.log("⏭️ Event already processed:", event.id);
    return NextResponse.json({ received: true });
  }

  // 3. Log event
  await supabaseAdmin
    .from("stripe_events")
    .insert({
      id: event.id,
      type: event.type,
      processed: false,
      data: event.data.object,
    });

  try {
    // 4. Handle event based on type
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 5. Mark event as processed
    await supabaseAdmin
      .from("stripe_events")
      .update({ processed: true })
      .eq("id", event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook handler error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// WEBHOOK EVENT HANDLERS
// =====================================================

async function handleCheckoutCompleted(session) {
  console.log("💳 Processing checkout completion:", session.id);

  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const organizationId = session.metadata.organization_id;

  if (!organizationId) {
    console.error("No organization_id in session metadata");
    return;
  }

  try {
    // 1. Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;

    console.log("Looking for tier with price ID:", priceId);

    // 2. Find tier by price ID
    const { data: tier, error: tierError } = await supabaseAdmin
      .from("subscription_tiers")
      .select("id, name, display_name")
      .eq("stripe_price_id_monthly", priceId)
      .single();

    if (tierError || !tier) {
      console.error("❌ No tier found for price ID:", priceId);
      return;
    }

    console.log("✅ Found tier:", tier.name);

    // 3. Get current tier for history
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("subscription_tier_id")
      .eq("id", organizationId)
      .single();

    // 4. Update organization
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_subscription_status: subscription.status,
        subscription_tier_id: tier.id,
        subscription_status: "active",
        subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", organizationId);

    if (updateError) {
      console.error("❌ Error updating organization:", updateError);
      return;
    }

    // 5. Log subscription history
    await supabaseAdmin
      .from("subscription_history")
      .insert({
        organization_id: organizationId,
        action: "upgraded",
        previous_tier_id: org?.subscription_tier_id,
        new_tier_id: tier.id,
        amount: subscription.items.data[0].price.unit_amount / 100,
        metadata: {
          subscription_id: subscriptionId,
          customer_id: customerId,
          session_id: session.id,
        },
      });

    console.log(`✅ Organization ${organizationId} upgraded to ${tier.name}`);
  } catch (error) {
    console.error("❌ Error in handleCheckoutCompleted:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log("🔄 Processing subscription update:", subscription.id);

  const customerId = subscription.customer;
  const priceId = subscription.items.data[0].price.id;

  try {
    // 1. Find organization by Stripe customer ID
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, subscription_tier_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (orgError || !organization) {
      console.error("❌ No organization found for customer:", customerId);
      return;
    }

    // 2. Find tier by price ID
    const { data: tier, error: tierError } = await supabaseAdmin
      .from("subscription_tiers")
      .select("id, name")
      .eq("stripe_price_id_monthly", priceId)
      .single();

    if (tierError || !tier) {
      console.error("❌ No tier found for price ID:", priceId);
      return;
    }

    const tierChanged = tier.id !== organization.subscription_tier_id;
    const action = tierChanged ? "tier_changed" : "subscription_updated";

    // 3. Update organization
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        subscription_tier_id: tier.id,
        subscription_status: subscription.status === "active" ? "active" : "inactive",
        subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", organization.id);

    if (updateError) {
      console.error("❌ Error updating organization:", updateError);
      return;
    }

    // 4. Log history if tier changed
    if (tierChanged) {
      await supabaseAdmin
        .from("subscription_history")
        .insert({
          organization_id: organization.id,
          action,
          previous_tier_id: organization.subscription_tier_id,
          new_tier_id: tier.id,
          amount: subscription.items.data[0].price.unit_amount / 100,
          metadata: {
            subscription_id: subscription.id,
            customer_id: customerId,
          },
        });

      console.log(`✅ Organization ${organization.id} changed from tier to ${tier.name}`);
    } else {
      console.log(`✅ Subscription ${subscription.id} updated for org ${organization.id}`);
    }
  } catch (error) {
    console.error("❌ Error in handleSubscriptionUpdated:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log("🗑️ Processing subscription deletion:", subscription.id);

  const customerId = subscription.customer;

  try {
    // 1. Find organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, subscription_tier_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (orgError || !organization) {
      console.error("❌ No organization found for customer:", customerId);
      return;
    }

    // 2. Get free tier
    const { data: freeTier, error: tierError } = await supabaseAdmin
      .from("subscription_tiers")
      .select("id, name")
      .eq("name", "free")
      .single();

    if (tierError || !freeTier) {
      console.error("❌ Free tier not found");
      return;
    }

    // 3. Downgrade to free
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({
        stripe_subscription_status: "canceled",
        subscription_tier_id: freeTier.id,
        subscription_status: "canceled",
      })
      .eq("id", organization.id);

    if (updateError) {
      console.error("❌ Error updating organization:", updateError);
      return;
    }

    // 4. Log history
    await supabaseAdmin
      .from("subscription_history")
      .insert({
        organization_id: organization.id,
        action: "downgraded",
        previous_tier_id: organization.subscription_tier_id,
        new_tier_id: freeTier.id,
        metadata: {
          subscription_id: subscription.id,
          customer_id: customerId,
          reason: "subscription_canceled",
        },
      });

    console.log(`✅ Organization ${organization.id} downgraded to free tier`);
  } catch (error) {
    console.error("❌ Error in handleSubscriptionDeleted:", error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log("💰 Payment succeeded:", invoice.id);

  // You can add custom logic here, such as:
  // - Send success email
  // - Update payment records
  // - Trigger analytics events

  const customerId = invoice.customer;
  const { data: organization } = await supabaseAdmin
    .from("organizations")
    .select("id, name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (organization) {
    console.log(`✅ Payment succeeded for organization: ${organization.name}`);
    
    // Example: Log payment in subscription history
    await supabaseAdmin
      .from("subscription_history")
      .insert({
        organization_id: organization.id,
        action: "payment_succeeded",
        amount: invoice.amount_paid / 100,
        metadata: {
          invoice_id: invoice.id,
          customer_id: customerId,
        },
      });
  }
}

async function handlePaymentFailed(invoice) {
  console.log("❌ Payment failed:", invoice.id);

  // You can add custom logic here, such as:
  // - Send payment failure email
  // - Alert team
  // - Update organization status

  const customerId = invoice.customer;
  const { data: organization } = await supabaseAdmin
    .from("organizations")
    .select("id, name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (organization) {
    console.log(`⚠️ Payment failed for organization: ${organization.name}`);
    
    // Example: Log failed payment
    await supabaseAdmin
      .from("subscription_history")
      .insert({
        organization_id: organization.id,
        action: "payment_failed",
        amount: invoice.amount_due / 100,
        metadata: {
          invoice_id: invoice.id,
          customer_id: customerId,
          error: invoice.last_payment_error?.message || "Payment failed",
        },
      });
  }
}