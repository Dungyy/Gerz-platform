'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { UserCog, Mail, Phone, Plus, Wrench, X } from 'lucide-react'

export default function StaffPageMerged() {
  const router = useRouter()

  // list
  const [staff, setStaff] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')

  // permissions + org
  const [orgId, setOrgId] = useState(null)
  const [canManage, setCanManage] = useState(false)

  // create form
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

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
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function init() {
    await Promise.all([loadOrgAndPermissions(), loadStaff()])
  }

  async function loadOrgAndPermissions() {
    try {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (pErr) throw pErr

      setOrgId(profile?.organization_id || null)
      setCanManage(profile?.role === 'owner' || profile?.role === 'manager')
    } catch (err) {
      console.error('Failed to load profile/org:', err)
      setOrgId(null)
      setCanManage(false)
    }
  }

  async function loadStaff() {
    try {
      setLoadingList(true)
      setError('')

      const response = await fetchWithAuth('/api/staff', { method: 'GET' })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json().catch(() => [])
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load staff')
      }

      const list = Array.isArray(data) ? data : data.staff || []
      setStaff(list)
    } catch (err) {
      console.error('Failed to load staff:', err)
      setError(err.message || 'Failed to load staff.')
      setStaff([])
    } finally {
      setLoadingList(false)
    }
  }

  function toggleSpecialty(s) {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  function onChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function resetForm() {
    setForm({ full_name: '', email: '', phone: '' })
    setSelectedSpecialties([])
  }

  async function onCreateSubmit(e) {
    e.preventDefault()
    if (!canManage) return

    setCreating(true)
    setError('')

    try {
      const payload = {
        ...form,
        specialties: selectedSpecialties,
        // orgId optional depending on API. Safe to include; API can ignore if it derives org server-side.
        organization_id: orgId,
      }

      const response = await fetchWithAuth('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add staff')
      }

      // refresh list + close form
      await loadStaff()
      setShowCreate(false)
      resetForm()
    } catch (err) {
      console.error('Create staff error:', err)
      setError(err.message || 'Failed to add staff.')
    } finally {
      setCreating(false)
    }
  }

  if (loadingList) return <div className="flex justify-center py-12">Loading...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Maintenance Staff</h2>
          <p className="text-gray-600 mt-1">{staff.length} staff members</p>
        </div>

        {canManage && (
          <Button type="button" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-5 w-5 mr-2" />
            {showCreate ? 'Close' : 'Add Staff'}
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Inline Create */}
      {showCreate && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add Maintenance Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  className="col-span-2"
                  name="full_name"
                  placeholder="Full Name *"
                  value={form.full_name}
                  onChange={onChange}
                  required
                />

                <Input
                  className="col-span-2"
                  type="email"
                  name="email"
                  placeholder="Email *"
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
                        variant={active ? 'default' : 'outline'}
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

              <div className="flex gap-3">
                <Button type="submit" disabled={creating || !orgId}>
                  {creating ? 'Creating...' : 'Create Staff'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    resetForm()
                  }}
                >
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
      )}

      {/* Staff Grid */}
      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No staff members yet</h3>
            <p className="text-gray-600 mb-4">Add maintenance staff to assign requests</p>

            {canManage && (
              <Button type="button" onClick={() => setShowCreate(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add Staff
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => {
            const p = member?.profile || member?.profiles || member || {}
            return (
              <Card key={member.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{p.full_name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-600">Maintenance Staff</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {p.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${p.email}`} className="hover:underline truncate" title={p.email}>
                          {p.email}
                        </a>
                      </div>
                    )}

                    {p.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${p.phone}`} className="hover:underline">
                          {p.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {Array.isArray(member.specialties) && member.specialties.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-1">
                        {member.specialties.map((specialty, idx) => (
                          <Badge key={`${specialty}-${idx}`} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
