import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - List comments
export async function GET(request, { params }) {
  const supabase = createServerClient()
  const { id } = await context.params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('request_comments')
    .select(`
      *,
      user:profiles(id, full_name, avatar_url, role)
    `)
    .eq('request_id', id)
    .order('created_at', { ascending: true })

  // Tenants don't see internal comments
  if (profile.role === 'tenant') {
    query = query.eq('is_internal', false)
  }

  const { data: comments, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(comments)
}

// POST - Add comment
export async function POST(request, { params }) {
  const supabase = createServerClient()
  const { id } = await context.params
  const { comment, is_internal, photo_urls } = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('request_comments')
    .insert([{
      request_id: id,
      user_id: user.id,
      comment,
      is_internal: is_internal || false,
      photo_urls: photo_urls || [],
    }])
    .select(`
      *,
      user:profiles(id, full_name, avatar_url, role)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}