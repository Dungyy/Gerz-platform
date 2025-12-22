'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus } from 'lucide-react'

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState([])
  const [availableUnits, setAvailableUnits] = useState([])
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    unit_id: '',
  })

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { data } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        address,
        units(id, unit_number, tenant_id)
      `)
      .eq('organization_id', profile.organization_id)
      .order('name')

    setProperties(data || [])
    
    // Flatten all vacant units
    const vacant = []
    data?.forEach(property => {
      property.units
        ?.filter(unit => !unit.tenant_id)
        .forEach(unit => {
          vacant.push({
            ...unit,
            propertyName: property.name,
            propertyId: property.id,
          })
        })
    })
    setAvailableUnits(vacant)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)

  try {
    const response = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify(formData),
    })

    const data = await response.json()

    if (response.ok) {
      // Show success message
      alert(`Invitation sent! ${formData.full_name} will receive an email at ${formData.email} with instructions to set their password and access the platform.`)
      router.push('/dashboard/tenants')
    } else {
      alert('Error: ' + (data.error || 'Failed to invite tenant'))
    }
  } catch (error) {
    console.error('Error inviting tenant:', error)
    alert('Error inviting tenant. Please try again.')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Invite Tenant</h1>
          <p className="text-gray-600 mt-1">Add a new tenant and assign them to a unit</p>
        </div>
      </div>

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
                <label className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
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
                  {availableUnits.length} vacant unit{availableUnits.length !== 1 ? 's' : ''} available
                </p>
              </div>

              {availableUnits.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>No vacant units available.</strong> Please add units to your properties first.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || availableUnits.length === 0}
                className="flex-1"
              >
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
            <li>• They'll be able to submit maintenance requests immediately</li>
            <li>• You can reassign them to a different unit later if needed</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}