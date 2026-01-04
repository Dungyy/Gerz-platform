import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getAuthedProfile(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  
  if (authErr || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

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

export async function GET(request, context) {
  try {
    const { profile, error } = await getAuthedProfile(request)
    if (error) return error

    const { id: tenantId } = await context.params
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })
    }

    console.log('📦 Fetching tenant:', tenantId)

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        organization_id,
        full_name,
        email,
        phone,
        role,
        created_at,
        unit:units!units_tenant_id_fkey(
          id,
          unit_number,
          floor,
          bedrooms,
          bathrooms,
          square_feet,
          monthly_rent,
          lease_start_date,
          lease_end_date,
          property:properties(
            id,
            name,
            address,
            city,
            state,
            zip
          )
        )
      `)
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single()

    if (tErr || !tenant) {
      console.error('❌ Tenant not found:', tErr)
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (tenant.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('Tenant loaded:', tenant.full_name)

    return NextResponse.json(tenant)
    
  } catch (e) {
    console.error('❌ Tenant [id] GET error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to load tenant' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  try {
    const { profile, error } = await getAuthedProfile(request)
    if (error) return error

    if (!['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: tenantId } = await context.params
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })
    }

    console.log('🗑️ Removing tenant from unit:', tenantId)

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single()

    if (tErr || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (tenant.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Unassign from unit
    const { error: uErr } = await supabaseAdmin
      .from('units')
      .update({ tenant_id: null })
      .eq('tenant_id', tenantId)

    if (uErr) {
      console.error('❌ Unit unassignment error:', uErr)
      throw uErr
    }

    console.log('Tenant unassigned from unit')

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant unassigned from unit' 
    })
    
  } catch (e) {
    console.error('❌ Tenant [id] DELETE error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to remove tenant from unit' },
      { status: 500 }
    )
  }
}

export async function PUT(request, context) {
  try {
    const { profile, error } = await getAuthedProfile(request)
    if (error) return error

    if (!['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: tenantId } = await context.params
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })
    }

    const body = await request.json()
    const { full_name, email, phone, unit_id } = body

    console.log('✏️ Updating tenant:', tenantId, 'with unit:', unit_id)

    // Verify tenant exists and belongs to this org
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id')
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single()

    if (tErr || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (tenant.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update tenant profile
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, email, phone })
      .eq('id', tenantId)

    if (profileErr) {
      console.error('❌ Profile update error:', profileErr)
      return NextResponse.json({ error: 'Failed to update tenant profile' }, { status: 500 })
    }

    // Handle unit assignment changes
    if (unit_id !== undefined) {
      // First, unassign tenant from their current unit (if any)
      const { error: unassignErr } = await supabaseAdmin
        .from('units')
        .update({ tenant_id: null })
        .eq('tenant_id', tenantId)

      if (unassignErr) {
        console.error('❌ Unit unassignment error:', unassignErr)
      }

      // If a new unit is selected, assign it
      if (unit_id) {
        // Verify the unit exists and belongs to this org
        const { data: unit, error: unitErr } = await supabaseAdmin
          .from('units')
          .select('id, property:properties(organization_id)')
          .eq('id', unit_id)
          .single()

        if (unitErr || !unit) {
          return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
        }

        if (unit.property.organization_id !== profile.organization_id) {
          return NextResponse.json({ error: 'Unit does not belong to your organization' }, { status: 403 })
        }

        // Check if unit is already occupied
        const { data: occupiedUnit } = await supabaseAdmin
          .from('units')
          .select('tenant_id')
          .eq('id', unit_id)
          .single()

        if (occupiedUnit?.tenant_id && occupiedUnit.tenant_id !== tenantId) {
          return NextResponse.json({ 
            error: 'Unit is already occupied by another tenant' 
          }, { status: 400 })
        }

        // Assign tenant to new unit
        const { error: assignErr } = await supabaseAdmin
          .from('units')
          .update({ tenant_id: tenantId })
          .eq('id', unit_id)

        if (assignErr) {
          console.error('❌ Unit assignment error:', assignErr)
          return NextResponse.json({ error: 'Failed to assign unit' }, { status: 500 })
        }

        console.log('Tenant assigned to unit:', unit_id)
      } else {
        console.log('Tenant unassigned from all units')
      }
    }

    console.log('Tenant updated:', tenantId)

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant updated successfully' 
    })
    
  } catch (e) {
    console.error('❌ Tenant [id] PUT error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to update tenant' },
      { status: 500 }
    )
  }
}
