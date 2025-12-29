import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log("📋 Fetching organizations list");

    // Fetch all organizations with pagination
    const {
      data: organizations,
      error,
      count,
    } = await supabaseAdmin
      .from("organizations")
      .select(
        "id, name, slug, organization_code, plan, subscription_status, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("❌ Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Found", organizations?.length || 0, "organizations");

    return NextResponse.json({
      organizations: organizations || [],
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("❌ Organizations fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, slug, plan = "free" } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const organizationSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    console.log("➕ Creating organization:", name);

    const { data: organization, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        name,
        slug: organizationSlug,
        plan,
        subscription_status: "trialing",
        trial_ends_at: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(
      "✅ Created organization:",
      organization.name,
      organization.organization_code
    );

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("❌ Organization create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create organization" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { name, phone, email, address } = body;

    // Get current user
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Extract token and verify user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Get user's profile to find organization_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has permission (owner or manager)
    if (profile.role !== "owner" && profile.role !== "manager") {
      return NextResponse.json(
        { error: "Only owners and managers can update organization" },
        { status: 403 }
      );
    }

    console.log("📝 Updating organization for user:", user.email);

    // Update organization
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: organization, error } = await supabaseAdmin
      .from("organizations")
      .update(updateData)
      .eq("id", profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error("❌ Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Updated organization:", organization.name);

    return NextResponse.json(organization);
  } catch (error) {
    console.error("❌ Organization update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: 500 }
    );
  }
}
