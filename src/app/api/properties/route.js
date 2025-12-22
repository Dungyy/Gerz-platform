import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { units, ...propertyData } = await request.json()

    // Get current user from auth header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to verify organization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'owner' && profile.role !== 'manager')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Ensure organization_id matches user's organization
    if (propertyData.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 403 })
    }

    // Set manager_id to current user
    propertyData.manager_id = user.id

    // Create property
    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .insert([propertyData])
      .select()
      .single()

    if (propError) {
      console.error('Property creation error:', propError)
      return NextResponse.json({ error: propError.message }, { status: 400 })
    }

    // Create units if provided
    if (units && units.length > 0) {
      const unitsToInsert = units
        .filter(unit => unit.unit_number && unit.unit_number.trim()) // Only units with numbers
        .map(unit => ({
          ...unit,
          property_id: property.id,
          organization_id: propertyData.organization_id,
        }))

      if (unitsToInsert.length > 0) {
        const { error: unitsError } = await supabaseAdmin
          .from('units')
          .insert(unitsToInsert)

        if (unitsError) {
          console.error('Units creation error:', unitsError)
          // Property created but units failed - log but don't fail
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      property,
      units_created: units?.length || 0 
    })

  } catch (error) {
    console.error('Property API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create property' },
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

    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select(`
        *,
        manager:profiles!properties_manager_id_fkey(full_name),
        units(count)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    return NextResponse.json(properties || [])

  } catch (error) {
    console.error('Property GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}