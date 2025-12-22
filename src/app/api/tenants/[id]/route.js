import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getAuthedProfile(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: userRes, error: authErr } = await supabaseAdmin.auth.getUser(token)
  const user = userRes?.user
  if (authErr || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single()

  if (pErr || !profile) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 401 }) }
  }

  return { profile }
}

export async function GET(request, ctx) {
  try {
    const { profile, error } = await getAuthedProfile(request)
    if (error) return error

    const { id: tenantId } = await ctx.params // ✅ CRITICAL FIX
    if (!tenantId) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, organization_id, full_name, email, phone, role, created_at,
        unit:units!units_tenant_id_fkey(
          id, unit_number, floor, bedrooms, bathrooms, square_feet,
          property:properties(id, name, address, city, state, zip_code)
        )
      `)
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single()

    if (tErr || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    if (tenant.organization_id !== profile.organization_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(tenant)
  } catch (e) {
    console.error('Tenant [id] GET error:', e)
    return NextResponse.json({ error: e.message || 'Failed to load tenant' }, { status: 500 })
  }
}

export async function DELETE(request, ctx) {
  try {
    const { profile, error } = await getAuthedProfile(request)
    if (error) return error

    if (!['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: tenantId } = await ctx.params // ✅ CRITICAL FIX
    if (!tenantId) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single()

    if (tErr || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    if (tenant.organization_id !== profile.organization_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error: uErr } = await supabaseAdmin
      .from('units')
      .update({ tenant_id: null })
      .eq('tenant_id', tenantId)

    if (uErr) throw uErr

    return NextResponse.json({ success: true, message: 'Tenant unassigned from unit' })
  } catch (e) {
    console.error('Tenant [id] DELETE error:', e)
    return NextResponse.json({ error: e.message || 'Failed to remove tenant from unit' }, { status: 500 })
  }
}
