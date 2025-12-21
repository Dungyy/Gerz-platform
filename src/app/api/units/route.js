import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - List units (optionally filtered by property)
export async function GET(request) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('property_id')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase
    .from('units')
    .select(`
      *,
      property:properties(*),
      tenant:profiles!units_tenant_id_fkey(id, full_name, email, phone)
    `)
    .order('unit_number')

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  const { data: units, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(units)
}

// POST - Create unit
export async function POST(request) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const unitData = await request.json()

  const { data, error } = await supabase
    .from('units')
    .insert([unitData])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}