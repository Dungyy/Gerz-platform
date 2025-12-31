import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// GET - Fetch single maintenance request
// ============================================
export async function GET(request, context) {
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

    const params = await context.params;
    const requestId = params.id;

    console.log("📥 Fetching request:", requestId);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: maintenanceRequest, error } = await supabaseAdmin
      .from("maintenance_requests")
      .select(
        `
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(id, full_name, email, phone),
        property:properties(id, name, address, city, state),
        unit:units(id, unit_number),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(id, full_name, email, phone)
      `
      )
      .eq("id", requestId)
      .single();

    if (error || !maintenanceRequest) {
      console.error("Request not found:", error);
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Authorization check
    const canView =
      profile.role === "owner" ||
      profile.role === "manager" ||
      (profile.role === "worker" &&
        maintenanceRequest.organization_id === profile.organization_id) ||
      (profile.role === "tenant" && maintenanceRequest.tenant_id === user.id);

    if (!canView) {
      return NextResponse.json(
        { error: "Unauthorized to view this request" },
        { status: 403 }
      );
    }

    console.log("✅ Request retrieved:", maintenanceRequest.title);

    return NextResponse.json(maintenanceRequest);
  } catch (error) {
    console.error("❌ Request GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch request" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Update maintenance request
// ============================================
export async function PUT(request, context) {
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

    const params = await context.params;
    const requestId = params.id;
    const updates = await request.json();

    console.log("📝 Updating request:", requestId, updates);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get current request state BEFORE update
    const { data: currentRequest } = await supabaseAdmin
      .from("maintenance_requests")
      .select(
        `
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(id, full_name, email, phone, sms_notifications),
        property:properties(id, name, address, city, state),
        unit:units(id, unit_number),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(id, full_name, email, phone, sms_notifications)
      `
      )
      .eq("id", requestId)
      .single();

    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Authorization check
    const canUpdate =
      profile.role === "owner" ||
      profile.role === "manager" ||
      (profile.role === "worker" && currentRequest.assigned_to === user.id);

    if (!canUpdate) {
      return NextResponse.json(
        { error: "Unauthorized to update this request" },
        { status: 403 }
      );
    }

    // Track what changed for notifications
    const statusChanged = updates.status && updates.status !== currentRequest.status;
    const assignmentChanged = updates.assigned_to !== undefined && updates.assigned_to !== currentRequest.assigned_to;
    const oldStatus = currentRequest.status;
    const oldAssignedTo = currentRequest.assigned_to;

    // Prepare update object
    const updateData = { ...updates };
    if (updates.status === "completed") {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = user.id;
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from("maintenance_requests")
      .update(updateData)
      .eq("id", requestId)
      .select(
        `
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(id, full_name, email, phone, sms_notifications),
        property:properties(id, name, address, city, state),
        unit:units(id, unit_number),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(id, full_name, email, phone, sms_notifications)
      `
      )
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    console.log("✅ Request updated successfully");

    // ========================================
    // SEND NOTIFICATIONS (SMART LOGIC)
    // ========================================

    // Only notify on IMPORTANT changes, not every status change
    const shouldNotifyTenant = 
      assignmentChanged || // New worker assigned
      (statusChanged && ['in_progress', 'completed'].includes(updates.status)); // Work started or finished

    const shouldNotifyWorker = 
      assignmentChanged || // New assignment
      (statusChanged && updates.status === 'completed' && updatedRequest.assigned_to !== user.id); // Completed by someone else

    // 1. ASSIGNMENT CHANGE - Notify new worker
    if (assignmentChanged && updates.assigned_to) {
      console.log("📧 Sending assignment notification to new worker");

      const { data: newWorker } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone, sms_notifications")
        .eq("id", updates.assigned_to)
        .single();

      if (newWorker && newWorker.email && process.env.RESEND_API_KEY) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.DEFAULT_FROM_EMAIL,
              to: newWorker.email,
              subject: `New Assignment: ${updatedRequest.title}`,
              html: generateWorkerAssignmentEmail(
                newWorker.full_name,
                updatedRequest,
                profile.full_name
              ),
            }),
          });
          console.log("✅ Assignment email sent to worker");

          // SMS notification
          if (newWorker.phone && newWorker.sms_notifications) {
            await sendSMS({
              to: formatPhoneNumber(newWorker.phone),
              message: `New assignment: ${updatedRequest.title} at ${updatedRequest.property.name} Unit ${updatedRequest.unit.unit_number}. Priority: ${updatedRequest.priority}. Check dashboard for details.`,
              organizationId: profile.organization_id,
              recipientUserId: newWorker.id,
              messageType: "assignment",
            });
            console.log("✅ Assignment SMS sent to worker");
          }
        } catch (error) {
          console.error("❌ Worker notification error:", error);
        }
      }

      // Notify tenant about assignment (only if first time being assigned)
      if (!oldAssignedTo && updatedRequest.tenant?.email && process.env.RESEND_API_KEY) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.DEFAULT_FROM_EMAIL,
              to: updatedRequest.tenant.email,
              subject: `Update: ${updatedRequest.title}`,
              html: generateTenantUpdateEmail(
                updatedRequest.tenant.full_name,
                updatedRequest,
                `Your request has been assigned to ${newWorker?.full_name || "a technician"}.`,
                profile.full_name
              ),
            }),
          });
          console.log("✅ Assignment notification sent to tenant");

          // SMS to tenant (only for first assignment)
          if (updatedRequest.tenant.phone && updatedRequest.tenant.sms_notifications) {
            await sendSMS({
              to: formatPhoneNumber(updatedRequest.tenant.phone),
              message: `Good news! Your request "${updatedRequest.title}" has been assigned to ${newWorker?.full_name || "a technician"}.`,
              organizationId: profile.organization_id,
              recipientUserId: updatedRequest.tenant.id,
              messageType: "status_update",
            });
            console.log("✅ Assignment SMS sent to tenant");
          }
        } catch (error) {
          console.error("❌ Tenant assignment notification error:", error);
        }
      }
    }

    // 2. IMPORTANT STATUS CHANGES - Only notify tenant for key milestones
    if (shouldNotifyTenant && statusChanged) {
      console.log(`📧 Sending important status notification: ${updates.status}`);

      const statusMessages = {
        in_progress: `Great news! Work has started on your request.`,
        completed: `Your request has been completed! If you have any concerns, please let us know.`,
      };

      const message = statusMessages[updates.status];

      if (message && updatedRequest.tenant?.email && process.env.RESEND_API_KEY) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.DEFAULT_FROM_EMAIL,
              to: updatedRequest.tenant.email,
              subject: `${updates.status === 'completed' ? '✅ ' : '🔧 '}${updatedRequest.title}`,
              html: generateTenantUpdateEmail(
                updatedRequest.tenant.full_name,
                updatedRequest,
                message,
                profile.full_name
              ),
            }),
          });
          console.log("✅ Status update email sent to tenant");

          // SMS to tenant (only for work started and completed)
          if (updatedRequest.tenant.phone && updatedRequest.tenant.sms_notifications) {
            const smsMessage = updates.status === 'completed' 
              ? `Your request "${updatedRequest.title}" has been completed!`
              : `Work has started on "${updatedRequest.title}". We'll keep you updated!`;

            await sendSMS({
              to: formatPhoneNumber(updatedRequest.tenant.phone),
              message: smsMessage,
              organizationId: profile.organization_id,
              recipientUserId: updatedRequest.tenant.id,
              messageType: "status_update",
            });
            console.log("✅ Status update SMS sent to tenant");
          }
        } catch (error) {
          console.error("❌ Tenant status notification error:", error);
        }
      }
    }

    // 3. Notify worker if someone else completed their request
    if (shouldNotifyWorker && statusChanged && updates.status === 'completed') {
      if (
        updatedRequest.assigned_to_user &&
        updatedRequest.assigned_to_user.email &&
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
              to: updatedRequest.assigned_to_user.email,
              subject: `Completed: ${updatedRequest.title}`,
              html: generateWorkerStatusUpdateEmail(
                updatedRequest.assigned_to_user.full_name,
                updatedRequest,
                oldStatus,
                updates.status,
                profile.full_name
              ),
            }),
          });
          console.log("✅ Completion notification sent to assigned worker");
        } catch (error) {
          console.error("❌ Worker completion notification error:", error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("❌ Request PUT error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update request" },
      { status: 500 }
    );
  }
}

// ========================================
// EMAIL TEMPLATES
// ========================================

function generateWorkerAssignmentEmail(workerName, request, assignedBy) {
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
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; border-radius: 4px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔧 New Assignment</h2>
          </div>
          <div class="content">
            <p>Hi ${workerName},</p>
            
            <p>${assignedBy} has assigned you to a new maintenance request:</p>
            
            <div class="info-box">
              <h3>${request.title}</h3>
              <p><strong>Priority:</strong> <span class="badge" style="background: ${priorityColors[request.priority]}; color: white;">${request.priority.toUpperCase()}</span></p>
              <p><strong>Category:</strong> ${request.category}</p>
              <p><strong>Location:</strong> ${request.property.name} - Unit ${request.unit.unit_number}</p>
              <p><strong>Description:</strong><br>${request.description}</p>
              ${request.location_details ? `<p><strong>Specific Location:</strong> ${request.location_details}</p>` : ""}
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests/${request.id}" class="button">View Request Details</a>
            </p>

            <p>Please review and start work when ready.</p>

            <p>Best regards,<br><strong>Dingy.app Maintenance Team</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateTenantUpdateEmail(tenantName, request, message, updatedBy) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; border-radius: 4px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Request Update</h2>
          </div>
          <div class="content">
            <p>Hi ${tenantName},</p>
            
            <p><strong>${message}</strong></p>
            
            <div class="info-box">
              <h3>${request.title}</h3>
              <p><strong>Location:</strong> ${request.property.name} - Unit ${request.unit.unit_number}</p>
              <p><strong>Status:</strong> ${request.status.replace("_", " ").toUpperCase()}</p>
              ${request.assigned_to_user ? `<p><strong>Assigned to:</strong> ${request.assigned_to_user.full_name}</p>` : ""}
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests/${request.id}" class="button">View Request</a>
            </p>

            <p>Thank you for your patience!</p>

            <p>Best regards,<br><strong>${request.property.name} Management</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateWorkerStatusUpdateEmail(workerName, request, oldStatus, newStatus, updatedBy) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #8b5cf6; margin: 15px 0; border-radius: 4px; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📊 Status Changed</h2>
          </div>
          <div class="content">
            <p>Hi ${workerName},</p>
            
            <p>${updatedBy} has updated the status of a request assigned to you:</p>
            
            <div class="info-box">
              <h3>${request.title}</h3>
              <p><strong>Location:</strong> ${request.property.name} - Unit ${request.unit.unit_number}</p>
              <p><strong>Status Changed:</strong> ${oldStatus.replace("_", " ")} → ${newStatus.replace("_", " ")}</p>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests/${request.id}" class="button">View Request</a>
            </p>

            <p>Best regards,<br><strong>Dingy.app Maintenance Team</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;
}