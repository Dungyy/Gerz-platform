'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Wrench, CheckCircle, AlertCircle } from 'lucide-react'

export default function SetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(emailParam)

    const hash = window.location.hash
    if (hash) checkSession()
  }, [searchParams])

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) setEmail(session.user.email)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      })
      if (error) throw error

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setError(err.message || 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" value={email} disabled />
            <Input
              type="password"
              placeholder="New password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? 'Setting...' : 'Set Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}