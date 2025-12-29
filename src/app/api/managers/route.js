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

    console.log("👔 Starting manager invitation for:", email);

    // Get current user from auth header
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
      .select("organization_id, role, organization:organizations(name)")
      .eq("id", owner.id)
      .single();

    if (!ownerProfile || ownerProfile.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can invite managers" },
        { status: 403 }
      );
    }

    console.log("👤 Owner org:", ownerProfile.organization.name);

    // Create manager invite
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name,
          invited_by: owner.id,
          organization_id: ownerProfile.organization_id,
          role: "manager",
        },
        redirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`,
      });

    if (inviteError) {
      console.error("❌ Invite error:", inviteError);
      throw inviteError;
    }

    const userId = inviteData.user.id;
    console.log("✅ Manager invite created:", userId);

    // Create manager profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        organization_id: ownerProfile.organization_id,
        full_name,
        email,
        phone: phone ? formatPhoneNumber(phone) : null,
        role: "manager",
        sms_notifications: !!phone,
      });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    console.log("✅ Manager profile created");

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
            subject: `Welcome to ${ownerProfile.organization.name} Management Team`,
            html: generateManagerWelcomeEmail(
              full_name,
              ownerProfile.organization.name
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
        const smsMessage = `Welcome to ${ownerProfile.organization.name} management team! You've been added as a manager. Check your email (${email}) to set your password and access the system. - Dingy.app`;

        await sendSMS({
          to: formatPhoneNumber(phone),
          message: smsMessage,
          organizationId: ownerProfile.organization_id,
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
      message: "Manager invited successfully",
    });
  } catch (error) {
    console.error("❌ Manager invitation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to invite manager" },
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

    // Get all managers in organization
    const { data: managers } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("role", "manager")
      .order("full_name");

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
            <h1>Welcome to the Management Team!</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>You've been added to the ${orgName} management team as a manager.</p>
            
            <div class="info-box">
              <strong>📧 Check your email inbox</strong> for a separate message with the subject <strong>"Confirm your signup"</strong>. Click the link in that email to set your password.
            </div>

            <p><strong>Once you're set up, you'll be able to:</strong></p>
            <ul>
              <li>View and manage maintenance requests</li>
              <li>Assign tasks to workers</li>
              <li>Update request status and add notes</li>
              <li>Communicate with tenants and workers</li>
              <li>Monitor organization activity</li>
              <li>Invite and manage workers</li>
            </ul>

            <p>If you have any questions, please contact the account owner.</p>

            <p>Best regards,<br><strong>${orgName}</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}
