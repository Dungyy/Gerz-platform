import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getToken(request) {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '')
}

export async function GET(request, ctx) {
  try {
    // ✅ Next 15: params may be a Promise
    const { id: staffId } = await ctx.params

    if (!staffId || staffId === 'undefined') {
      return NextResponse.json({ error: 'Missing staff id' }, { status: 400 })
    }

    const token = getToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // requester org
    const { data: requesterProfile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (pErr) throw pErr

    // staff row (to get profile_id + org)
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('maintenance_staff')
      .select('id, profile_id, organization_id')
      .eq('id', staffId)
      .single()

    if (staffErr || !staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    if (staff.organization_id !== requesterProfile.organization_id) {
      return NextResponse.json({ error: 'Forbidden - Organization mismatch' }, { status: 403 })
    }

    const { data: requests, error: rErr } = await supabaseAdmin
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(name),
        unit:units(unit_number),
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name)
      `)
      .eq('assigned_to', staff.profile_id)
      .order('created_at', { ascending: false })

    if (rErr) throw rErr

    return NextResponse.json(requests || [])
  } catch (error) {
    console.error('Staff requests GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assigned requests' },
      { status: 500 }
    )
  }
}
