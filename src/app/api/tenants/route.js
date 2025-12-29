import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateTenantWelcomeEmail(fullName, unit, orgName, invitationMethod) {
  const isMagicLink = invitationMethod === "magic_link";

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
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${unit.property.name}!</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>Welcome! You've been added as a tenant by ${orgName}.</p>
            
            <div class="info-box">
              <p><strong>Your Unit:</strong> ${unit.property.name} - Unit ${
    unit.unit_number
  }</p>
              <p><strong>Address:</strong> ${unit.property.address}, ${
    unit.property.city
  }, ${unit.property.state}</p>
            </div>

            ${
              isMagicLink
                ? `
              <h3>🔐 Easy Sign-In (No Password Required!)</h3>
              <p>We've sent you a <strong>magic link</strong> in a separate email. Simply click that link to sign in - no password needed!</p>
              <p><strong>Look for an email with the subject:</strong> "Confirm your signup"</p>
              <p>This magic link will log you in instantly and securely.</p>
            `
                : `
              <h3>🔑 Set Your Password</h3>
              <p>Check your email inbox for a message with the subject <strong>"Confirm your signup"</strong>. Click the link in that email to set your password and access your account.</p>
            `
            }

            <div class="info-box">
              <h4>With your tenant portal, you can:</h4>
              <ul>
                <li>Submit maintenance requests 24/7</li>
                <li>Track request status in real-time</li>
                <li>Upload photos of issues</li>
                <li>Communicate with maintenance staff</li>
                <li>View your unit information</li>
                <li>Receive instant notifications</li>
              </ul>
            </div>

            ${
              isMagicLink
                ? `
              <p><strong>For future logins:</strong> You can request a magic link anytime from the login page - no need to remember a password!</p>
            `
                : ""
            }

            <p>If you have any questions, please contact your property manager.</p>

            <p>Best regards,<br><strong>${orgName}</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request) {
  try {
    const { email, full_name, phone, unit_id, send_sms, invitation_method } =
      await request.json();

    console.log(
      "👤 Starting tenant invitation for:",
      email,
      "- Method:",
      invitation_method
    );

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
      .select(
        "organization_id, role, full_name, organization:organizations(name)"
      )
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

    // Get unit details
    const { data: unit } = await supabaseAdmin
      .from("units")
      .select(
        `
        unit_number,
        property:properties(name, address, city, state)
      `
      )
      .eq("id", unit_id)
      .single();

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let userId;

    // ✅ INVITATION METHOD: PASSWORD or MAGIC LINK
    if (invitation_method === "magic_link") {
      console.log("📧 Using magic link invitation");

      // Create user without password (they'll use magic link)
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: false, // They need to confirm via magic link
          user_metadata: {
            full_name,
            invited_by: manager.id,
            organization_id: managerProfile.organization_id,
            role: "tenant",
          },
        });

      if (authError) {
        console.error("❌ Auth error:", authError);
        throw authError;
      }

      userId = authData.user.id;

      // Send magic link
      const { error: magicLinkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email,
          options: {
            redirectTo: `${baseUrl}/dashboard`,
          },
        });

      if (magicLinkError) {
        console.error("❌ Magic link error:", magicLinkError);
      }
    } else {
      console.log("🔑 Using password invitation");

      // Create user with invite (they set password)
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name,
            invited_by: manager.id,
            organization_id: managerProfile.organization_id,
            role: "tenant",
          },
          redirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`,
        });

      if (inviteError) {
        console.error("❌ Invite error:", inviteError);
        throw inviteError;
      }

      userId = inviteData.user.id;
    }

    console.log("✅ User created:", userId);

    // Create tenant profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        organization_id: managerProfile.organization_id,
        full_name,
        email,
        phone: phone ? formatPhoneNumber(phone) : null,
        role: "tenant",
        sms_notifications: !!phone,
      });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    console.log("✅ Tenant profile created");

    // Assign tenant to unit
    const { error: unitError } = await supabaseAdmin
      .from("units")
      .update({ tenant_id: userId })
      .eq("id", unit_id);

    if (unitError) {
      console.error("❌ Unit assignment error:", unitError);
      throw unitError;
    }

    console.log("✅ Tenant assigned to unit");

    // Create notification preferences
    await supabaseAdmin.from("notification_preferences").insert({
      user_id: userId,
      sms_new_request: !!phone,
      sms_status_update: !!phone,
      sms_emergency: !!phone,
    });

    // Send custom welcome email with instructions
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
            subject: `Welcome to ${unit.property.name}!`,
            html: generateTenantWelcomeEmail(
              full_name,
              unit,
              managerProfile.organization.name,
              invitation_method
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
        const smsMessage =
          invitation_method === "magic_link"
            ? `Welcome to ${unit.property.name}! Check your email (${email}) for a secure login link to access your tenant portal. - Dingy.app`
            : `Welcome to ${unit.property.name}! Check your email (${email}) to set your password and access your tenant portal. - Dingy.app`;

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
      message: "Tenant invited successfully",
      invitation_method,
    });
  } catch (error) {
    console.error("❌ Tenant invitation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to invite tenant" },
      { status: 400 }
    );
  }
}

// ============================================
// GET - Fetch all tenants in organization
// ============================================
export async function GET(request) {
  try {
    console.log("📥 GET request for tenants");

    // Get authorization token
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

    console.log("✅ Authenticated user:", user.email);

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // ✅ AUTHORIZATION CHECK - Only managers/owners can view all tenants
    if (profile.role !== "owner" && profile.role !== "manager") {
      return NextResponse.json(
        {
          error:
            "Insufficient permissions - Only managers/owners can view tenants",
        },
        { status: 403 }
      );
    }

    console.log(
      "✅ Authorization passed - fetching tenants for org:",
      profile.organization_id
    );

    // Fetch all tenants in the organization with their unit info
    const { data: tenants, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        *,
        unit:units!units_tenant_id_fkey(
          id,
          unit_number,
          property:properties(
            id,
            name,
            address,
            city,
            state
          )
        )
      `
      )
      .eq("organization_id", profile.organization_id)
      .eq("role", "tenant")
      .order("full_name");

    if (fetchError) {
      console.error("❌ Fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log("✅ Found", tenants?.length || 0, "tenants");

    return NextResponse.json(tenants || []);
  } catch (error) {
    console.error("❌ Tenants GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
