import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, formatPhoneNumber } from '@/lib/twilio'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================
// GET - Fetch single maintenance request
// ============================================
export async function GET(request, context) {
  try {
    console.log('📥 GET request for maintenance request')

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      console.error('❌ No authorization token')
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Invalid token:', authError)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    console.log('✅ Authenticated user:', user.email)

    const params = await context.params
    const requestId = params.id

    console.log('🔍 Fetching request ID:', requestId)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('👤 User role:', profile.role, '| Org:', profile.organization_id)

    const { data: maintenanceRequest, error: requestError } = await supabaseAdmin
      .from('maintenance_requests')
      .select(`
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(
          id,
          full_name, 
          email, 
          phone
        ),
        property:properties(
          id, 
          name, 
          address, 
          city, 
          state, 
          zip,
          manager_id
        ),
        unit:units(
          id, 
          unit_number
        ),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(
          id, 
          full_name, 
          email, 
          phone
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError) {
      console.error('❌ Request fetch error:', requestError)
      
      if (requestError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      
      return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    if (!maintenanceRequest) {
      console.error('❌ Request not found')
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    console.log('📄 Request found:', maintenanceRequest.title)

    // ✅ AUTHORIZATION CHECKS
    let authorized = false

    if (profile.role === 'owner' || profile.role === 'manager') {
      authorized = maintenanceRequest.organization_id === profile.organization_id
      console.log('🔐 Manager/Owner check:', authorized ? '✅ Authorized' : '❌ Denied')
      
    } else if (profile.role === 'worker') {
      authorized = maintenanceRequest.organization_id === profile.organization_id
      console.log('🔐 Worker check:', authorized ? '✅ Authorized' : '❌ Denied')
      
    } else if (profile.role === 'tenant') {
      authorized = maintenanceRequest.tenant_id === user.id
      console.log('🔐 Tenant check:', authorized ? '✅ Authorized (own request)' : '❌ Denied')
      
    } else {
      console.error('❌ Unknown role:', profile.role)
    }

    if (!authorized) {
      console.error('❌ Authorization failed')
      return NextResponse.json({ 
        error: 'Unauthorized - You do not have permission to view this request' 
      }, { status: 403 })
    }

    console.log('✅ Authorization passed')

    return NextResponse.json(maintenanceRequest)

  } catch (error) {
    console.error('❌ Maintenance request GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch maintenance request' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - Update maintenance request
// ============================================
export async function PUT(request, context) {
  try {
    const updates = await request.json()
    
    console.log('📥 PUT request for maintenance request:', updates)

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const requestId = params.id

    console.log('🔄 Updating request ID:', requestId)

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('👤 User:', profile.full_name, '(', profile.role, ')')

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

    // ✅ AUTHORIZATION CHECK
    const canUpdate = 
      profile.role === 'owner' ||
      profile.role === 'manager' ||
      (profile.role === 'worker' && currentRequest.organization_id === profile.organization_id)

    if (!canUpdate) {
      console.error('❌ Update authorization failed')
      return NextResponse.json({ 
        error: 'Unauthorized - Insufficient permissions to update this request' 
      }, { status: 403 })
    }

    console.log('✅ Update authorization passed')

    // ✅ HANDLE SELF-ASSIGNMENT
    if (updates.assigned_to === user.id && currentRequest.assigned_to !== user.id) {
      console.log('🙋 Self-assignment detected')
      if (currentRequest.status === 'submitted') {
        updates.status = 'assigned'
      }
    }

    // Add completion tracking
    if (updates.status === 'completed' && currentRequest.status !== 'completed') {
      updates.completed_at = new Date().toISOString()
      updates.completed_by = user.id
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('maintenance_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select(`
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email, phone, sms_notifications),
        assigned_to_user:profiles!maintenance_requests_assigned_to_fkey(id, full_name, email, phone, sms_notifications),
        property:properties(id, name, address, city, state),
        unit:units(id, unit_number)
      `)
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log('✅ Request updated successfully')

    // ✅ NOTIFICATIONS
    if (updates.assigned_to && updates.assigned_to !== currentRequest.assigned_to) {
      const worker = updatedRequest.assigned_to_user
      const isSelfAssignment = updates.assigned_to === user.id
      
      if (worker?.email && process.env.RESEND_API_KEY && !isSelfAssignment) {
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
              html: generateWorkerAssignmentEmail(
                worker.full_name, 
                updatedRequest,
                profile.full_name
              ),
            }),
          })

          if (worker.phone && worker.sms_notifications) {
            await sendSMS({
              to: formatPhoneNumber(worker.phone),
              message: `You've been assigned a ${updatedRequest.priority} priority maintenance request by ${profile.full_name}: ${updatedRequest.title}. Check your dashboard for details.`,
              organizationId: profile.organization_id,
              recipientUserId: worker.id,
              messageType: 'new_request',
            })
          }

          console.log('✅ Worker notification sent')
        } catch (err) {
          console.error('❌ Worker notification error:', err)
        }
      }

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
              subject: `Worker Assigned to Your Request: ${updatedRequest.title}`,
              html: generateTenantAssignmentEmail(
                tenant.full_name,
                updatedRequest,
                worker.full_name
              ),
            }),
          })

          if (tenant.phone && tenant.sms_notifications) {
            await sendSMS({
              to: formatPhoneNumber(tenant.phone),
              message: `Your maintenance request has been assigned to ${worker.full_name}. They will be in touch soon.`,
              organizationId: profile.organization_id,
              recipientUserId: currentRequest.tenant_id,
              messageType: 'status_update',
            })
          }

          console.log('✅ Tenant assignment notification sent')
        } catch (err) {
          console.error('❌ Tenant notification error:', err)
        }
      }
    }

    if (updates.status && updates.status !== currentRequest.status && updates.status !== 'assigned') {
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
              html: generateStatusUpdateEmail(
                tenant.full_name, 
                updatedRequest, 
                currentRequest.status,
                profile.full_name
              ),
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

          console.log('✅ Status update notification sent')
        } catch (err) {
          console.error('❌ Status notification error:', err)
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      request: updatedRequest,
      self_assigned: updates.assigned_to === user.id
    })

  } catch (error) {
    console.error('❌ Request PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update request' },
      { status: 500 }
    )
  }
}

function generateWorkerAssignmentEmail(workerName, request, assignerName) {
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
            
            <p><strong>${assignerName}</strong> has assigned a maintenance request to you:</p>
            
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

function generateTenantAssignmentEmail(tenantName, request, workerName) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
            <h2>Worker Assigned to Your Request</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px;">
            <p>Hi ${tenantName},</p>
            
            <p>Good news! A maintenance worker has been assigned to your request:</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">
              <h3>${request.title}</h3>
              <p><strong>Assigned to:</strong> ${workerName}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Assigned</span></p>
            </div>

            <p>${workerName} will be handling your request and will be in touch soon if needed.</p>

            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${request.id}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Track Your Request</a></p>

            <p>Thank you for your patience!</p>

            <p>Best regards,<br><strong>Gerz Maintenance Team</strong></p>
          </div>
        </div>
      </body>
    </html>
  `
}

function generateStatusUpdateEmail(tenantName, request, oldStatus, updatedBy) {
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
            
            <p>Your maintenance request status has been updated by <strong>${updatedBy}</strong>:</p>
            
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