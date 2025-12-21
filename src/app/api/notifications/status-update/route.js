import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  const { requestId, status } = await request.json()
  const supabase = createServerClient()

  const { data: maintenanceRequest } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:profiles!maintenance_requests_tenant_id_fkey(*)
    `)
    .eq('id', requestId)
    .single()

  if (!maintenanceRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const tenant = maintenanceRequest.tenant

  try {
    await resend.emails.send({
      from: `Gerz <notifications@${process.env.EMAIL_DOMAIN || 'gerz.app'}>`,
      to: tenant.email,
      subject: `Maintenance Request Update - ${maintenanceRequest.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Maintenance Request Updated</h2>
          
          <p>Hi ${tenant.full_name},</p>
          
          <p>Your maintenance request has been updated:</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${maintenanceRequest.title}</h3>
            <p><strong>Status:</strong> <span style="color: ${getStatusColor(status)}; font-weight: bold;">${status.replace('_', ' ').toUpperCase()}</span></p>
            <p><strong>Unit:</strong> ${maintenanceRequest.unit.unit_number}</p>
          </div>

          ${status === 'completed' && maintenanceRequest.resolution_notes ? `
            <p><strong>Resolution:</strong> ${maintenanceRequest.resolution_notes}</p>
          ` : ''}

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${requestId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Request Details
          </a>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getStatusColor(status) {
  const colors = {
    submitted: '#6b7280',
    assigned: '#3b82f6',
    in_progress: '#f59e0b',
    completed: '#10b981',
    cancelled: '#ef4444'
  }
  return colors[status] || '#6b7280'
}