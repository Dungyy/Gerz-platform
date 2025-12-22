import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, context) {
  try {
    // ✅ Await params in Next.js 15+
    const { id } = await context.params

    console.log('📦 Fetching staff member:', id)

    // Get auth token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    console.log('👤 User org:', profile.organization_id)

    // Get staff member
    const { data: staffMember, error } = await supabaseAdmin
      .from('maintenance_staff')
      .select(`
        *,
        profile:profiles(full_name, email, phone, created_at)
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error) {
      console.error('❌ Staff fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    console.log('✅ Staff member found:', staffMember.profile?.full_name)

    return NextResponse.json(staffMember)

  } catch (error) {
    console.error('❌ Staff detail error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staff member' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  try {
    // ✅ Await params in Next.js 15+
    const { id } = await context.params

    console.log('🗑️ Deleting staff member:', id)

    // Get auth token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profile.role !== 'owner' && profile.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get staff member to get profile_id
    const { data: staffMember } = await supabaseAdmin
      .from('maintenance_staff')
      .select('profile_id, organization_id')
      .eq('id', id)
      .single()

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    if (staffMember.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete staff record
    const { error: deleteError } = await supabaseAdmin
      .from('maintenance_staff')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Delete staff error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    console.log('✅ Staff member deleted')

    // Optionally delete the auth user too
    // await supabaseAdmin.auth.admin.deleteUser(staffMember.profile_id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Staff delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete staff member' },
      { status: 500 }
    )
  }
}