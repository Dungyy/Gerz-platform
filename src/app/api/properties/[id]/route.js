import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - Get single property
export async function GET(request, { params }) {
  const supabase = createServerClient()
  const { id } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: property, error } = await supabase
    .from('properties')
    .select(`
      *,
      manager:profiles!properties_manager_id_fkey(id, full_name, email, phone),
      units(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(property)
}

// PUT - Update property
export async function PUT(request, { params }) {
  const supabase = createServerClient()
  const { id } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = await request.json()

  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

// DELETE - Delete property
export async function DELETE(request, { params }) {
  const supabase = createServerClient()
  const { id } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}