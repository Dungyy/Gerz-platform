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

    // Check if user is manager/owner or the worker themselves
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profile?.role !== "manager" &&
      profile?.role !== "owner" &&
      user.id !== id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all requests for this worker
    const { data: requests, error } = await supabaseAdmin
      .from("maintenance_requests")
      .select("*")
      .eq("assigned_to", id);

    if (error) throw error;

    // Calculate stats
    const total = requests.length;
    const active = requests.filter(
      (r) => r.status !== "completed" && r.status !== "cancelled"
    ).length;
    const completed = requests.filter((r) => r.status === "completed").length;
    const cancelled = requests.filter((r) => r.status === "cancelled").length;

    // Calculate average completion time (in hours)
    const completedRequests = requests.filter((r) => r.status === "completed");
    let avgCompletionTime = 0;

    if (completedRequests.length > 0) {
      const totalTime = completedRequests.reduce((sum, req) => {
        const created = new Date(req.created_at);
        const updated = new Date(req.updated_at);
        const hours = (updated - created) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgCompletionTime = Math.round(totalTime / completedRequests.length);
    }

    // Group by status
    const byStatus = {
      submitted: requests.filter((r) => r.status === "submitted").length,
      assigned: requests.filter((r) => r.status === "assigned").length,
      in_progress: requests.filter((r) => r.status === "in_progress").length,
      completed,
      cancelled,
    };

    // Group by priority
    const byPriority = {
      low: requests.filter((r) => r.priority === "low").length,
      medium: requests.filter((r) => r.priority === "medium").length,
      high: requests.filter((r) => r.priority === "high").length,
      emergency: requests.filter((r) => r.priority === "emergency").length,
    };

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRequests = requests.filter(
      (r) => new Date(r.created_at) >= thirtyDaysAgo
    ).length;

    const recentCompleted = requests.filter(
      (r) => r.status === "completed" && new Date(r.updated_at) >= thirtyDaysAgo
    ).length;

    return NextResponse.json({
      total,
      active,
      completed,
      cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgCompletionTime,
      byStatus,
      byPriority,
      recentActivity: {
        total: recentRequests,
        completed: recentCompleted,
      },
    });
  } catch (error) {
    console.error("Error fetching worker stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
