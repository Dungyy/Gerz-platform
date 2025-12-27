import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const {
      data: { user: owner },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get owner's profile
    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", owner.id)
      .single();

    // Only owners can create managers
    if (!ownerProfile || ownerProfile.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can create managers" },
        { status: 403 }
      );
    }

    const { email, full_name, password } = await request.json();

    if (!email || !full_name || !password) {
      return NextResponse.json(
        { error: "Email, full name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    console.log("👔 Creating manager account for:", email);

    // Create user account
    const { data: authData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name,
        },
      });

    if (signUpError) {
      console.error("❌ Sign up error:", signUpError);
      return NextResponse.json(
        { error: signUpError.message || "Failed to create account" },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    const userId = authData.user.id;
    console.log("✅ Manager auth user created:", userId);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name,
        role: "manager",
        organization_id: ownerProfile.organization_id,
      });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    console.log("✅ Manager profile created");

    return NextResponse.json({
      success: true,
      user_id: userId,
      message: "Manager created successfully",
    });
  } catch (error) {
    console.error("❌ Create manager error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create manager" },
      { status: 500 }
    );
  }
}
