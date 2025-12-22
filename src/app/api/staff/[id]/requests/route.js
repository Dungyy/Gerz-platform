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

    console.log('📦 Fetching requests for staff:', id)

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

    // Get staff member
    const { data: staffMember } = await supabaseAdmin
      .from('maintenance_staff')
      .select('profile_id, organization_id')
      .eq('id', id)
      .single()

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    console.log('👤 Staff profile_id:', staffMember.profile_id)

    // Get assigned requests
    const { data: requests, error } = await supabaseAdmin
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(name),
        unit:units(unit_number),
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name)
      `)
      .eq('assigned_to', staffMember.profile_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Requests fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Found', requests?.length || 0, 'requests')

    return NextResponse.json(requests || [])

  } catch (error) {
    console.error('❌ Staff requests error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}