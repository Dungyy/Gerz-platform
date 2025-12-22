'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-helper'
import { supabase } from '@/lib/supabase'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCog, Mail, Phone, Plus, Wrench } from 'lucide-react'

export default function StaffPage() {
  const router = useRouter()

  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    checkPermissions()
    loadStaff()
  }, [])

  async function checkPermissions() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setCanManage(profile?.role === 'owner' || profile?.role === 'manager')
    } catch (err) {
      console.error('Permission check error:', err)
    }
  }

  async function loadStaff() {
    try {
      setLoading(true)
      setError('')

      const response = await fetchWithAuth('/api/staff', { method: 'GET' })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load staff')
      }

      setStaff(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load staff:', err)
      setError(err.message || 'Failed to load staff.')
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Maintenance Staff</h2>
          <p className="text-gray-600 mt-1">{staff.length} staff members</p>
        </div>

        {canManage && (
          <Button asChild>
            <Link href="/dashboard/staff/new">
              <Plus className="h-5 w-5 mr-2" />
              Add Staff
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Staff Grid */}
      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No staff members yet</h3>
            <p className="text-gray-600 mb-4">Add maintenance staff to assign requests</p>

            {canManage && (
              <Button asChild>
                <Link href="/dashboard/staff/new">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Staff
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => {
            const p = member?.profile || {}
            return (
              <Link key={member.id} href={`/dashboard/staff/${member.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{p.full_name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-600">Maintenance Staff</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {p.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span className="truncate" title={p.email}>
                            {p.email}
                          </span>
                        </div>
                      )}

                      {p.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                    </div>

                    {Array.isArray(member.specialties) && member.specialties.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Specialties</p>
                        <div className="flex flex-wrap gap-1">
                          {member.specialties.slice(0, 3).map((specialty, idx) => (
                            <Badge key={`${specialty}-${idx}`} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {member.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
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