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

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching manager:", id);

    // Get current user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 400 }
      );
    }

    if (profile.role !== "manager" && profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get manager details
    const { data: manager, error } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        *,
        organization:organizations(*)
      `
      )
      .eq("id", id)
      .eq("role", "manager")
      .single();

    if (error) {
      console.error("❌ Manager fetch error:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Manager not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Check same organization
    if (manager.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("Manager found:", manager.full_name);

    return NextResponse.json(manager);
  } catch (error) {
    console.error("❌ Error fetching manager:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const { id } = await context.params;

    console.log("📝 Attempting to update manager:", id);

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.error("❌ No auth token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Authenticated user:", user.email);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    // Only owners can edit managers
    if (profile?.role !== "owner") {
      console.error("❌ Insufficient permissions:", profile?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("User is owner");

    // Check if manager exists & same org
    const { data: manager, error: managerError } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id, full_name, role, email")
      .eq("id", id)
      .eq("role", "manager")
      .single();

    if (managerError || !manager) {
      console.error("❌ Manager lookup error:", managerError);
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    if (manager.organization_id !== profile.organization_id) {
      console.error("❌ Organization mismatch");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(
      "Found manager:",
      manager.full_name,
      "- Org:",
      manager.organization_id
    );

    // Parse request body
    const body = await request.json();
    const { full_name, email, phone } = body;

    // Validate required fields
    if (!full_name || !email) {
      return NextResponse.json(
        { error: "Full name and email are required" },
        { status: 400 }
      );
    }

    // Check if email is being changed and if it's already in use
    if (email !== manager.email) {
      const { data: existingUser } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .neq("id", id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 400 }
        );
      }

      // Update auth user email
      try {
        const { error: authUpdateError } =
          await supabaseAdmin.auth.admin.updateUserById(id, {
            email: email,
          });

        if (authUpdateError) {
          console.error("❌ Error updating auth email:", authUpdateError);
          throw authUpdateError;
        }
        console.log("Auth email updated");
      } catch (authUpdateError) {
        console.error("❌ Error updating auth user email:", authUpdateError);
        return NextResponse.json(
          { error: "Failed to update email address" },
          { status: 500 }
        );
      }
    }

    // Update profile
    const updateData = {
      full_name,
      email,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedManager, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .eq("role", "manager")
      .select()
      .single();

    if (updateError) {
      console.error("❌ Profile update error:", updateError);
      throw updateError;
    }

    console.log("Manager profile updated:", updatedManager.full_name);

    return NextResponse.json({
      success: true,
      message: "Manager updated successfully",
      manager: updatedManager,
    });
  } catch (error) {
    console.error("❌ Error updating manager:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;

    console.log("🗑️ Attempting to delete manager:", id);

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.error("❌ No auth token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Authenticated user:", user.email);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    // Only owners can delete managers
    if (profile?.role !== "owner") {
      console.error("❌ Insufficient permissions:", profile?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("User is owner");

    // Check if manager exists & same org
    const { data: manager, error: managerError } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id, full_name, role")
      .eq("id", id)
      .eq("role", "manager")
      .single();

    if (managerError || !manager) {
      console.error("❌ Manager lookup error:", managerError);
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    if (manager.organization_id !== profile.organization_id) {
      console.error("❌ Organization mismatch");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(
      "Found manager:",
      manager.full_name,
      "- Org:",
      manager.organization_id
    );

    // Optional: if you want to enforce no active requests created by this manager,
    // you can check maintenance_requests.created_by here.

    // Delete manager profile
    const { error: deleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("role", "manager");

    if (deleteError) {
      console.error("❌ Profile deletion error:", deleteError);
      throw deleteError;
    }

    console.log("Manager profile deleted");

    // Delete auth user (non-critical if it fails)
    try {
      await supabaseAdmin.auth.admin.deleteUser(id);
      console.log("Auth user deleted");
    } catch (authDeleteError) {
      console.error(
        "⚠️ Error deleting auth user (non-critical):",
        authDeleteError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Manager deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting manager:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
