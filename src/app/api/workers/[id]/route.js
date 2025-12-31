import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, context) {
  try {
    // AWAIT PARAMS FOR NEXT.JS 15+
    const { id } = await context.params;

    // Get auth token from header
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

    console.log("Fetching worker:", id);

    // Check if user is manager/owner
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "manager" && profile?.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get worker details
    const { data: worker, error } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        *,
        organization:organizations(*)
      `
      )
      .eq("id", id)
      .eq("role", "worker")
      .single();

    if (error) {
      console.error("❌ Worker fetch error:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Worker not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Verify worker is in same organization
    if (worker.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("Worker found:", worker.full_name);

    return NextResponse.json(worker);
  } catch (error) {
    console.error("❌ Error fetching worker:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    // AWAIT PARAMS FOR NEXT.JS 15+
    const { id } = await context.params;

    console.log("🗑️ Attempting to delete worker:", id);

    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.error("❌ No auth token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Authenticated user:", user.email);

    // Check if user is manager/owner
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "manager" && profile?.role !== "owner") {
      console.error("❌ Insufficient permissions:", profile?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("User is", profile.role);

    // Check if worker exists and belongs to same organization
    const { data: worker, error: workerError } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id, full_name, role")
      .eq("id", id)
      .eq("role", "worker")
      .single();

    if (workerError) {
      console.error("❌ Worker lookup error:", workerError);
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    if (!worker) {
      console.error("❌ Worker not found in database");
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    console.log(
      "Found worker:",
      worker.full_name,
      "- Org:",
      worker.organization_id
    );

    if (worker.organization_id !== profile.organization_id) {
      console.error("❌ Organization mismatch");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if worker has active requests
    const { data: activeRequests } = await supabaseAdmin
      .from("maintenance_requests")
      .select("id")
      .eq("assigned_to", id)
      .in("status", ["submitted", "assigned", "in_progress"]);

    if (activeRequests && activeRequests.length > 0) {
      console.error("❌ Worker has", activeRequests.length, "active requests");
      return NextResponse.json(
        {
          error: "Cannot delete worker with active requests",
          details: `This worker has ${activeRequests.length} active request(s). Please reassign or complete them first.`,
        },
        { status: 400 }
      );
    }

    console.log("No active requests, proceeding with deletion");

    // Unassign completed/cancelled requests
    const { error: unassignError } = await supabaseAdmin
      .from("maintenance_requests")
      .update({ assigned_to: null })
      .eq("assigned_to", id);

    if (unassignError) {
      console.error("❌ Error unassigning requests:", unassignError);
    } else {
      console.log("Unassigned completed/cancelled requests");
    }

    // Delete worker profile
    const { error: deleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("role", "worker");

    if (deleteError) {
      console.error("❌ Profile deletion error:", deleteError);
      throw deleteError;
    }

    console.log("Worker profile deleted");

    // Delete auth user (optional - requires service role key)
    try {
      await supabaseAdmin.auth.admin.deleteUser(id);
      console.log("Auth user deleted");
    } catch (authDeleteError) {
      console.error(
        "⚠️ Error deleting auth user (non-critical):",
        authDeleteError
      );
      // Continue anyway - profile is deleted
    }

    return NextResponse.json({
      success: true,
      message: "Worker deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting worker:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
