import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, formatPhoneNumber } from '@/lib/twilio'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, context) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: requestId } = await context.params

    const { data: maintenanceRequest, error } = await supabaseAdmin
      .from('maintenance_requests')
      .select(`
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email, phone),
        property:properties(id, name, address, city, state, zip),
        unit:units(id, unit_number),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(id, full_name, email, phone)
      `)
      .eq('id', requestId)
      .single()

    if (error || !maintenanceRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json(maintenanceRequest)

  } catch (error) {
    console.error('❌ Request GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch request' },
      { status: 500 }
    )
  }
}

export async function PUT(request, context) {
  try {
    const updates = await request.json()
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: requestId } = await context.params

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role, full_name')
      .eq('id', user.id)
      .single()

    // Get current request
    const { data: currentRequest } = await supabaseAdmin
      .from('maintenance_requests')
      .select(`
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email, phone, sms_notifications)
      `)
      .eq('id', requestId)
      .single()

    if (!currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Authorization check
    const canUpdate = 
      profile.role === 'owner' ||
      profile.role === 'manager' ||
      (profile.role === 'worker' && currentRequest.assigned_to === user.id)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('maintenance_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select(`
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email, phone),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(id, full_name, email, phone, sms_notifications)
      `)
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log('✅ Request updated by:', profile.full_name)

    // Send notifications based on what changed
    
    // 1. If assigned to a worker
    if (updates.assigned_to && updates.assigned_to !== currentRequest.assigned_to) {
      const worker = updatedRequest.assigned_to_user
      
      if (worker?.email && process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.DEFAULT_FROM_EMAIL,
              to: worker.email,
              subject: `New Request Assigned: ${updatedRequest.title}`,
              html: generateWorkerAssignmentEmail(worker.full_name, updatedRequest),
            }),
          })

          if (worker.phone && worker.sms_notifications) {
            await sendSMS({
              to: formatPhoneNumber(worker.phone),
              message: `You've been assigned a ${updatedRequest.priority} priority maintenance request: ${updatedRequest.title}. Check your dashboard for details.`,
              organizationId: profile.organization_id,
              recipientUserId: worker.id,
              messageType: 'new_request',
            })
          }
        } catch (err) {
          console.error('❌ Worker notification error:', err)
        }
      }
    }

    // 2. If status changed, notify tenant
    if (updates.status && updates.status !== currentRequest.status) {
      const tenant = currentRequest.tenant
      
      if (tenant?.email && process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.DEFAULT_FROM_EMAIL,
              to: tenant.email,
              subject: `Status Update: ${updatedRequest.title}`,
              html: generateStatusUpdateEmail(tenant.full_name, updatedRequest, currentRequest.status),
            }),
          })

          if (tenant.phone && tenant.sms_notifications) {
            await sendSMS({
              to: formatPhoneNumber(tenant.phone),
              message: `Your maintenance request status updated to: ${updates.status.replace('_', ' ')}. Request: ${updatedRequest.title}`,
              organizationId: profile.organization_id,
              recipientUserId: currentRequest.tenant_id,
              messageType: 'status_update',
            })
          }
        } catch (err) {
          console.error('❌ Tenant notification error:', err)
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      request: updatedRequest 
    })

  } catch (error) {
    console.error('❌ Request PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update request' },
      { status: 500 }
    )
  }
}

function generateWorkerAssignmentEmail(workerName, request) {
  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    emergency: '#dc2626'
  }

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h2>New Request Assigned to You</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px;">
            <p>Hi ${workerName},</p>
            
            <p>A new maintenance request has been assigned to you:</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
              <h3>${request.title}</h3>
              <p><strong>Priority:</strong> <span style="background: ${priorityColors[request.priority]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${request.priority.toUpperCase()}</span></p>
              <p><strong>Category:</strong> ${request.category}</p>
              <p><strong>Location:</strong> ${request.property?.name} - Unit ${request.unit?.unit_number}</p>
              <p><strong>Description:</strong><br>${request.description}</p>
            </div>

            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${request.id}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Request</a></p>

            <p>Please review and update the status accordingly.</p>

            <p>Thank you,<br><strong>Gerz Maintenance</strong></p>
          </div>
        </div>
      </body>
    </html>
  `
}

function generateStatusUpdateEmail(tenantName, request, oldStatus) {
  const statusLabels = {
    submitted: 'Submitted',
    assigned: 'Assigned to Worker',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
            <h2>Request Status Updated</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px;">
            <p>Hi ${tenantName},</p>
            
            <p>Your maintenance request status has been updated:</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">
              <h3>${request.title}</h3>
              <p><strong>Previous Status:</strong> ${statusLabels[oldStatus]}</p>
              <p><strong>New Status:</strong> <span style="color: #10b981; font-weight: bold;">${statusLabels[request.status]}</span></p>
            </div>

            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${request.id}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Request</a></p>

            <p>Thank you for your patience.</p>

            <p>Best regards,<br><strong>Gerz Maintenance Team</strong></p>
          </div>
        </div>
      </body>
    </html>
  `
}