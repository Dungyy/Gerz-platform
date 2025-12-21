import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { email, password, fullName, organizationName, role } = await request.json()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    const userId = authData.user.id

    // If owner, create organization
    let organizationId
    if (role === 'owner') {
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: organizationName,
          slug,
          plan: 'free',
          subscription_status: 'trialing',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        }])
        .select()
        .single()

      if (orgError) throw orgError
      organizationId = orgData.id
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        organization_id: organizationId,
        full_name: fullName,
        email,
        role,
      }])

    if (profileError) throw profileError

    return NextResponse.json({ 
      success: true, 
      userId,
      organizationId 
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}