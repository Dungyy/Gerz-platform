import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - List requests
export async function GET(request) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const propertyId = searchParams.get('property_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      tenant:profiles!maintenance_requests_tenant_id_fkey(id, full_name, email, phone),
      assigned:profiles!maintenance_requests_assigned_to_fkey(id, full_name, email)
    `)
    .limit(limit)
    .order('created_at', { ascending: false })

  // Tenants only see their own requests
  if (profile.role === 'tenant') {
    query = query.eq('tenant_id', user.id)
  } else {
    // Staff sees all requests in their org
    query = query.eq('organization_id', profile.organization_id)
  }

  // Apply filters
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data: requests, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(requests)
}

// POST - Create request
export async function POST(request) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestData = await request.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // Get property_id from unit
  const { data: unit } = await supabase
    .from('units')
    .select('property_id')
    .eq('id', requestData.unit_id)
    .single()

  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert([{
      ...requestData,
      tenant_id: user.id,
      organization_id: profile.organization_id,
      property_id: unit.property_id,
      status: 'submitted',
    }])
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:profiles!maintenance_requests_tenant_id_fkey(*)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Send notification
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/new-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: data.id })
  })

  return NextResponse.json(data, { status: 201 })
}