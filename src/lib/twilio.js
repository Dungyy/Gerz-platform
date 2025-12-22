import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

let client = null

if (accountSid && authToken) {
  client = twilio(accountSid, authToken)
}

export async function sendSMS({ to, message, organizationId, recipientUserId, messageType }) {
  if (!client) {
    console.error('Twilio not configured')
    return { success: false, error: 'SMS service not configured' }
  }

  try {
    // Send SMS via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: to,
    })

    // Log to database
    if (organizationId) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      await supabase.from('sms_logs').insert({
        organization_id: organizationId,
        recipient_phone: to,
        recipient_user_id: recipientUserId,
        message_type: messageType || 'general',
        message_body: message,
        status: 'sent',
        twilio_sid: twilioMessage.sid,
      })
    }

    return { 
      success: true, 
      sid: twilioMessage.sid,
      status: twilioMessage.status 
    }
  } catch (error) {
    console.error('Twilio error:', error)

    // Log failed attempt
    if (organizationId) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      await supabase.from('sms_logs').insert({
        organization_id: organizationId,
        recipient_phone: to,
        recipient_user_id: recipientUserId,
        message_type: messageType || 'general',
        message_body: message,
        status: 'failed',
        error_message: error.message,
      })
    }

    return { success: false, error: error.message }
  }
}

export function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Add +1 for US numbers if not present
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }
  
  // Already has country code
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+${cleaned}`
  }
  
  // Has country code
  if (phone.startsWith('+')) {
    return phone
  }
  
  return `+${cleaned}`
}