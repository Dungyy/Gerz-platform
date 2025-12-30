import { supabase } from "@/lib/supabase";

/**
 * Log an activity to the activity_logs table
 * @param {Object} params - Activity log parameters
 * @param {string} params.action - Main action description (e.g., "Created maintenance request")
 * @param {Object} params.details - Additional details as JSON (optional)
 * @param {string} params.request_id - ID of related maintenance request (optional)
 */
export async function logActivity({ action, details = null, request_id = null }) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("Cannot log activity: No authenticated user");
      return null;
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      console.warn("Cannot log activity: Profile not found");
      return null;
    }

    // Insert activity log
    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action,
        details,
        request_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging activity:", error);
      return null;
    }

    console.log("✅ Activity logged:", action);
    return data;
  } catch (error) {
    console.error("Error in logActivity:", error);
    return null;
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example 1: Log maintenance request creation
 */
/*
import { logActivity } from "@/lib/activity-logger";

await logActivity({
  action: "Created maintenance request",
  details: { 
    title: "Kitchen faucet leaking",
    priority: "high",
    property_name: "Sunset Apartments"
  },
  request_id: newRequest.id,
});
*/

/**
 * Example 2: Log status change
 */
/*
await logActivity({
  action: "Updated request status",
  details: { 
    old_status: "submitted",
    new_status: "in_progress"
  },
  request_id: requestId,
});
*/

/**
 * Example 3: Log worker assignment
 */
/*
await logActivity({
  action: "Assigned worker to request",
  details: { 
    worker_name: "John Doe",
    worker_email: "john@example.com"
  },
  request_id: requestId,
});
*/

/**
 * Example 4: Log comment addition
 */
/*
await logActivity({
  action: "Added comment",
  details: { 
    comment_type: "internal_note",
    comment_preview: "Scheduled for tomorrow..."
  },
  request_id: requestId,
});
*/

/**
 * Example 5: Log tenant invitation
 */
/*
await logActivity({
  action: "Invited tenant",
  details: { 
    tenant_name: "Jane Smith",
    tenant_email: "jane@example.com",
    unit_number: "101"
  },
});
*/

/**
 * Example 6: Log property creation
 */
/*
await logActivity({
  action: "Created property",
  details: { 
    property_name: "Sunset Apartments",
    address: "123 Main St",
    units_count: 50
  },
});
*/

/**
 * Example 7: Log user removal
 */
/*
await logActivity({
  action: "Removed user",
  details: { 
    user_name: "Bob Johnson",
    user_role: "worker",
    reason: "Contract ended"
  },
});
*/

/**
 * Example 8: Log request completion
 */
/*
await logActivity({
  action: "Completed maintenance request",
  details: { 
    title: "Fix broken AC",
    completion_notes: "Replaced compressor",
    time_spent: "2 hours"
  },
  request_id: requestId,
});
*/