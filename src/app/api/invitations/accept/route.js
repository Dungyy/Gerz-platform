import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { token, email, password, full_name } = await request.json()

    if (!token || !email || !password || !full_name) {
      return NextResponse.json({ 
        error: 'All fields are required' 
      }, { status: 400 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 400 })
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Email does not match invitation' 
      }, { status: 400 })
    }

    // Create user account
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name
      }
    })

    if (signUpError) {
      console.error('Sign up error:', signUpError)
      return NextResponse.json({ 
        error: signUpError.message || 'Failed to create account' 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ 
        error: 'Failed to create user' 
      }, { status: 500 })
    }

    // Create profile with organization
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role: invitation.role,
        organization_id: invitation.organization_id
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ 
        error: 'Failed to create profile' 
      }, { status: 500 })
    }

    // If tenant with unit assignment, assign to unit
    if (invitation.role === 'tenant' && invitation.unit_id) {
      const { error: unitError } = await supabaseAdmin
        .from('units')
        .update({ tenant_id: authData.user.id })
        .eq('id', invitation.unit_id)

      if (unitError) {
        console.error('Unit assignment error:', unitError)
        // Don't fail - they can be assigned later
      }
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully'
    })

  } catch (error) {
    console.error('❌ Accept invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

// Validate invitation token (for pre-filling form)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select(`
        *,
        property:properties(name),
        unit:units(unit_number)
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 400 })
    }

    return NextResponse.json(invitation)

  } catch (error) {
        console.error('❌ Validate invitation error:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to validate invitation' },
          { status: 500 }
        )
      }
    }
