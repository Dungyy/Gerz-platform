import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = params?.id
    if (!tenantId) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })

    // requester org
    const { data: requester, error: rErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    if (rErr || !requester) return NextResponse.json({ error: 'Profile not found' }, { status: 401 })

    // tenant org check
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single()
    if (tErr || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    if (tenant.organization_id !== requester.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: requests, error: qErr } = await supabaseAdmin
      .from('maintenance_requests')
      .select(`
        id, title, status, priority, created_at,
        property:properties(name),
        unit:units(unit_number)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(25)

    if (qErr) throw qErr

    return NextResponse.json(requests || [])
  } catch (e) {
    console.error('Tenant requests GET error:', e)
    return NextResponse.json({ error: e.message || 'Failed to load requests' }, { status: 500 })
  }
}
