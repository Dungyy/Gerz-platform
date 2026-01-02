import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier_name, billing_period = 'monthly' } = await request.json();

    // ✅ Validate tier name
    if (!tier_name) {
      return NextResponse.json({ error: "Tier name required" }, { status: 400 });
    }

    // ✅ Block free tier checkout
    if (tier_name.toLowerCase() === 'free') {
      return NextResponse.json({ error: "Cannot checkout free tier" }, { status: 400 });
    }

    // ✅ Validate billing period
    if (!['monthly', 'yearly'].includes(billing_period)) {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, full_name, email")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { data: organization } = await supabaseAdmin
      .from("organizations")
      .select("id, name, stripe_customer_id")
      .eq("id", profile.organization_id)
      .single();

    // ✅ Get the correct price ID based on billing period
    const priceIdField = billing_period === 'yearly' 
      ? 'stripe_price_id_yearly' 
      : 'stripe_price_id_monthly';

    const { data: tier } = await supabaseAdmin
      .from("subscription_tiers")
      .select(`${priceIdField}, price_monthly, price_yearly`)
      .eq("name", tier_name)
      .single();

    const stripePriceId = tier?.[priceIdField];

    if (!stripePriceId) {
      return NextResponse.json({ 
        error: `${billing_period === 'yearly' ? 'Yearly' : 'Monthly'} billing not available for this tier` 
      }, { status: 400 });
    }

    let customerId = organization.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || organization.name,
        metadata: {
          organization_id: organization.id,
          organization_name: organization.name,
        },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", organization.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        organization_id: organization.id,
        tier_name: tier_name,
        billing_period: billing_period,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}