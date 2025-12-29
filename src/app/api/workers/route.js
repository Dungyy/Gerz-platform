import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email, full_name, phone, send_sms } = await request.json();

    console.log("👷 Starting worker invitation for:", email);

    // Get current user from auth header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user: manager },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !manager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get manager's profile
    const { data: managerProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role, organization:organizations(name)")
      .eq("id", manager.id)
      .single();

    if (
      !managerProfile ||
      (managerProfile.role !== "owner" && managerProfile.role !== "manager")
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    console.log("👤 Manager org:", managerProfile.organization.name);

    // Create worker invite
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name,
          invited_by: manager.id,
          organization_id: managerProfile.organization_id,
          role: "worker",
        },
        redirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`,
      });

    if (inviteError) {
      console.error("❌ Invite error:", inviteError);
      throw inviteError;
    }

    const userId = inviteData.user.id;
    console.log("✅ Worker invite created:", userId);

    // Create worker profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        organization_id: managerProfile.organization_id,
        full_name,
        email,
        phone: phone ? formatPhoneNumber(phone) : null,
        role: "worker",
        sms_notifications: !!phone,
      });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    console.log("✅ Worker profile created");

    // Create notification preferences
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
            subject: `Welcome to ${managerProfile.organization.name} Maintenance Team`,
            html: generateWorkerWelcomeEmail(
              full_name,
              managerProfile.organization.name
            ),
          }),
        });
        console.log("✅ Welcome email sent");
      } catch (emailError) {
        console.error("❌ Email error:", emailError);
      }
    }

    // Send SMS if requested
    if (phone && send_sms) {
      try {
        const smsMessage = `Welcome to ${managerProfile.organization.name} maintenance team! You've been added as a worker. Check your email (${email}) to set your password and access the system. - Dingy.app`;

        await sendSMS({
          to: formatPhoneNumber(phone),
          message: smsMessage,
          organizationId: managerProfile.organization_id,
          recipientUserId: userId,
          messageType: "invitation",
        });
        console.log("✅ SMS sent");
      } catch (smsError) {
        console.error("❌ SMS error:", smsError);
      }
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      message: "Worker invited successfully",
    });
  } catch (error) {
    console.error("❌ Worker invitation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to invite worker" },
      { status: 400 }
    );
  }
}

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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profile.role !== "owner" && profile.role !== "manager") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get all workers in organization
    const { data: workers } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("role", "worker")
      .order("full_name");

    return NextResponse.json(workers || []);
  } catch (error) {
    console.error("❌ Workers GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch workers" },
      { status: 500 }
    );
  }
}

function generateWorkerWelcomeEmail(fullName, orgName) {
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
            <h1>Welcome to the Team!</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>You've been added to the ${orgName} maintenance team as a worker.</p>
            
            <div class="info-box">
              <strong>📧 Check your email inbox</strong> for a separate message with the subject <strong>"Confirm your signup"</strong>. Click the link in that email to set your password.
            </div>

            <p><strong>Once you're set up, you'll be able to:</strong></p>
            <ul>
              <li>View assigned maintenance requests</li>
              <li>Update request status and add notes</li>
              <li>Mark requests as complete</li>
              <li>Communicate with tenants and managers</li>
              <li>Receive notifications for new assignments</li>
            </ul>

            <p>If you have any questions, please contact your manager.</p>

            <p>Best regards,<br><strong>${orgName}</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}
