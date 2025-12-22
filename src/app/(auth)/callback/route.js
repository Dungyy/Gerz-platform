import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  console.log('🔗 Auth callback received, code:', code ? 'present' : 'missing')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    try {
      await supabase.auth.exchangeCodeForSession(code)
      console.log('✅ Code exchanged for session')
    } catch (error) {
      console.error('❌ Code exchange error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?message=Invalid+code`)
    }
  }

  // Redirect to next page (usually set-password or dashboard)
  console.log('➡️ Redirecting to:', next)
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}