import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("🔐 Password reset requested for:", email);

    // Check if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      // This prevents email enumeration attacks
      console.log("⚠️ User not found, but returning success");
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Generate unique token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save reset token to database
    const { error: insertError } = await supabaseAdmin
      .from("password_resets")
      .insert({
        user_id: user.id,
        email: user.email,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("❌ Error saving reset token:", insertError);
      return NextResponse.json(
        { error: "Failed to create reset token" },
        { status: 500 }
      );
    }

    // Generate reset URL (matches invitation pattern)
    const resetUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    console.log("📧 Sending password reset email to:", email);
    console.log("🔗 Reset URL:", resetUrl);

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Reset Your Password - dingy.app",
            html: generatePasswordResetEmail(email, resetUrl),
          }),
        });

        console.log("✅ Password reset email sent to:", email);
      } catch (emailError) {
        console.error("❌ Email send error:", emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log("⚠️ No RESEND_API_KEY found, skipping email");
      console.log("🔗 Reset URL:", resetUrl);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("❌ Password reset request error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}

function generatePasswordResetEmail(email, resetUrl) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Reset Your Password</h2>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello,</p>
            
            <p>We received a request to reset the password for your account associated with <strong>${email}</strong>.</p>
            
            <p>Click the button below to create a new password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>

            <p style="color: #666; font-size: 14px; border-left: 4px solid #fbbf24; padding-left: 12px; margin: 20px 0;">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
            </p>

            <p style="color: #666; font-size: 14px;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

            <p style="color: #666; font-size: 12px;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
            </p>

            <p style="margin-top: 30px;">Best regards,<br><strong>dingy.app Team</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}
