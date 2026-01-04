import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const requestData = await request.json();

    console.log("📥 Received maintenance request:", requestData);

    // Get current user from auth header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.error("❌ No authorization token");
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Invalid token:", authError);
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    console.log("Authenticated user:", user.email);

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id, role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log("👤 User profile:", profile.full_name, "-", profile.role);

    // AUTHORIZATION CHECK: Tenant can only submit for themselves
    if (profile.role === "tenant" && requestData.tenant_id !== user.id) {
      console.error(
        "❌ Authorization failed: Tenant trying to submit for different user"
      );
      return NextResponse.json(
        {
          error: "Unauthorized - You can only submit requests for yourself",
        },
        { status: 403 }
      );
    }

    // AUTHORIZATION CHECK: Verify organization
    if (requestData.organization_id !== profile.organization_id) {
      console.error("❌ Authorization failed: Organization mismatch");
      return NextResponse.json(
        {
          error: "Unauthorized - Organization mismatch",
        },
        { status: 403 }
      );
    }

    // Get unit and property details for logging and notifications
    const { data: unit } = await supabaseAdmin
      .from("units")
      .select(
        `
        unit_number,
        property:properties(name, address, manager_id)
      `
      )
      .eq("id", requestData.unit_id)
      .single();

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    console.log(
      "🏠 Request for:",
      unit.property.name,
      "Unit",
      unit.unit_number
    );

    // Create the maintenance request
    const { data: maintenanceRequest, error: createError } = await supabaseAdmin
      .from("maintenance_requests")
      .insert([
        {
          ...requestData,
          created_by: user.id,
          status: "submitted",
        },
      ])
      .select()
      .single();

    if (createError) {
      console.error("❌ Database error:", createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    console.log("Request created:", maintenanceRequest.id);

    // SEND NOTIFICATIONS TO PROPERTY MANAGER
    if (unit.property.manager_id) {
      const { data: manager } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, phone, sms_notifications")
        .eq("id", unit.property.manager_id)
        .single();

      if (manager) {
        console.log("📧 Notifying manager:", manager.full_name);

        // Send email notification
        if (process.env.RESEND_API_KEY && manager.email) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: process.env.DEFAULT_FROM_EMAIL,
                to: manager.email,
                subject: `New Maintenance Request - ${unit.property.name} Unit ${unit.unit_number}`,
                html: generateManagerNotificationEmail(
                  manager.full_name,
                  profile.full_name,
                  unit,
                  maintenanceRequest
                ),
              }),
            });
            console.log("Email sent to manager");
          } catch (emailError) {
            console.error("❌ Email error:", emailError);
          }
        }

        // Send SMS notification
        if (manager.phone && manager.sms_notifications) {
          try {
            const smsMessage = `New maintenance request at ${unit.property.name} Unit ${unit.unit_number} from ${profile.full_name}. Priority: ${requestData.priority}. Issue: ${requestData.title}. View in dashboard.`;

            await sendSMS({
              to: formatPhoneNumber(manager.phone),
              message: smsMessage,
              organizationId: profile.organization_id,
              recipientUserId: unit.property.manager_id,
              messageType: "new_request",
            });
            console.log("SMS sent to manager");
          } catch (smsError) {
            console.error("❌ SMS error:", smsError);
          }
        }
      }
    }

    // Send confirmation to tenant
    if (profile.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.DEFAULT_FROM_EMAIL,
            to: profile.email,
            subject: `Request Received - ${maintenanceRequest.title}`,
            html: generateTenantConfirmationEmail(
              profile.full_name,
              unit,
              maintenanceRequest
            ),
          }),
        });
        console.log("Confirmation email sent to tenant");
      } catch (emailError) {
        console.error("❌ Tenant email error:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      request: maintenanceRequest,
      message: "Maintenance request submitted successfully",
    });
  } catch (error) {
    console.error("❌ Maintenance request creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create maintenance request" },
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

    console.log("📊 Fetching requests for:", profile.role);

    // Build query based on role
    let query = supabaseAdmin
      .from("maintenance_requests")
      .select(
        `
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email, phone),
        property:properties(id, name, address),
        unit:units(id, unit_number),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(full_name)
      `
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });

    // AUTHORIZATION: Tenants only see their own requests
    if (profile.role === "tenant") {
      query = query.eq("tenant_id", user.id);
      console.log("🔒 Filtering to tenant requests only");
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("❌ Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Found", requests?.length || 0, "requests");

    return NextResponse.json(requests || []);
  } catch (error) {
    console.error("❌ Maintenance requests GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch maintenance requests" },
      { status: 500 }
    );
  }
}

// Email template for manager notification
function generateManagerNotificationEmail(
  managerName,
  tenantName,
  unit,
  request
) {
  const priorityColors = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    emergency: "#dc2626",
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Maintenance Request</h2>
          </div>
          <div class="content">
            <p>Hi ${managerName},</p>
            <p>A new maintenance request has been submitted:</p>
            
            <div class="info-box">
              <h3>${request.title}</h3>
              <p><strong>Priority:</strong> <span class="badge" style="background: ${
                priorityColors[request.priority]
              }; color: white;">${request.priority.toUpperCase()}</span></p>
              <p><strong>Category:</strong> ${request.category}</p>
              <p><strong>Location:</strong> ${unit.property.name} - Unit ${
    unit.unit_number
  }</p>
              <p><strong>Tenant:</strong> ${tenantName}</p>
              <p><strong>Description:</strong><br>${request.description}</p>
              ${
                request.location_details
                  ? `<p><strong>Specific Location:</strong> ${request.location_details}</p>`
                  : ""
              }
            </div>

            <p><a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/dashboard/requests/${
    request.id
  }" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Request</a></p>

            <p>Best regards,<br><strong>Dingy.app Maintenance</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Email template for tenant confirmation
function generateTenantConfirmationEmail(tenantName, unit, request) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Request Received</h2>
          </div>
          <div class="content">
            <p>Hi ${tenantName},</p>
            <p>We've received your maintenance request and our team has been notified.</p>
            
            <div class="info-box">
              <h3>${request.title}</h3>
              <p><strong>Request ID:</strong> #${request.id.substring(0, 8)}</p>
              <p><strong>Location:</strong> ${unit.property.name} - Unit ${
    unit.unit_number
  }</p>
              <p><strong>Priority:</strong> ${request.priority}</p>
              <p><strong>Status:</strong> Submitted</p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our team will review your request</li>
              <li>You'll receive updates via email/SMS</li>
              <li>A technician will be assigned based on priority</li>
            </ul>

            <p><a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/dashboard/requests/${
    request.id
  }" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Track Your Request</a></p>

            <p>Thank you,<br><strong>Dingy.app Maintenance Team</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}
