'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Mail, MessageSquare, AlertCircle, Home } from 'lucide-react'

export default function InviteTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [orgId, setOrgId] = useState(null)
  const [units, setUnits] = useState([])
  const [loadingUnits, setLoadingUnits] = useState(true)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    unit_id: '',
  })

  const [sendSMS, setSendSMS] = useState(false)

  useEffect(() => {
    loadOrg()
    loadVacantUnits()
  }, [])

  async function loadOrg() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'owner' && profile?.role !== 'manager') {
        alert('You do not have permission to invite tenants')
        router.push('/dashboard/tenants')
        return
      }

      setOrgId(profile?.organization_id)
    } catch (err) {
      console.error('Error loading org:', err)
    }
  }

  async function loadVacantUnits() {
    try {
      setLoadingUnits(true)

      const response = await fetchWithAuth('/api/units', { method: 'GET' })
      const data = await response.json()

      if (response.ok) {
        // Filter vacant units only
        const vacant = (Array.isArray(data) ? data : []).filter(u => !u.tenant_id)
        setUnits(vacant)
      }
    } catch (err) {
      console.error('Error loading units:', err)
    } finally {
      setLoadingUnits(false)
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!orgId) return

    setLoading(true)

    try {
      const payload = {
        ...formData,
        send_sms: sendSMS && formData.phone,
      }

      console.log('📤 Sending tenant invitation:', payload)

      const response = await fetchWithAuth('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to invite tenant')
      }

      console.log('✅ Invitation response:', data)

      let message = `Invitation sent successfully!\n\n`
      message += `${formData.full_name} will receive:\n`
      message += `✉️ Email at ${formData.email} with a secure link to set their password\n`
      
      if (sendSMS && formData.phone) {
        message += `📱 Text message at ${formData.phone} with account details\n`
      }
      
      message += `\nThey can access the platform as soon as they set their password.`

      alert(message)
      router.push('/dashboard/tenants')
    } catch (err) {
      console.error('Error inviting tenant:', err)
      alert(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Group units by property
  const unitsByProperty = units.reduce((acc, unit) => {
    const propertyName = unit.property?.name || 'Unknown Property'
    if (!acc[propertyName]) {
      acc[propertyName] = []
    }
    acc[propertyName].push(unit)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Invite Tenant</h1>
          <p className="text-gray-600 mt-1">Send an invitation to a new tenant</p>
        </div>
      </div>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">How tenant invitations work:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Tenant receives an email with a secure magic link</li>
                <li>They click the link to set their password (link expires in 24 hours)</li>
                <li>Once set up, they can login and submit maintenance requests immediately</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Information */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
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
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Magic link for password setup will be sent to this email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone (optional)
              </label>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used for SMS notifications (if enabled below)
              </p>
            </div>

            {/* SMS Toggle */}
            {formData.phone && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                <input
                  type="checkbox"
                  id="send-sms"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className="rounded h-5 w-5"
                />
                <label htmlFor="send-sms" className="text-sm cursor-pointer">
                  <span className="font-medium">Send SMS invitation</span>
                  <p className="text-gray-600">
                    Send a text message in addition to the email with account details
                  </p>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unit Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Assign Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Vacant Unit <span className="text-red-500">*</span>
              </label>

              {loadingUnits ? (
                <p className="text-sm text-gray-500">Loading vacant units...</p>
              ) : units.length === 0 ? (
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                  <p className="text-gray-500">No vacant units available</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Create a property and add units first
                  </p>
                </div>
              ) : (
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Select a unit --</option>
                  {Object.entries(unitsByProperty).map(([propertyName, propertyUnits]) => (
                    <optgroup key={propertyName} label={propertyName}>
                      {propertyUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unit_number}
                          {unit.bedrooms && ` - ${unit.bedrooms} bed, ${unit.bathrooms} bath`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Only showing vacant units • {units.length} available
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading || !orgId || units.length === 0}>
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        {!orgId && (
          <p className="text-sm text-red-600">
            Could not determine organization. Please login again.
          </p>
        )}
      </form>
    </div>
  )
}