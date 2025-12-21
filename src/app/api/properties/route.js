import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - List all properties in organization
export async function GET(request) {
  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: properties, error } = await supabase
    .from('properties')
    .select(`
      *,
      manager:profiles!properties_manager_id_fkey(id, full_name, email),
      units(count)
    `)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(properties)
}

// POST - Create new property
export async function POST(request) {
  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  // Only owners and managers can create properties
  if (!['owner', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const propertyData = await request.json()

  const { data, error } = await supabase
    .from('properties')
    .insert([{
      ...propertyData,
      organization_id: profile.organization_id,
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}