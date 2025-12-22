import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, formatPhoneNumber } from '@/lib/twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { user_id, message_type, custom_message, request_data } = await request.json()

    // Get user and preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        *,
        preferences:notification_preferences(*)
      `)
      .eq('id', user_id)
      .single()

    if (!profile || !profile.phone) {
      return NextResponse.json({ error: 'User has no phone number' }, { status: 400 })
    }

    if (!profile.sms_notifications) {
      return NextResponse.json({ error: 'User has SMS disabled' }, { status: 400 })
    }

    // Check if this notification type is enabled
    const preferences = profile.preferences?.[0]
    if (preferences) {
      if (message_type === 'new_request' && !preferences.sms_new_request) {
        return NextResponse.json({ success: false, message: 'SMS disabled for this type' })
      }
      if (message_type === 'status_update' && !preferences.sms_status_update) {
        return NextResponse.json({ success: false, message: 'SMS disabled for this type' })
      }
      if (message_type === 'assignment' && !preferences.sms_assignment) {
        return NextResponse.json({ success: false, message: 'SMS disabled for this type' })
      }
      if (message_type === 'emergency' && !preferences.sms_emergency) {
        return NextResponse.json({ success: false, message: 'SMS disabled for this type' })
      }
    }

    // Generate message based on type
    let message = custom_message

    if (!message && request_data) {
      message = generateMessage(message_type, request_data, profile.full_name)
    }

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Send SMS
    const result = await sendSMS({
      to: formatPhoneNumber(profile.phone),
      message,
      organizationId: profile.organization_id,
      recipientUserId: user_id,
      messageType: message_type,
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('SMS notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}

function generateMessage(type, data, userName) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  switch (type) {
    case 'status_update':
      return `Hi ${userName}, your maintenance request "${data.title}" status changed to ${data.status.replace('_', ' ')}. View: ${appUrl}/dashboard/requests/${data.id}`

    case 'assignment':
      return `Hi ${userName}, your request "${data.title}" has been assigned to ${data.assigned_to_name}. They'll contact you soon.`

    case 'emergency':
      return `URGENT: New emergency request - "${data.title}" at ${data.property} Unit ${data.unit}. View: ${appUrl}/dashboard/requests/${data.id}`

    case 'new_request':
      return `New maintenance request from ${data.tenant_name} at ${data.property} Unit ${data.unit}: "${data.title}". View: ${appUrl}/dashboard/requests/${data.id}`

    case 'comment':
      return `New comment on your request "${data.title}". View: ${appUrl}/dashboard/requests/${data.id}`

    default:
      return data.message || 'You have a new notification. Check the Gerz app for details.'
  }
}