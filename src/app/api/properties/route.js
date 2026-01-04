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

export async function POST(request) {
  try {
    const token = getToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Get requester profile (org + role)
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (pErr) throw pErr
    if (!profile || !['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const orgId = body.organization_id || profile.organization_id
    if (orgId !== profile.organization_id) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 403 })
    }

    // Check subscription limit
    const { data: canAdd, error: limitError } = await supabaseAdmin.rpc(
      "check_subscription_limit",
      {
        org_id: orgId,
        limit_type: "properties",
      }
    )

    if (limitError) {
      console.error("Limit check error:", limitError)
      return NextResponse.json(
        { error: "Failed to check subscription limit" },
        { status: 500 }
      )
    }

    if (!canAdd) {
      return NextResponse.json(
        {
          error: "Property limit reached for your subscription plan. Please upgrade to add more properties.",
          limit_reached: true,
        },
        { status: 403 }
      )
    }

    const propertyInsert = {
      organization_id: orgId,
      name: body.name,
      address: body.address,
      city: body.city || null,
      state: body.state || null,
      zip_code: body.zip || body.zip_code || null,
      property_type: body.property_type || null,
      manager_id: body.manager_id || null,
    }

    Object.keys(propertyInsert).forEach((k) => {
      if (typeof propertyInsert[k] === 'undefined') delete propertyInsert[k]
    })

    // Create property
    const { data: property, error: propErr } = await supabaseAdmin
      .from('properties')
      .insert(propertyInsert)
      .select()
      .single()

    if (propErr) throw propErr

    // Create units (full shape)
    const units = Array.isArray(body.units) ? body.units : []

    const cleanedUnits = units
      .filter((u) => u?.unit_number && String(u.unit_number).trim())
      .map((u) => ({
        property_id: property.id,
        unit_number: String(u.unit_number).trim(),

        floor: u.floor === '' || u.floor == null ? null : Number(u.floor),
        bedrooms: u.bedrooms === '' || u.bedrooms == null ? null : Number(u.bedrooms),
        bathrooms: u.bathrooms === '' || u.bathrooms == null ? null : Number(u.bathrooms),
        square_feet:
          u.square_feet === '' || u.square_feet == null ? null : Number(u.square_feet),

        monthly_rent:
          u.monthly_rent === '' || u.monthly_rent == null
            ? null
            : Number(u.monthly_rent),

        lease_start_date: u.lease_start_date || null,
        lease_end_date: u.lease_end_date || null,

        tenant_id: u.tenant_id || null,
      }))

    let unitsCreated = 0

    if (cleanedUnits.length > 0) {
      const { data: insertedUnits, error: unitErr } = await supabaseAdmin
        .from('units')
        .insert(cleanedUnits)
        .select('id')

      if (unitErr) {
        // Cleanup property if units fail
        await supabaseAdmin.from('properties').delete().eq('id', property.id)
        throw unitErr
      }

      unitsCreated = insertedUnits?.length || 0
    }

    return NextResponse.json({
      success: true,
      property,
      units_created: unitsCreated,
    })
  } catch (error) {
    console.error('Properties POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create property' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const token = getToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (pErr) throw pErr

    const { data, error } = await supabaseAdmin
      .from('properties')
      .select(`
        id, 
        name, 
        address, 
        city, 
        state, 
        zip_code, 
        property_type, 
        photo_url,
        created_at,
        manager:profiles!properties_manager_id_fkey(id, full_name, email, avatar_url),
        units:units(count)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const normalized = (data || []).map((p) => ({
      ...p,
      units_count: p.units?.[0]?.count || 0,
    }))

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Properties GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}
