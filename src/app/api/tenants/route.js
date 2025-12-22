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

    // Get unit details
    const { data: unit } = await supabaseAdmin
      .from('units')
      .select('unit_number, property:properties(name, address)')
      .eq('id', unit_id)
      .single()

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!'

    // Create auth user
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        invited_by: manager.id,
        organization_id: managerProfile.organization_id,
      }
    })

    if (createAuthError) throw createAuthError

    const userId = authData.user.id

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
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw profileError
    }

    // Assign to unit
    const { error: unitError } = await supabaseAdmin
      .from('units')
      .update({ tenant_id: userId })
      .eq('id', unit_id)

    if (unitError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      throw unitError
    }

    // Create notification preferences
    await supabaseAdmin.from('notification_preferences').insert({
      user_id: userId,
      sms_new_request: false,
      sms_status_update: !!phone,
      sms_emergency: !!phone,
    })

    // Generate magic link
    const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    const setupLink = resetData?.properties?.action_link || 
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password?email=${email}`

    // Send Email (if Resend configured)
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${managerProfile.organization.name} <noreply@yourdomain.com>`,
            to: email,
            subject: `Welcome to ${managerProfile.organization.name}`,
            html: `<p>Hi ${full_name},</p><p>Your account is ready! <a href="${setupLink}">Set your password</a></p>`,
          }),
        })
      } catch (emailError) {
        console.error('Email error:', emailError)
      }
    }

    // Send SMS if requested
    if (phone && send_sms) {
      const smsMessage = `Welcome to ${managerProfile.organization.name}! Your account for Unit ${unit.unit_number} is ready. Check your email (${email}) to set your password.`

      await sendSMS({
        to: formatPhoneNumber(phone),
        message: smsMessage,
        organizationId: managerProfile.organization_id,
        recipientUserId: userId,
        messageType: 'invitation',
      })
    }

    return NextResponse.json({ 
      success: true, 
      user_id: userId,
      message: 'Tenant invited successfully',
      sms_sent: !!phone && send_sms,
    })

  } catch (error) {
    console.error('Tenant invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to invite tenant' },
      { status: 400 }
    )
  }
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