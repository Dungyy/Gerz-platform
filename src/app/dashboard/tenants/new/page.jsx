'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { fetchWithAuth } from '@/lib/api-helper'

export default function NewTenantPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState([])
  const [availableUnits, setAvailableUnits] = useState([])
  const [sendSMS, setSendSMS] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    unit_id: '',
  })

  const canSubmit = useMemo(() => {
    if (!formData.full_name.trim()) return false
    if (!formData.email.trim()) return false
    if (!formData.unit_id) return false
    if (availableUnits.length === 0) return false
    return true
  }, [formData, availableUnits.length])

  useEffect(() => {
    void loadProperties()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProperties() {
    try {
      setError('')

      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr

      const user = userRes?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profileErr) throw profileErr

      const orgId = profile?.organization_id
      if (!orgId) {
        setProperties([])
        setAvailableUnits([])
        setError('No organization found for this user.')
        return
      }

      const { data, error: propErr } = await supabase
        .from('properties')
        .select(
          `
          id,
          name,
          address,
          units(id, unit_number, tenant_id)
        `
        )
        .eq('organization_id', orgId)
        .order('name')

      if (propErr) throw propErr

      const props = data || []
      setProperties(props)

      // Flatten vacant units
      const vacant = []
      props.forEach((property) => {
        ;(property.units || [])
          .filter((unit) => !unit.tenant_id)
          .forEach((unit) => {
            vacant.push({
              ...unit,
              propertyName: property.name,
              propertyId: property.id,
            })
          })
      })

      setAvailableUnits(vacant)
    } catch (err) {
      console.error('Error loading properties/units:', err)
      setError('Failed to load properties/units. Check console.')
      setProperties([])
      setAvailableUnits([])
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError('')

    try {
      const { data: sessionRes, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr

      const token = sessionRes?.session?.access_token
      if (!token) {
        router.push('/login')
        return
      }

      const payload = {
        ...formData,
        send_sms: Boolean(sendSMS && formData.phone), // ✅ actually send it
      }

      const response = await fetchWithAuth('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        alert(
          `Invitation sent! ${formData.full_name} will receive an email at ${formData.email} with instructions to set their password and access the platform.`
        )
        router.push('/dashboard/tenants')
      } else {
        alert('Error: ' + (data.error || 'Failed to invite tenant'))
      }
    } catch (err) {
      console.error('Error inviting tenant:', err)
      alert('Error inviting tenant. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Invite Tenant</h1>
          <p className="text-gray-600 mt-1">Add a new tenant and assign them to a unit</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tenant Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="full_name"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  An invitation email will be sent to this address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="send-sms"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  disabled={!formData.phone}
                  className="rounded mt-1"
                />
                <label htmlFor="send-sms" className="text-sm leading-5">
                  <span className="font-medium">Send SMS invitation</span>
                  <p className="text-gray-600">Send a text message in addition to email</p>
                </label>
              </div>
            </div>

            {/* Unit Assignment */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Unit Assignment</h3>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Assign to Unit <span className="text-red-500">*</span>
                </label>
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a vacant unit</option>
                  {availableUnits.length === 0 ? (
                    <option disabled>No vacant units available</option>
                  ) : (
                    availableUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.propertyName} - Unit {unit.unit_number}
                      </option>
                    ))
                  )}
                </select>

                <p className="text-xs text-gray-500 mt-1">
                  {availableUnits.length} vacant unit{availableUnits.length !== 1 ? 's' : ''}{' '}
                  available
                </p>
              </div>

              {availableUnits.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>No vacant units available.</strong> Please add units to your properties
                    first.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !canSubmit} className="flex-1">
                {loading ? 'Sending Invite...' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• The tenant will receive an email invitation</li>
            <li>• They can set their own password on first login</li>
            <li>• They&apos;ll be able to submit maintenance requests immediately</li>
            <li>• You can reassign them to a different unit later if needed</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
