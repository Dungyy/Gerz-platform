'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Mail, Phone, MapPin, Plus, Search } from 'lucide-react'
import { fetchWithAuth } from '@/lib/api-helper'

export default function TenantsPage() {
  const router = useRouter()

  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadTenants()
  }, [])

  async function loadTenants() {
    try {
      setLoading(true)
      setError('')

      const res = await fetchWithAuth('/api/tenants', { method: 'GET' })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error(data?.error || 'Failed to load tenants')

      setTenants(Array.isArray(data) ? data : data.tenants || [])
    } catch (e) {
      console.error(e)
      setError(e.message || 'Failed to load tenants')
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return tenants
    return tenants.filter((t) =>
      (t.full_name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q)
    )
  }, [tenants, searchQuery])

  if (loading) return <div className="flex justify-center py-12">Loading...</div>

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

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search tenants..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
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
          {filteredTenants.map((tenant) => {
            const unit = Array.isArray(tenant.unit) ? tenant.unit[0] : tenant.unit
            return (
              <Link key={tenant.id} href={`/dashboard/tenants/${tenant.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{tenant.full_name}</h3>
                        {unit?.unit_number && (
                          <p className="text-sm text-gray-600">Unit {unit.unit_number}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {tenant.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{tenant.email}</span>
                        </div>
                      )}

                      {tenant.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{tenant.phone}</span>
                        </div>
                      )}

                      {unit?.property?.name && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{unit.property.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        Joined {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
