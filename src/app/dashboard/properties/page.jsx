'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, MapPin, Users, Plus } from 'lucide-react'

export default function PropertiesPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

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
        *,
        manager:profiles!properties_manager_id_fkey(full_name),
        units(count)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    setProperties(data || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Properties</h2>
          <p className="text-gray-600 mt-1">{properties.length} properties</p>
        </div>
        <Link href="/dashboard/properties/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5" />
            Add Property
          </button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-gray-600 mb-4">Add your first property to get started</p>
            <Link href="/dashboard/properties/new">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Property
              </button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{property.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{property.property_type || 'Property'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{property.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{property.units?.[0]?.count || 0} units</span>
                    </div>
                  </div>

                  {property.manager && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">Manager</p>
                      <p className="text-sm font-medium">{property.manager.full_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}