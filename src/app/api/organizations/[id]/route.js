import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Fetching organization:", id);

    // Fetch organization by ID or code
    let query = supabaseAdmin
      .from("organizations")
      .select(
        "id, name, slug, logo_url, organization_code, plan, subscription_status, trial_ends_at, created_at"
      )
      .limit(1);

    // Check if ID is a UUID or organization code
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    if (isUUID) {
      query = query.eq("id", id);
    } else {
      // Assume it's an organization code
      query = query.eq("organization_code", id.toUpperCase());
    }

    const { data: organization, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    console.log("Found organization:", organization.name);

    return NextResponse.json(organization);
  } catch (error) {
    console.error("❌ Organization fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const updates = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate that only allowed fields are being updated
    const allowedFields = ["name", "logo_url", "settings"];
    const updateData = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    console.log("📝 Updating organization:", id, updateData);

    const { data: organization, error } = await supabaseAdmin
      .from("organizations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    console.log("Updated organization:", organization.name);

    return NextResponse.json(organization);
  } catch (error) {
    console.error("❌ Organization update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    console.log("🗑️ Deleting organization:", id);

    // Check if organization has any data before deleting
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("organization_id", id)
      .limit(1);

    if (profilesError) throw profilesError;

    if (profiles && profiles.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete organization with existing users" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    console.log("Deleted organization:", id);

    return NextResponse.json({
      success: true,
      message: "Organization deleted",
    });
  } catch (error) {
    console.error("❌ Organization delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete organization" },
      { status: 500 }
    );
  }
}
