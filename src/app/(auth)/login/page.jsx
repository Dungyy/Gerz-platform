'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mail, Lock, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handlePasswordLogin(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      console.log('✅ Logged in:', data.user.email)
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      alert(`❌ Login failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLinkLogin(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      })

      if (error) throw error

      setMagicLinkSent(true)
      console.log('✅ Magic link sent to:', formData.email)
    } catch (error) {
      console.error('Magic link error:', error)
      alert(`❌ Failed to send magic link: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-center">Check Your Email!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              We've sent a magic link to:
            </p>
            <p className="font-semibold text-lg">{formData.email}</p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <p className="text-sm text-blue-900 mb-2">
                <strong>Click the link in your email to sign in.</strong>
              </p>
              <p className="text-xs text-blue-700">
                The link will expire in 1 hour. Check your spam folder if you don't see it.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setMagicLinkSent(false)
                setUseMagicLink(false)
              }}
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Sign In to Gerz</CardTitle>
          <p className="text-center text-gray-600 mt-2">
            Welcome back! Sign in to your account
          </p>
        </CardHeader>

        <CardContent>
          {/* Toggle Between Password and Magic Link */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={!useMagicLink ? 'default' : 'outline'}
              onClick={() => setUseMagicLink(false)}
              className="flex-1"
            >
              <Lock className="h-4 w-4 mr-2" />
              Password
            </Button>
            <Button
              type="button"
              variant={useMagicLink ? 'default' : 'outline'}
              onClick={() => setUseMagicLink(true)}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Magic Link
            </Button>
          </div>

          {/* Password Login Form */}
          {!useMagicLink && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm">
                <Link href="/forgot-password" className="text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {/* Magic Link Form */}
          {useMagicLink && (
            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-900">
                  ✨ Enter your email and we'll send you a magic link to sign in - no password needed!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>
          )}

          <div className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline font-semibold">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}