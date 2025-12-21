import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  const supabase = createServerClient()
  const { id } = params
  const { status, resolution_notes } = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = { status }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString()
    updates.completed_by = user.id
    if (resolution_notes) {
      updates.resolution_notes = resolution_notes
    }
  }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Send status update notification
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/status-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: id, status })
  })

  return NextResponse.json(data)
}