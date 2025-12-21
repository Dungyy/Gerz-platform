import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET - List tenants
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

  const { data: tenants, error } = await supabase
    .from('profiles')
    .select(`
      *,
      unit:units!units_tenant_id_fkey(
        id,
        unit_number,
        property:properties(id, name, address)
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('role', 'tenant')
    .order('full_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(tenants)
}

// POST - Create tenant (invite)
export async function POST(request) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, full_name, phone, unit_id } = await request.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // Create auth user with temporary password
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
  const { data: newProfile, error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      organization_id: profile.organization_id,
      full_name,
      email,
      phone,
      role: 'tenant',
    }])
    .select()
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // Assign to unit
  if (unit_id) {
    await supabase
      .from('units')
      .update({ tenant_id: authData.user.id })
      .eq('id', unit_id)
  }

  // TODO: Send welcome email with password reset link

  return NextResponse.json(newProfile, { status: 201 })
}