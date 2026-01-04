import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, context) {
  try {
    const { id } = await context.params

    console.log('📦 Fetching property:', id)

    // Get auth token
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

    console.log('👤 User org:', profile.organization_id)

    // Get property with units
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select(`
        *,
        manager:profiles!properties_manager_id_fkey(full_name, email, phone),
        units(
          id,
          unit_number,
          floor,
          bedrooms,
          bathrooms,
          square_feet,
          tenant_id,
          tenant:profiles(full_name, email, phone)
        )
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error) {
      console.error('❌ Property fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    console.log('✅ Property found:', property.name, 'with', property.units?.length || 0, 'units')

    return NextResponse.json(property)

  } catch (error) {
    console.error('❌ Property detail error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch property' },
      { status: 500 }
    )
  }
}

export async function PUT(request, context) {
  try {
    const { id } = await context.params

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const updates = await request.json()

    // 🔒 AUTHORIZATION: Only owners can assign/change managers
    if (updates.manager_id !== undefined && profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can assign property managers' },
        { status: 403 }
      )
    }

    // Verify manager belongs to same organization (if manager_id is being set and not null)
    if (updates.manager_id !== undefined && updates.manager_id !== null && updates.manager_id !== '') {
      const { data: managerProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, organization_id, role')
        .eq('id', updates.manager_id)
        .single()

      if (!managerProfile) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        )
      }

      if (managerProfile.organization_id !== profile.organization_id) {
        return NextResponse.json(
          { error: 'Manager must be from the same organization' },
          { status: 403 }
        )
      }

      // Ensure manager has appropriate role
      if (!['owner', 'manager'].includes(managerProfile.role)) {
        return NextResponse.json(
          { error: 'Assigned user must have owner or manager role' },
          { status: 400 }
        )
      }
    }

    // Convert empty string to null for manager_id
    if (updates.manager_id === '') {
      updates.manager_id = null
    }

    // Update property
    const { data, error } = await supabaseAdmin
      .from('properties')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', profile.organization_id) // Ensure same org
      .select()
      .single()

    if (error) {
      console.error('❌ Property update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Property updated:', data.name)

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Property update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update property' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only owners and managers can delete properties
    if (!['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and managers can delete properties' },
        { status: 403 }
      )
    }

    // Delete property image from storage if it exists
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('photo_url')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (property?.photo_url) {
      try {
        const imagePath = property.photo_url.split('/').pop()
        if (imagePath) {
          await supabaseAdmin.storage
            .from('property-images')
            .remove([`${profile.organization_id}/${imagePath}`])
        }
      } catch (error) {
        console.error('Error deleting property image:', error)
      }
    }

    // Delete property
    const { error } = await supabaseAdmin
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      console.error('❌ Property delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Property deleted:', id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Property delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete property' },
      { status: 500 }
    )
  }
}