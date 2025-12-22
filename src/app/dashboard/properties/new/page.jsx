'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [orgId, setOrgId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    property_type: 'apartment',
    year_built: '',
    description: '',
  })
  const [units, setUnits] = useState([
    { unit_number: '101', floor: '1', bedrooms: 1, bathrooms: 1, square_feet: '' }
  ])

  useEffect(() => {
    loadOrg()
  }, [])

  async function loadOrg() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    setOrgId(profile?.organization_id)
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function addUnit() {
    setUnits([...units, { unit_number: '', floor: '', bedrooms: 1, bathrooms: 1, square_feet: '' }])
  }

  function removeUnit(index) {
    setUnits(units.filter((_, i) => i !== index))
  }

  function updateUnit(index, field, value) {
    const newUnits = [...units]
    newUnits[index][field] = value
    setUnits(newUnits)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!orgId) return

    setLoading(true)

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organization_id: orgId,
          units: units.filter(u => u.unit_number.trim()), // Only include units with numbers
        }),
      })

      if (response.ok) {
        router.push('/dashboard/properties')
      } else {
        const data = await response.json()
        alert('Error: ' + (data.error || 'Failed to create property'))
      }
    } catch (error) {
      console.error('Error creating property:', error)
      alert('Error creating property')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Property</h1>
        <p className="text-gray-600 mt-1">Create a property and add units</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="name"
                placeholder="Property Name *"
                value={formData.name}
                onChange={handleChange}
                required
                className="col-span-2"
              />

              <Input
                name="address"
                placeholder="Street Address *"
                value={formData.address}
                onChange={handleChange}
                required
                className="col-span-2"
              />

              <Input
                name="city"
                placeholder="City *"
                value={formData.city}
                onChange={handleChange}
                required
              />

              <Input
                name="state"
                placeholder="State *"
                value={formData.state}
                onChange={handleChange}
                required
              />

              <Input
                name="zip"
                placeholder="ZIP Code *"
                value={formData.zip}
                onChange={handleChange}
                required
              />

              <select
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="apartment">Apartment Building</option>
                <option value="house">Single Family Home</option>
                <option value="condo">Condo</option>
                <option value="commercial">Commercial</option>
                <option value="mixed">Mixed Use</option>
              </select>

              <Input
                type="number"
                name="year_built"
                placeholder="Year Built"
                value={formData.year_built}
                onChange={handleChange}
              />

              <textarea
                name="description"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={handleChange}
                className="col-span-2 px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Units */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Units ({units.length})</CardTitle>
              <Button type="button" onClick={addUnit} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {units.map((unit, index) => (
              <div key={index} className="flex gap-3 items-start p-4 border rounded-lg">
                <div className="grid grid-cols-5 gap-3 flex-1">
                  <Input
                    placeholder="Unit # *"
                    value={unit.unit_number}
                    onChange={(e) => updateUnit(index, 'unit_number', e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Floor"
                    value={unit.floor}
                    onChange={(e) => updateUnit(index, 'floor', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Beds"
                    value={unit.bedrooms}
                    onChange={(e) => updateUnit(index, 'bedrooms', e.target.value)}
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder="Baths"
                    value={unit.bathrooms}
                    onChange={(e) => updateUnit(index, 'bathrooms', e.target.value)}
                    min="0"
                    step="0.5"
                  />
                  <Input
                    type="number"
                    placeholder="Sq Ft"
                    value={unit.square_feet}
                    onChange={(e) => updateUnit(index, 'square_feet', e.target.value)}
                    min="0"
                  />
                </div>
                {units.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeUnit(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading || !orgId}>
            {loading ? 'Creating...' : 'Create Property'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}