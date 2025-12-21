import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  const { requestId } = await request.json()
  const supabase = createServerClient()

  // Fetch request details
  const { data: maintenanceRequest } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(
        *,
        manager:profiles!properties_manager_id_fkey(*)
      ),
      unit:units(*),
      tenant:profiles!maintenance_requests_tenant_id_fkey(*),
      organization:organizations(*)
    `)
    .eq('id', requestId)
    .single()

  if (!maintenanceRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const manager = maintenanceRequest.property.manager
  const tenant = maintenanceRequest.tenant

  // Send email to manager
  try {
    await resend.emails.send({
      from: `Gerz <notifications@${process.env.EMAIL_DOMAIN || 'gerz.app'}>`,
      to: manager.email,
      subject: `New Maintenance Request - ${maintenanceRequest.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Maintenance Request</h2>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Property:</strong> ${maintenanceRequest.property.name}</p>
            <p><strong>Unit:</strong> ${maintenanceRequest.unit.unit_number}</p>
            <p><strong>Tenant:</strong> ${tenant.full_name}</p>
            <p><strong>Category:</strong> ${maintenanceRequest.category}</p>
            <p><strong>Priority:</strong> <span style="color: ${getPriorityColor(maintenanceRequest.priority)}; font-weight: bold;">${maintenanceRequest.priority.toUpperCase()}</span></p>
          </div>

          <h3>${maintenanceRequest.title}</h3>
          <p>${maintenanceRequest.description || 'No description provided'}</p>

          ${maintenanceRequest.photo_urls && maintenanceRequest.photo_urls.length > 0 ? `
            <p><strong>Photos attached:</strong> ${maintenanceRequest.photo_urls.length}</p>
          ` : ''}

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${requestId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Request
          </a>

          <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">
            You're receiving this because you're the property manager for ${maintenanceRequest.property.name}.
          </p>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getPriorityColor(priority) {
  const colors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    emergency: '#dc2626'
  }
  return colors[priority] || '#6b7280'
}