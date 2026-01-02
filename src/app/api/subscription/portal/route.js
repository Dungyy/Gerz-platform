// =====================================================
// FILE: src/app/api/subscription/portal/route.js
// Open Stripe customer portal for billing management
// =====================================================

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
    // 1. Authenticate user
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get user's organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // 3. Check if customer exists in Stripe
    if (!organization.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe to a plan first." },
        { status: 404 }
      );
    }

    // 4. Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    });

    console.log("Portal session created for customer:", organization.stripe_customer_id);

    // 5. Return portal URL
    return NextResponse.json({
      url: session.url,
    });

  } catch (error) {
    console.error("Portal error:", error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: "Invalid customer. Please contact support." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to open billing portal" },
      { status: 500 }
    );
  }
}