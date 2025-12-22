'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

export default function EditPropertyPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
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

  useEffect(() => {
    loadProperty()
  }, [params.id])

  async function loadProperty() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: 'GET'
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load property')
      }

      // Populate form with existing data
      setFormData({
        name: data.name || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        property_type: data.property_type || 'apartment',
        year_built: data.year_built || '',
        description: data.description || '',
      })
    } catch (err) {
      console.error('Error loading property:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update property')
      }

      alert('✅ Property updated successfully!')
      router.push(`/dashboard/properties/${params.id}`)
    } catch (err) {
      console.error('Error updating property:', err)
      alert(`❌ Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">Error: {error}</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Edit Property</h1>
          <p className="text-gray-600 mt-1">Update property information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

              <Textarea
                name="description"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={handleChange}
                className="col-span-2"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}