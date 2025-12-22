import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - List tenants
export async function GET() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: tenants, error } = await supabase
    .from('profiles')
    .select(`
      *,
      unit:units!units_tenant_id_fkey(
        id,
        unit_number,
        property:properties(id, name, address)
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('role', 'tenant')
    .order('full_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(tenants)
}

// POST - Create tenant (invite)
export async function POST(request) {
  try {
    const { email, full_name, phone, unit_id } = await request.json()

    // Get current user (manager)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    const { data: { user: manager } } = await supabase.auth.getUser(token)
    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get manager's organization
    const { data: managerProfile } = await supabase
      .from('profiles')
      .select('organization_id, organization:organizations(name)')
      .eq('id', manager.id)
      .single()

    // Get unit details
    const { data: unit } = await supabase
      .from('units')
      .select('unit_number, property:properties(name, address)')
      .eq('id', unit_id)
      .single()

    // Generate a random temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!'

    // Step 1: Create auth user with temporary password
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        invited_by: manager.id,
        organization_id: managerProfile.organization_id,
      }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // Step 2: Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        organization_id: managerProfile.organization_id,
        full_name,
        email,
        phone,
        role: 'tenant',
      })

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId)
      throw profileError
    }

    // Step 3: Assign to unit
    const { error: unitError } = await supabase
      .from('units')
      .update({ tenant_id: userId })
      .eq('id', unit_id)

    if (unitError) {
      // Cleanup
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('profiles').delete().eq('id', userId)
      throw unitError
    }

    // Step 4: Generate password reset token
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    // Step 5: Send welcome email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${managerProfile.organization.name} <noreply@${process.env.EMAIL_DOMAIN}>`,
        to: email,
        subject: `Welcome to ${managerProfile.organization.name} - Set Your Password`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to ${managerProfile.organization.name}!</h1>
                </div>
                <div class="content">
                  <p>Hi ${full_name},</p>
                  
                  <p>Your property manager has created an account for you on our maintenance request platform.</p>
                  
                  <div class="info-box">
                    <strong>Your Unit:</strong><br>
                    ${unit.property.name} - Unit ${unit.unit_number}<br>
                    ${unit.property.address}
                  </div>

                  <p>To get started, click the button below to set your password and access your account:</p>
                  
                  <div style="text-align: center;">
                    <a href="${resetData?.properties?.action_link || process.env.NEXT_PUBLIC_APP_URL + '/auth/set-password?email=' + email}" class="button">
                      Set Your Password
                    </a>
                  </div>

                  <p>Once you're logged in, you can:</p>
                  <ul>
                    <li>Submit maintenance requests 24/7</li>
                    <li>Track the status of your requests</li>
                    <li>Upload photos of issues</li>
                    <li>Communicate with maintenance staff</li>
                  </ul>

                  <p>If you have any questions, please contact your property manager.</p>

                  <p>Best regards,<br>${managerProfile.organization.name}</p>
                </div>
                <div class="footer">
                  <p>This is an automated email. Please do not reply.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text())
    }

    return NextResponse.json({ 
      success: true, 
      user_id: userId,
      message: 'Tenant invited successfully. They will receive an email to set their password.'
    })

  } catch (error) {
    console.error('Tenant invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to invite tenant' },
      { status: 400 }
    )
  }
}
