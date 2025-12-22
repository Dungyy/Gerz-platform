import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, full_name, phone, specialties, organization_id } = await request.json()

    // Get current user from auth header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'owner' && profile.role !== 'manager')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Use profile's org_id if not provided
    const orgId = organization_id || profile.organization_id

    if (orgId !== profile.organization_id) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 403 })
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
        role: 'staff',
      }
    })

    if (createAuthError) throw createAuthError

    const staffUserId = authData.user.id

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: staffUserId,
        organization_id: orgId,
        full_name,
        email,
        phone: phone || null,
        role: 'staff',
      })

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(staffUserId)
      throw profileError
    }

    // Create maintenance_staff entry
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('maintenance_staff')
      .insert({
        profile_id: staffUserId,
        organization_id: orgId,
        specialties: specialties || [],
      })
      .select()
      .single()

    if (staffError) {
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(staffUserId)
      await supabaseAdmin.from('profiles').delete().eq('id', staffUserId)
      throw staffError
    }

    // TODO: Send welcome email with credentials

    return NextResponse.json({ 
      success: true, 
      staff: staffData,
      message: 'Staff member added successfully'
    })

  } catch (error) {
    console.error('Staff API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add staff member' },
      { status: 500 }
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

    const { data: staff } = await supabaseAdmin
      .from('maintenance_staff')
      .select(`
        *,
        profile:profiles(full_name, email, phone)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    return NextResponse.json(staff || [])

  } catch (error) {
    console.error('Staff GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}