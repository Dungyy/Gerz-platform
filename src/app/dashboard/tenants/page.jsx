'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Mail, Phone, MapPin, Plus, Search } from 'lucide-react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTenants()
  }, [])

  async function loadTenants() {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { data: tenantsData } = await supabase
      .from('profiles')
      .select(`
        *,
        unit:units!units_tenant_id_fkey(
          id,
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('organization_id', profile.organization_id)
      .eq('role', 'tenant')
      .order('full_name')

    setTenants(tenantsData || [])
    setLoading(false)
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Tenants</h2>
          <p className="text-gray-600 mt-1">{tenants.length} total tenants</p>
        </div>
        <Link href="/dashboard/tenants/new">
          <Button>
            <Plus className="h-5 w-5 mr-2" />
            Invite Tenant
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search tenants..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tenants Grid */}
      {filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tenants found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try a different search term' : 'Invite your first tenant to get started'}
            </p>
            {!searchQuery && (
              <Link href="/dashboard/tenants/new">
                <Button>
                  <Plus className="h-5 w-5 mr-2" />
                  Invite Tenant
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{tenant.full_name}</h3>
                    {tenant.unit && tenant.unit.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Unit {tenant.unit[0].unit_number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {tenant.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${tenant.email}`} className="hover:underline truncate">
                        {tenant.email}
                      </a>
                    </div>
                  )}
                  
                  {tenant.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${tenant.phone}`} className="hover:underline">
                        {tenant.phone}
                      </a>
                    </div>
                  )}

                  {tenant.unit && tenant.unit.length > 0 && tenant.unit[0].property && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">
                        {tenant.unit[0].property.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Joined {new Date(tenant.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}