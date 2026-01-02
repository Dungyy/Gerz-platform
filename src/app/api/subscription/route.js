import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { data: organization } = await supabaseAdmin
      .from("organizations")
      .select(`
        id,
        name,
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_subscription_status,
        stripe_current_period_end,
        subscription_tier_id,
        tier:subscription_tiers!subscription_tier_id (
          id,
          name,
          display_name,
          description,
          price_monthly,
          max_properties,
          max_units,
          max_tenants,
          max_workers,
          max_sms_per_month,
          features
        )
      `)
      .eq("id", profile.organization_id)
      .single();

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // ✅ If no tier assigned, get the free tier
    let tier = organization.tier;
    if (!tier) {
      const { data: freeTier } = await supabaseAdmin
        .from("subscription_tiers")
        .select("*")
        .eq("name", "free")
        .single();
      
      tier = freeTier;
    }

    // Get usage counts
    const [
      { count: propertiesCount },
      { count: tenantsCount },
      { count: workersCount }
    ] = await Promise.all([
      supabaseAdmin.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", profile.organization_id),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", profile.organization_id).eq("role", "tenant"),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", profile.organization_id).in("role", ["maintenance", "manager"])
    ]);

    const { data: properties } = await supabaseAdmin.from("properties").select("id").eq("organization_id", profile.organization_id);
    const propertyIds = properties?.map(p => p.id) || [];
    
    let unitsCount = 0;
    if (propertyIds.length > 0) {
      const { count } = await supabaseAdmin.from("units").select("*", { count: "exact", head: true }).in("property_id", propertyIds);
      unitsCount = count || 0;
    }

    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { data: usage } = await supabaseAdmin
      .from("organization_usage")
      .select("sms_sent")
      .eq("organization_id", profile.organization_id)
      .eq("month", currentMonth)
      .single();

    const usageStats = {
      properties: propertiesCount || 0,
      units: unitsCount,
      tenants: tenantsCount || 0,
      workers: workersCount || 0,
      sms: usage?.sms_sent || 0,
    };

    // ✅ Handle null limits (unlimited)
    const limits = {
      properties: tier?.max_properties,
      units: tier?.max_units,
      tenants: tier?.max_tenants,
      workers: tier?.max_workers,
      sms: tier?.max_sms_per_month,
    };

    // ✅ Check if at limit (null = unlimited)
    const atLimit = {
      properties: limits.properties !== null && usageStats.properties >= limits.properties,
      units: limits.units !== null && usageStats.units >= limits.units,
      tenants: limits.tenants !== null && usageStats.tenants >= limits.tenants,
      workers: limits.workers !== null && usageStats.workers >= limits.workers,
      sms: limits.sms !== null && limits.sms > 0 && usageStats.sms >= limits.sms,
    };

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        subscription_status: organization.subscription_status,
        stripe_subscription_status: organization.stripe_subscription_status,
      },
      tier,
      usage: usageStats,
      limits,
      atLimit,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}