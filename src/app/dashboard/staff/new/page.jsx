'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/api-helper'

export default function NewStaffPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [orgId, setOrgId] = useState(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  })

  const [selectedSpecialties, setSelectedSpecialties] = useState([])

  const availableSpecialties = useMemo(
    () => [
      'Plumbing',
      'Electrical',
      'HVAC',
      'Carpentry',
      'Painting',
      'Appliance Repair',
      'General Maintenance',
    ],
    []
  )

  useEffect(() => {
    void loadOrg()
  }, [])

  async function loadOrg() {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      const user = data?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (pErr) throw pErr
      setOrgId(profile?.organization_id || null)
    } catch (err) {
      console.error('Failed to load org:', err)
    }
  }

  function onChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function toggleSpecialty(s) {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

async function onSubmit(e) {
  e.preventDefault()
  if (!orgId) return

  setLoading(true)
  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      alert('Session expired. Please login again.')
      router.push('/login')
      return
    }

    const res = await fetchWithAuth('/api/staff', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` // ✅ ADD THIS
      },
      body: JSON.stringify({
        ...form,
        specialties: selectedSpecialties,
        organization_id: orgId,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert('Error: ' + (data.error || 'Failed to add staff'))
      return
    }

    router.push('/dashboard/staff')
  } catch (err) {
    console.error('Error creating staff:', err)
    alert('Error creating staff. See console.')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Staff Member</h1>
        <p className="text-gray-600 mt-1">Create a maintenance staff profile for assignments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                className="col-span-2"
                name="full_name"
                placeholder="Full Name"
                value={form.full_name}
                onChange={onChange}
                required
              />

              <Input
                className="col-span-2"
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={onChange}
                required
              />

              <Input
                className="col-span-2"
                type="tel"
                name="phone"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={onChange}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Specialties</p>
              <div className="flex flex-wrap gap-2">
                {availableSpecialties.map((s) => {
                  const active = selectedSpecialties.includes(s)
                  return (
                    <Badge
                      key={s}
                      variant={active ? 'default' : 'outline'} // ✅ shadcn default/outline (not "solid")
                      className="cursor-pointer select-none"
                      onClick={() => toggleSpecialty(s)}
                    >
                      {s}
                    </Badge>
                  )
                })}
              </div>

              {selectedSpecialties.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {selectedSpecialties.join(', ')}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !orgId}>
                {loading ? 'Creating...' : 'Create Staff'}
              </Button>

              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>

            {!orgId && (
              <p className="text-sm text-red-600">
                Could not determine organization. Make sure you’re logged in.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
