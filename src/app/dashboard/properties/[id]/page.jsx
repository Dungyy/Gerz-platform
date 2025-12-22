'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  MapPin,
  User,
  Home,
  Plus,
  Mail,
  Phone,
  Edit,
  Trash2
} from 'lucide-react'

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

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

      console.log('✅ Property loaded:', data)
      setProperty(data)
    } catch (err) {
      console.error('Error loading property:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    const units = property?.units || []
    const occupiedUnits = units.filter(u => u.tenant_id).length

    // Warning if there are occupied units
    if (occupiedUnits > 0) {
      const confirmWithTenants = confirm(
        `⚠️ WARNING: This property has ${occupiedUnits} occupied unit${occupiedUnits > 1 ? 's' : ''}.\n\n` +
        `Deleting this property will:\n` +
        `• Remove all ${units.length} units\n` +
        `• Unassign ${occupiedUnits} tenant${occupiedUnits > 1 ? 's' : ''}\n` +
        `• Delete all maintenance requests for this property\n\n` +
        `This action CANNOT be undone!\n\n` +
        `Are you absolutely sure you want to delete "${property.name}"?`
      )

      if (!confirmWithTenants) return
    } else {
      // Standard confirmation
      const confirmed = confirm(
        `Are you sure you want to delete "${property.name}"?\n\n` +
        `This will permanently delete:\n` +
        `• The property\n` +
        `• All ${units.length} unit${units.length !== 1 ? 's' : ''}\n` +
        `• All maintenance requests\n\n` +
        `This action cannot be undone.`
      )

      if (!confirmed) return
    }

    setDeleting(true)

    try {
      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete property')
      }

      alert('✅ Property deleted successfully')
      router.push('/dashboard/properties')
    } catch (err) {
      console.error('Delete error:', err)
      alert(`❌ Error: ${err.message}`)
    } finally {
      setDeleting(false)
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

  if (!property) {
    return <div className="flex justify-center py-12">Property not found</div>
  }

  const units = property.units || []

  const occupiedUnits = units.filter(u => u.tenant_id).length
  const vacantUnits = units.length - occupiedUnits
  const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{property.name}</h2>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {property.address}, {property.city}, {property.state} {property.zip}
          </p>
        </div>
        {/* // Update the Edit button in the header */}
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/properties/${params.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Warning for occupied units */}
      {occupiedUnits > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4 flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-900">
                {occupiedUnits} Occupied Unit{occupiedUnits > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-orange-700 mt-1">
                This property has active tenants. Make sure to notify them before deleting.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Units</p>
              <p className="text-3xl font-bold mt-2">{units.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Occupied</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{occupiedUnits}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Vacant</p>
              <p className="text-3xl font-bold mt-2 text-orange-600">{vacantUnits}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Occupancy Rate</p>
              <p className="text-3xl font-bold mt-2 text-blue-600">{occupancyRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Units */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Units ({units.length})</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Home className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Unit {unit.unit_number}</p>
                        {unit.tenant ? (
                          <p className="text-sm text-gray-600">{unit.tenant.full_name}</p>
                        ) : (
                          <p className="text-sm text-orange-600">Vacant</p>
                        )}
                        {unit.bedrooms && unit.bathrooms && (
                          <p className="text-xs text-gray-500">
                            {unit.bedrooms} bed • {unit.bathrooms} bath
                            {unit.square_feet && ` • ${unit.square_feet} sq ft`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={unit.tenant ? 'default' : 'outline'}>
                      {unit.tenant ? 'Occupied' : 'Vacant'}
                    </Badge>
                  </div>
                ))}

                {units.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No units yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium capitalize">{property.property_type || 'Property'}</p>
              </div>

              {property.year_built && (
                <div>
                  <p className="text-sm text-gray-600">Year Built</p>
                  <p className="font-medium">{property.year_built}</p>
                </div>
              )}

              {property.description && (
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-sm mt-1">{property.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manager */}
          {property.manager && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Property Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold">{property.manager.full_name}</p>
                {property.manager.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${property.manager.email}`} className="hover:underline">
                      {property.manager.email}
                    </a>
                  </div>
                )}
                {property.manager.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${property.manager.phone}`} className="hover:underline">
                      {property.manager.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Deleting this property will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-1">
                <li>• All {units.length} unit{units.length !== 1 ? 's' : ''}</li>
                {occupiedUnits > 0 && (
                  <li className="text-orange-600 font-medium">
                    • {occupiedUnits} tenant assignment{occupiedUnits > 1 ? 's' : ''}
                  </li>
                )}
                <li>• All maintenance requests</li>
                <li>• All property history</li>
              </ul>
              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete Property'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}