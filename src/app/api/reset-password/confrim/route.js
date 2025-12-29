import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Verify reset token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    console.log("🔍 GET /api/auth/reset-password/confirm - Token:", token);

    if (!token) {
      console.log("❌ No token provided");
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Check if token exists and is valid
    const { data: resetToken, error } = await supabaseAdmin
      .from("password_resets")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    console.log("Database query result:", { resetToken, error });

    if (error) {
      console.log("❌ Database error:", error);
      return NextResponse.json(
        { error: "Invalid or expired reset token", details: error.message },
        { status: 400 }
      );
    }

    if (!resetToken) {
      console.log("❌ No reset token found");
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    console.log("✅ Token is valid for:", resetToken.email);

    return NextResponse.json({
      valid: true,
      email: resetToken.email,
    });
  } catch (error) {
    console.error("❌ Token verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify reset token", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Reset password
export async function POST(request) {
  try {
    const { token, password } = await request.json();

    console.log("🔐 POST /api/auth/reset-password/confirm");

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    console.log("🔍 Looking up reset token...");

    // Get reset token from database
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from("password_resets")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (tokenError) {
      console.error("❌ Database error:", tokenError);
      return NextResponse.json(
        { error: "Failed to verify reset token" },
        { status: 500 }
      );
    }

    if (!resetToken) {
      console.log("❌ Invalid or expired token");
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    console.log("✅ Token valid for:", resetToken.email);
    console.log("🔄 Updating password...");

    // Update user password using Supabase Admin
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      resetToken.user_id,
      { password }
    );

    if (updateError) {
      console.error("❌ Password update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    console.log("✅ Password updated successfully");
    console.log("🔒 Marking token as used...");

    // Mark token as used to prevent reuse
    await supabaseAdmin
      .from("password_resets")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetToken.id);

    console.log("✅ Password reset complete for:", resetToken.email);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("❌ Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password", details: error.message },
      { status: 500 }
    );
  }
}
