'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
  Edit
} from 'lucide-react'

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [property, setProperty] = useState(null)
  const [units, setUnits] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProperty()
  }, [params.id])

  async function loadProperty() {
    // Load property details
    const { data: propertyData } = await supabase
      .from('properties')
      .select(`
        *,
        manager:profiles!properties_manager_id_fkey(full_name, email, phone)
      `)
      .eq('id', params.id)
      .single()

    setProperty(propertyData)

    // Load units
    const { data: unitsData } = await supabase
      .from('units')
      .select(`
        *,
        tenant:profiles(full_name, email, phone)
      `)
      .eq('property_id', params.id)
      .order('unit_number')

    setUnits(unitsData || [])

    // Load recent requests
    const { data: requestsData } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        unit:units(unit_number),
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name)
      `)
      .eq('property_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setRequests(requestsData || [])
    setLoading(false)
  }

  if (loading || !property) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

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
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Property
        </Button>
      </div>

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
                    className="flex items-center justify-between p-4 border rounded-lg"
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

          {/* Recent Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Requests</CardTitle>
                <Link href="/dashboard/requests" className="text-sm text-blue-600 hover:underline">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/dashboard/requests/${request.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{request.title}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Unit {request.unit?.unit_number} • {request.tenant?.full_name}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </Link>
                ))}

                {requests.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No requests</p>
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

              <div>
                <p className="text-sm text-gray-600">Year Built</p>
                <p className="font-medium">{property.year_built || 'N/A'}</p>
              </div>

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
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const variants = {
    submitted: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  return <Badge className={variants[status]}>{status.replace('_', ' ')}</Badge>
}