import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, formatPhoneNumber } from '@/lib/twilio'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, full_name, phone, unit_id, send_sms } = await request.json()

    console.log('📧 Starting tenant invitation for:', email)

    // Get current user from auth header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    // Verify user
    const { data: { user: manager }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !manager) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // Get manager's profile
    const { data: managerProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role, organization:organizations(name)')
      .eq('id', manager.id)
      .single()

    if (!managerProfile || (managerProfile.role !== 'owner' && managerProfile.role !== 'manager')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    console.log('👤 Manager org:', managerProfile.organization.name)

    // Get unit details
    const { data: unit } = await supabaseAdmin
      .from('units')
      .select('unit_number, property:properties(name, address)')
      .eq('id', unit_id)
      .single()

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    console.log('🏠 Unit:', unit.property.name, 'Unit', unit.unit_number)

    // ✅ USE SUPABASE INVITE (Best method for new users)
    console.log('📨 Creating user invite...')
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          invited_by: manager.id,
          organization_id: managerProfile.organization_id,
        },
        redirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`
      }
    )

    if (inviteError) {
      console.error('❌ Invite error:', inviteError)
      throw inviteError
    }

    const userId = inviteData.user.id
    console.log('✅ Invite created, user ID:', userId)

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        organization_id: managerProfile.organization_id,
        full_name,
        email,
        phone: phone ? formatPhoneNumber(phone) : null,
        role: 'tenant',
        sms_notifications: !!phone,
      })

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw profileError
    }

    console.log('✅ Profile created')

    // Assign to unit
    const { error: unitError } = await supabaseAdmin
      .from('units')
      .update({ tenant_id: userId })
      .eq('id', unit_id)

    if (unitError) {
      console.error('❌ Unit assignment error:', unitError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      throw unitError
    }

    console.log('✅ Unit assigned')

    // Create notification preferences
    await supabaseAdmin.from('notification_preferences').insert({
      user_id: userId,
      sms_new_request: false,
      sms_status_update: !!phone,
      sms_emergency: !!phone,
    })

    // Supabase automatically sends invite email
    // We can send a custom welcome email too if desired
    if (process.env.RESEND_API_KEY) {
      console.log('📧 Sending custom welcome email...')
      
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.DEFAULT_FROM_EMAIL || `noreply@yourdomain.com`,
            to: email,
            subject: `Welcome to ${managerProfile.organization.name}`,
            html: generateWelcomeEmail(
              full_name, 
              managerProfile.organization.name, 
              unit
            ),
          }),
        })

        if (emailResponse.ok) {
          console.log('✅ Custom email sent')
        } else {
          const errorText = await emailResponse.text()
          console.error('❌ Email send failed:', errorText)
        }
      } catch (emailError) {
        console.error('❌ Email error:', emailError)
      }
    }

    // ✅ SEND SMS IF REQUESTED
    if (phone && send_sms) {
      console.log('📱 Sending SMS to:', phone)
      
      const smsMessage = `Welcome to ${managerProfile.organization.name}! Your account for Unit ${unit.unit_number} at ${unit.property.name} is ready. Check your email (${email}) to complete setup and set your password. - Gerz`

      try {
        const smsResult = await sendSMS({
          to: formatPhoneNumber(phone),
          message: smsMessage,
          organizationId: managerProfile.organization_id,
          recipientUserId: userId,
          messageType: 'invitation',
        })

        if (smsResult.success) {
          console.log('✅ SMS sent successfully')
        } else {
          console.error('❌ SMS failed:', smsResult.error)
        }
      } catch (smsError) {
        console.error('❌ SMS error:', smsError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      user_id: userId,
      message: 'Tenant invited successfully',
      email_sent: true, // Supabase sends automatically
      sms_sent: !!(phone && send_sms),
    })

  } catch (error) {
    console.error('❌ Tenant invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to invite tenant' },
      { status: 400 }
    )
  }
}

// Email template - friendly welcome message
function generateWelcomeEmail(fullName, orgName, unit) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
          }
          .header { 
            background: #2563eb; 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content { 
            background: #f9fafb; 
            padding: 30px; 
            border-radius: 0 0 8px 8px; 
          }
          .info-box { 
            background: white; 
            padding: 15px; 
            border-left: 4px solid #2563eb; 
            margin: 20px 0; 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #6b7280; 
            font-size: 14px; 
          }
          ul {
            padding-left: 20px;
          }
          ul li {
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${orgName}!</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>Your property manager has set up an account for you on our maintenance request platform.</p>
            
            <div class="info-box">
              <strong>📍 Your Unit:</strong><br>
              ${unit.property.name} - Unit ${unit.unit_number}<br>
              ${unit.property.address}
            </div>

            <p><strong>📧 Check your email inbox</strong> for a separate message from our system with the subject <strong>"Confirm your signup"</strong>. Click the link in that email to set your password.</p>

            <p style="background: #fef3c7; padding: 10px; border-radius: 4px; border-left: 4px solid #f59e0b;">
              <strong>⚠️ Note:</strong> If you don't see the email, please check your spam/junk folder!
            </p>

            <p><strong>Once you're set up, you'll be able to:</strong></p>
            <ul>
              <li>Submit maintenance requests 24/7</li>
              <li>Track request status in real-time</li>
              <li>Upload photos of issues</li>
              <li>Communicate with maintenance staff</li>
              <li>View your request history</li>
            </ul>

            <p>If you have any questions, please contact your property manager.</p>

            <p>Best regards,<br><strong>${orgName}</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated welcome message.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function GET(request) {
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { data: tenants } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        unit:units!units_tenant_id_fkey(
          id,
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('organization_id', profile.organization_id)
      .eq('role', 'tenant')
      .order('full_name')

    return NextResponse.json(tenants || [])

  } catch (error) {
    console.error('Tenants GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}