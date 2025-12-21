import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - List maintenance staff
export async function GET() {
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

  const { data: staff, error } = await supabase
    .from('maintenance_staff')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(staff)
}

// POST - Add staff member
export async function POST(request) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, full_name, phone, specialties } = await request.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // Create user
  const tempPassword = Math.random().toString(36).slice(-8)
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Create profile
  await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      organization_id: profile.organization_id,
      full_name,
      email,
      phone,
      role: 'maintenance',
    }])

  // Create staff record
  const { data: staffData, error: staffError } = await supabase
    .from('maintenance_staff')
    .insert([{
      organization_id: profile.organization_id,
      profile_id: authData.user.id,
      specialties: specialties || [],
    }])
    .select(`
      *,
      profile:profiles(*)
    `)
    .single()

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 400 })
  }

  return NextResponse.json(staffData, { status: 201 })
}