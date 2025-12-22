'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-helper'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
  ArrowLeft,
  Wrench,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  Trash2,
} from 'lucide-react'

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [staffMember, setStaffMember] = useState(null)
  const [assignedRequests, setAssignedRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  async function loadAll() {
    try {
      setLoading(true)
      setError('')

      // 1) staff detail
      const staffRes = await fetchWithAuth(`/api/staff/${params.id}`, { method: 'GET' })
      if (staffRes.status === 401) {
        router.push('/login')
        return
      }
      const staffData = await staffRes.json().catch(() => null)
      if (!staffRes.ok) throw new Error(staffData?.error || 'Failed to load staff member')
      setStaffMember(staffData)

      // 2) assigned requests
      const reqRes = await fetchWithAuth(`/api/staff/${params.id}/requests`, { method: 'GET' })
      const reqData = await reqRes.json().catch(() => [])
      if (!reqRes.ok) throw new Error(reqData?.error || 'Failed to load assigned requests')
      setAssignedRequests(Array.isArray(reqData) ? reqData : reqData.requests || [])
    } catch (err) {
      console.error('Load staff detail error:', err)
      setError(err.message || 'Failed to load staff member.')
      setStaffMember(null)
      setAssignedRequests([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to remove this staff member? This cannot be undone.')) return

    try {
      const res = await fetchWithAuth(`/api/staff/${params.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(data?.error || 'Failed to remove staff member')

      alert('Staff member removed successfully')
      router.push('/dashboard/staff')
    } catch (err) {
      console.error('Delete staff error:', err)
      alert(err.message || 'Error removing staff member')
    }
  }

  const profile = staffMember?.profile || staffMember?.profiles || {}
  const specialties = staffMember?.specialties || []

  const activeRequests = assignedRequests.filter(
    (r) => r.status !== 'completed' && r.status !== 'cancelled'
  )
  const completedRequests = assignedRequests.filter((r) => r.status === 'completed')

  const joinedText = useMemo(() => {
    const created = profile?.created_at || staffMember?.created_at
    if (!created) return '—'
    return new Date(created).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }, [profile?.created_at, staffMember?.created_at])

  if (loading) return <div className="flex justify-center py-12">Loading...</div>

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      </div>
    )
  }

  if (!staffMember) return <div className="flex justify-center py-12">Not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1">
          <h2 className="text-3xl font-bold">{profile?.full_name || 'Staff Member'}</h2>
          <p className="text-gray-600 mt-1">Maintenance Staff</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="text-red-600" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-600">Total Assigned</p>
            <p className="text-3xl font-bold mt-2">{assignedRequests.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold mt-2 text-blue-600">{activeRequests.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-3xl font-bold mt-2 text-green-600">{completedRequests.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <a href={`mailto:${profile.email}`} className="font-medium hover:text-blue-600">
                      {profile.email}
                    </a>
                  </div>
                </div>
              )}

              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <a href={`tel:${profile.phone}`} className="font-medium hover:text-blue-600">
                      {profile.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Joined</p>
                  <p className="font-medium">{joinedText}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Assigned Requests ({assignedRequests.length})
                </CardTitle>
                <Link href="/dashboard/requests" className="text-sm text-blue-600 hover:underline">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No assigned requests</p>
                ) : (
                  assignedRequests.map((request) => (
                    <Link
                      key={request.id}
                      href={`/dashboard/requests/${request.id}`}
                      className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{request.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {request.property?.name} - Unit {request.unit?.unit_number}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {request.tenant?.full_name} •{' '}
                            {request.created_at ? new Date(request.created_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <PriorityBadge priority={request.priority} />
                          <StatusBadge status={request.status} />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Specialties */}
          <Card>
            <CardHeader>
              <CardTitle>Specialties</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(specialties) && specialties.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s, idx) => (
                    <Badge key={`${s}-${idx}`} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No specialties listed</p>
              )}
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="font-semibold">
                    {assignedRequests.length > 0
                      ? Math.round((completedRequests.length / assignedRequests.length) * 100)
                      : 0}
                    %
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${
                        assignedRequests.length > 0
                          ? (completedRequests.length / assignedRequests.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  Active Tasks
                </div>
                <span className="font-semibold">{activeRequests.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </div>
                <span className="font-semibold">{completedRequests.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PriorityBadge({ priority }) {
  const variants = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    emergency: 'bg-red-100 text-red-700',
  }
  return <Badge className={variants[priority] || variants.low}>{priority || 'low'}</Badge>
}

function StatusBadge({ status }) {
  const variants = {
    submitted: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }
  const label = status ? String(status).replace('_', ' ') : 'submitted'
  return <Badge className={variants[status] || variants.submitted}>{label}</Badge>
}
