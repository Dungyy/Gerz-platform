import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, context) {
  try {
    console.log("📥 GET comments request");

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

    const params = await context.params;
    const requestId = params.id;

    console.log("🔍 Fetching comments for request:", requestId);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log("👤 User role:", profile.role);

    let query = supabaseAdmin
      .from("request_comments")
      .select(
        `
        *,
        user:profiles(full_name, role)
      `
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (profile.role === "tenant") {
      query = query.eq("is_internal", false);
      console.log("🔒 Filtering out internal comments for tenant");
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error("❌ Comments fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Found", comments?.length || 0, "comments");

    return NextResponse.json(comments || []);
  } catch (error) {
    console.error("❌ Comments GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const { comment, is_internal } = await request.json();

    console.log("📥 POST comment request");

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

    const params = await context.params;
    const requestId = params.id;

    console.log("💬 Creating comment for request:", requestId);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      console.error("❌ Profile not found for user:", user.id);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // ✅ VALIDATE organization_id exists
    if (!profile.organization_id) {
      console.error("❌ User has no organization_id:", user.id);
      return NextResponse.json(
        {
          error: "User profile is missing organization_id",
        },
        { status: 400 }
      );
    }

    console.log(
      "👤 Comment from:",
      profile.full_name,
      "(",
      profile.role,
      ") - Org:",
      profile.organization_id
    );

    if (profile.role === "tenant" && is_internal) {
      return NextResponse.json(
        {
          error: "Tenants cannot create internal comments",
        },
        { status: 403 }
      );
    }

    const { data: maintenanceRequest, error: requestError } =
      await supabaseAdmin
        .from("maintenance_requests")
        .select(
          `
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(
          full_name, 
          email, 
          phone, 
          sms_notifications
        ),
        assigned_worker:profiles!maintenance_requests_assigned_to_fkey(
          full_name, 
          email, 
          phone, 
          sms_notifications
        ),
        property:properties(name)
      `
        )
        .eq("id", requestId)
        .single();

    if (requestError || !maintenanceRequest) {
      console.error("❌ Request not found:", requestError);
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    console.log("📄 Found request:", maintenanceRequest.title);

    const canComment =
      profile.role === "owner" ||
      profile.role === "manager" ||
      (profile.role === "worker" &&
        maintenanceRequest.organization_id === profile.organization_id) ||
      (profile.role === "tenant" && maintenanceRequest.tenant_id === user.id);

    if (!canComment) {
      console.error("❌ User cannot comment on this request");
      return NextResponse.json(
        {
          error: "Unauthorized - You cannot comment on this request",
        },
        { status: 403 }
      );
    }

    console.log("✅ Comment authorization passed");

    // ✅ CREATE COMMENT WITH VALIDATED DATA
    console.log("📝 Inserting comment with:", {
      request_id: requestId,
      user_id: user.id,
      organization_id: profile.organization_id,
      comment: comment?.substring(0, 50) + "...",
      is_internal: is_internal || false,
    });

    const { data: newComment, error: createError } = await supabaseAdmin
      .from("request_comments")
      .insert({
        request_id: requestId,
        user_id: user.id,
        organization_id: profile.organization_id, // This should now be valid
        comment,
        is_internal: is_internal || false,
      })
      .select(
        `
        *,
        user:profiles(full_name, role)
      `
      )
      .single();

    if (createError) {
      console.error("❌ Comment creation error:", createError);
      console.error("❌ Error details:", JSON.stringify(createError, null, 2));
      return NextResponse.json(
        {
          error: createError.message || "Failed to create comment",
          details: createError,
        },
        { status: 400 }
      );
    }

    console.log("✅ Comment created:", newComment.id);

    // ... rest of notification code (keep as-is)
    if (!is_internal) {
      console.log("📧 Sending notifications for public comment");

      if (
        profile.role !== "tenant" &&
        maintenanceRequest.tenant?.email &&
        process.env.RESEND_API_KEY
      ) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.DEFAULT_FROM_EMAIL,
              to: maintenanceRequest.tenant.email,
              subject: `Update on your request: ${maintenanceRequest.title}`,
              html: generateCommentNotificationEmail(
                maintenanceRequest.tenant.full_name,
                profile.full_name,
                profile.role,
                maintenanceRequest,
                comment
              ),
            }),
          });

          console.log("✅ Email sent to tenant");

          if (
            maintenanceRequest.tenant.phone &&
            maintenanceRequest.tenant.sms_notifications
          ) {
            await sendSMS({
              to: formatPhoneNumber(maintenanceRequest.tenant.phone),
              message: `Update on your maintenance request from ${
                profile.full_name
              }: ${comment.substring(0, 100)}${
                comment.length > 100 ? "..." : ""
              }`,
              organizationId: profile.organization_id,
              recipientUserId: maintenanceRequest.tenant_id,
              messageType: "status_update",
            });
            console.log("✅ SMS sent to tenant");
          }
        } catch (err) {
          console.error("❌ Tenant notification error:", err);
        }
      }

      if (
        profile.role === "tenant" &&
        maintenanceRequest.assigned_worker?.email &&
        process.env.RESEND_API_KEY
      ) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.DEFAULT_FROM_EMAIL,
              to: maintenanceRequest.assigned_worker.email,
              subject: `New comment on request: ${maintenanceRequest.title}`,
              html: generateCommentNotificationEmail(
                maintenanceRequest.assigned_worker.full_name,
                profile.full_name,
                profile.role,
                maintenanceRequest,
                comment
              ),
            }),
          });

          console.log("✅ Email sent to worker");

          if (
            maintenanceRequest.assigned_worker.phone &&
            maintenanceRequest.assigned_worker.sms_notifications
          ) {
            await sendSMS({
              to: formatPhoneNumber(maintenanceRequest.assigned_worker.phone),
              message: `New comment from ${
                profile.full_name
              } on request: ${comment.substring(0, 100)}`,
              organizationId: profile.organization_id,
              recipientUserId: maintenanceRequest.assigned_to,
              messageType: "status_update",
            });
            console.log("✅ SMS sent to worker");
          }
        } catch (err) {
          console.error("❌ Worker notification error:", err);
        }
      }
    } else {
      console.log("🔒 Internal comment - no notifications sent");
    }

    return NextResponse.json({
      success: true,
      comment: newComment,
    });
  } catch (error) {
    console.error("❌ Comment POST error:", error);
    console.error("❌ Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 500 }
    );
  }
}

function generateCommentNotificationEmail(
  recipientName,
  commenterName,
  commenterRole,
  request,
  comment
) {
  const roleLabel =
    {
      tenant: "Tenant",
      worker: "Worker",
      manager: "Manager",
      owner: "Owner",
    }[commenterRole] || "Staff Member";

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h2>New Update on Your Request</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px;">
            <p>Hi ${recipientName},</p>
            
            <p><strong>${commenterName}</strong> (${roleLabel}) added a comment:</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
              <p><strong>Request:</strong> ${request.title}</p>
              <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin-top: 10px;">
                "${comment}"
              </p>
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
