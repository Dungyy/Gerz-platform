import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - Get request detail
export async function GET(request, { params }) {
  const supabase = createServerClient()
  const { id } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: maintenanceRequest, error } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:profiles!maintenance_requests_tenant_id_fkey(*),
      assigned:profiles!maintenance_requests_assigned_to_fkey(*),
      completed_by_user:profiles!maintenance_requests_completed_by_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(maintenanceRequest)
}

// PUT - Update request
export async function PUT(request, { params }) {
  const supabase = createServerClient()
  const { id } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = await request.json()

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:profiles!maintenance_requests_tenant_id_fkey(*),
      assigned:profiles!maintenance_requests_assigned_to_fkey(*)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}