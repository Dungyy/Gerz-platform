import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// GET - Fetch all activity logs for organization
// ============================================
export async function GET(request) {
  try {
    console.log("📥 GET request for activity logs");

    // Get authorization token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Authenticated user:", user.email);

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // AUTHORIZATION CHECK - Only managers/owners can view activity logs
    if (profile.role !== "owner" && profile.role !== "manager") {
      return NextResponse.json(
        {
          error:
            "Insufficient permissions - Only managers/owners can view activity logs",
        },
        { status: 403 }
      );
    }

    console.log(
      "Authorization passed - fetching logs for org:",
      profile.organization_id
    );

    // Fetch activity logs for the organization
    const { data: logs, error: fetchError } = await supabaseAdmin
      .from("activity_logs")
      .select(
        `
        *,
        user:user_id(
          id,
          full_name,
          email,
          role
        ),
        request:request_id(
          id,
          title,
          status
        )
      `
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error("❌ Fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log("Found", logs?.length || 0, "activity logs");

    return NextResponse.json(logs || []);
  } catch (error) {
    console.error("❌ Activity logs GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create a new activity log entry
// ============================================
export async function POST(request) {
  try {
    console.log("📤 POST request to create activity log");

    // Get authorization token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, details, request_id } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 }
      );
    }

    // Create activity log
    const { data: log, error: insertError } = await supabaseAdmin
      .from("activity_logs")
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action,
        details,
        request_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    console.log("Activity log created:", log.id);

    return NextResponse.json(log);
  } catch (error) {
    console.error("❌ Activity log POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create activity log" },
      { status: 500 }
    );
  }
}