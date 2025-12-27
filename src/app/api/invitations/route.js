import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get inviter's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const { email, role, property_id, unit_id } = await request.json();

    // Validate permissions based on role being invited
    if (role === "manager") {
      // Only owners can invite managers
      if (profile.role !== "owner") {
        return NextResponse.json(
          { error: "Only owners can invite managers" },
          { status: 403 }
        );
      }
    } else {
      // Managers and owners can invite tenants/workers
      if (profile.role !== "owner" && profile.role !== "manager") {
        return NextResponse.json(
          { error: "Unauthorized - Only managers can invite" },
          { status: 403 }
        );
      }
    }

    // Validate inputs
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!["tenant", "worker", "manager"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some((u) => u.email === email);

    if (userExists) {
      return NextResponse.json(
        {
          error: "A user with this email already exists",
        },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from("invitations")
      .select("id")
      .eq("email", email)
      .eq("organization_id", profile.organization_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return NextResponse.json(
        {
          error: "An invitation has already been sent to this email",
        },
        { status: 400 }
      );
    }

    // Generate unique token
    const inviteToken = crypto.randomBytes(32).toString("hex");

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("invitations")
      .insert({
        organization_id: profile.organization_id,
        invited_by: user.id,
        email,
        role,
        token: inviteToken,
        property_id: property_id || null,
        unit_id: unit_id || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Invitation creation error:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    // Send invitation email
    const inviteUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/join?token=${inviteToken}`;

    if (process.env.RESEND_API_KEY) {
      try {
        // Get organization name for email
        const { data: orgData } = await supabaseAdmin
          .from("organizations")
          .select("name")
          .eq("id", profile.organization_id)
          .single();

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.DEFAULT_FROM_EMAIL,
            to: email,
            subject: `You've been invited to join as a ${role}`,
            html: generateInvitationEmail(
              email,
              role,
              inviteUrl,
              orgData?.name || "Gerz Maintenance"
            ),
          }),
        });

        console.log("✅ Invitation email sent to:", email);
      } catch (emailError) {
        console.error("❌ Email send error:", emailError);
        // Don't fail the invitation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      invitation,
      invite_url: inviteUrl,
    });
  } catch (error) {
    console.error("❌ Invitation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invitation" },
      { status: 500 }
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

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    if (profile.role !== "owner" && profile.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all invitations for this organization
    const { data: invitations, error } = await supabaseAdmin
      .from("invitations")
      .select(
        `
        *,
        invited_by_user:profiles!invitations_invited_by_fkey(full_name),
        property:properties(name),
        unit:units(unit_number)
      `
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(invitations || []);
  } catch (error) {
    console.error("❌ Get invitations error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get invitations" },
      { status: 500 }
    );
  }
}

function generateInvitationEmail(email, role, inviteUrl, organizationName) {
  const roleDescriptions = {
    tenant:
      "manage your maintenance requests and communicate with your property manager",
    worker:
      "view assigned maintenance requests, update status, and communicate with tenants and managers",
    manager:
      "manage properties, assign tasks to workers, and oversee maintenance requests",
  };

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h2>You've Been Invited!</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px;">
            <p>Hello,</p>
            
            <p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
            
            <p>Once you accept, you'll be able to ${roleDescriptions[role]}.</p>
            
            <p>Click the button below to accept your invitation and set up your account:</p>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </p>

            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 7 days.
            </p>

            <p style="color: #666; font-size: 14px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>

            <p>Best regards,<br><strong>${organizationName}</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}
