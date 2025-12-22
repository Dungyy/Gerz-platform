import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  const supabase = createServerClient()
  const { id } = await context.params
  const { assigned_to } = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({
      assigned_to,
      status: 'assigned',
    })
    .eq('id', id)
    .select(`
      *,
      assigned:profiles!maintenance_requests_assigned_to_fkey(*)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Send assignment notification
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/assignment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: id, assignedTo: assigned_to })
  })

  return NextResponse.json(data)
}