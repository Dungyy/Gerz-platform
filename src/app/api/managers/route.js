import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/managers
// Only OWNERS can create managers
export async function POST(request) {
  try {
    const { email, full_name, phone, send_sms } = await request.json();

    console.log("👔 Starting manager creation for:", email);

    // Get current user from auth header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's profile/org
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role, organization:organizations(name)")
      .eq("id", currentUser.id)
      .single();

    if (profileError) {
      console.error("❌ Current profile error:", profileError);
      return NextResponse.json(
        { error: "Failed to load current profile" },
        { status: 400 }
      );
    }

    // Only owners can create managers
    if (!currentProfile || currentProfile.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can create managers" },
        { status: 403 }
      );
    }

    console.log("👤 Owner org:", currentProfile.organization?.name);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create manager invite in Supabase auth
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name,
          invited_by: currentUser.id,
          organization_id: currentProfile.organization_id,
          role: "manager", // 🔐 hard-coded manager role
        },
        redirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`,
      });

    if (inviteError) {
      console.error("❌ Manager invite error:", inviteError);
      throw inviteError;
    }

    const userId = inviteData.user.id;
    console.log("✅ Manager invite created:", userId);

    // Create manager profile row
    const { error: newProfileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        organization_id: currentProfile.organization_id,
        full_name,
        email,
        phone: phone ? formatPhoneNumber(phone) : null,
        role: "manager",
        sms_notifications: !!phone,
      });

    if (newProfileError) {
      console.error("❌ Manager profile creation error:", newProfileError);
      // roll back auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw newProfileError;
    }

    console.log("✅ Manager profile created");

    // Create notification preferences (optional, same as worker)
    await supabaseAdmin.from("notification_preferences").insert({
      user_id: userId,
      sms_new_request: !!phone,
      sms_status_update: !!phone,
      sms_emergency: !!phone,
    });

    // Send custom welcome email
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
            subject: `Welcome as a manager at ${currentProfile.organization.name}`,
            html: generateManagerWelcomeEmail(
              full_name,
              currentProfile.organization.name
            ),
          }),
        });
        console.log("✅ Manager welcome email sent");
      } catch (emailError) {
        console.error("❌ Manager email error:", emailError);
      }
    }

    // Send SMS if requested
    if (phone && send_sms) {
      try {
        const smsMessage = `You’ve been added as a manager at ${currentProfile.organization.name}. Check your email (${email}) to set your password and access the system. - Gerz`;

        await sendSMS({
          to: formatPhoneNumber(phone),
          message: smsMessage,
          organizationId: currentProfile.organization_id,
          recipientUserId: userId,
          messageType: "invitation",
        });
        console.log("✅ Manager SMS sent");
      } catch (smsError) {
        console.error("❌ Manager SMS error:", smsError);
      }
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      message: "Manager created successfully",
    });
  } catch (error) {
    console.error("❌ Manager creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create manager" },
      { status: 400 }
    );
  }
}

// GET /api/managers
// Owners & managers can see all managers in their org
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Profile error:", profileError);
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 400 }
      );
    }

    if (profile.role !== "owner" && profile.role !== "manager") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get all managers in this organization
    const { data: managers, error: managersError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("role", "manager")
      .order("full_name");

    if (managersError) {
      console.error("❌ Managers query error:", managersError);
      return NextResponse.json(
        { error: "Failed to fetch managers" },
        { status: 500 }
      );
    }

    return NextResponse.json(managers || []);
  } catch (error) {
    console.error("❌ Managers GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch managers" },
      { status: 500 }
    );
  }
}

function generateManagerWelcomeEmail(fullName, orgName) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 30px 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome as a Manager</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>You've been added to <strong>${orgName}</strong> as a manager.</p>
            
            <div class="info-box">
              <strong>📧 Check your email inbox</strong> for a separate message with the subject <strong>"Confirm your signup"</strong>. Click the link in that email to set your password.
            </div>

            <p><strong>As a manager you can:</strong></p>
            <ul>
              <li>View and manage maintenance requests</li>
              <li>Assign work to staff and workers</li>
              <li>Update request status and communicate with tenants</li>
              <li>Monitor activity for your organization</li>
            </ul>

            <p>If you have any questions, please contact the account owner.</p>

            <p>Best regards,<br><strong>${orgName}</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}
