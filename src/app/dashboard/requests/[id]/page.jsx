'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  MessageSquare,
  Paperclip,
  AlertCircle,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/api-helper'

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()

  // Next params can be string OR string[]
  const requestId = useMemo(() => {
    const raw = params?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [request, setRequest] = useState(null)
  const [profile, setProfile] = useState(null)
  const [comments, setComments] = useState([])
  const [staff, setStaff] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')

  useEffect(() => {
    if (!requestId) return
    void loadData(requestId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  async function loadData(id) {
    try {
      setLoading(true)

      const { data, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr

      const user = data?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileErr) throw profileErr
      setProfile(profileData)

      const { data: requestData, error: reqErr } = await supabase
        .from('maintenance_requests')
        .select(
          `
          *,
          property:properties(name, address, city, state, zip),
          unit:units(unit_number, floor),
          tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email, phone),
          assigned:profiles!maintenance_requests_assigned_to_fkey(full_name, email, phone)
        `
        )
        .eq('id', id)
        .single()

      if (reqErr) throw reqErr
      setRequest(requestData)

      // comments depend on role filter, so load AFTER profile role exists
      await loadComments(id, profileData?.role)

      // Load staff for assignment (non-tenant only)
      if (profileData?.role !== 'tenant') {
        const { data: staffData, error: staffErr } = await supabase
          .from('maintenance_staff')
          .select('*, profile:profiles(full_name, email)')
          .eq('organization_id', profileData.organization_id)

        if (staffErr) throw staffErr
        setStaff(staffData || [])
      } else {
        setStaff([])
      }
    } catch (err) {
      console.error('Failed to load request detail:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadComments(id, role) {
    let query = supabase
      .from('request_comments')
      .select(
        `
        *,
        author:profiles(full_name, role)
      `
      )
      .eq('request_id', id)
      .order('created_at', { ascending: true })

    if (role === 'tenant') {
      query = query.eq('is_internal', false)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to load comments:', error)
      setComments([])
      return
    }

    setComments(data || [])
  }

  async function handleAddComment() {
    if (!newComment.trim() || !requestId) return

    const response = await fetchWithAuth(`/api/requests/${requestId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: newComment,
        is_internal: Boolean(isInternal && profile?.role !== 'tenant'),
      }),
    })

    if (response.ok) {
      setNewComment('')
      setIsInternal(false)
      await loadComments(requestId, profile?.role)
    } else {
      console.error('Failed to add comment:', await response.text())
    }
  }

  async function handleAssign(staffId) {
    if (!requestId) return

    const response = await fetchWithAuth(`/api/requests/${requestId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId }),
    })

    if (response.ok) {
      setShowAssignModal(false)
      await loadData(requestId)
    } else {
      console.error('Failed to assign:', await response.text())
    }
  }

  async function handleStatusUpdate(newStatus) {
    if (!requestId) return

    const response = await fetchWithAuth(`/api/requests/${requestId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        resolution_notes: newStatus === 'completed' ? resolutionNotes : null,
      }),
    })

    if (response.ok) {
      setShowCompleteModal(false)
      setResolutionNotes('')
      await loadData(requestId)
    } else {
      console.error('Failed to update status:', await response.text())
    }
  }

  if (loading || !request) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  const canManage = profile?.role !== 'tenant'
  const isAssigned = Boolean(profile?.id && request?.assigned_to === profile.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{request.title}</h2>
          <p className="text-gray-600 mt-1">Request #{String(request.id || '').slice(0, 8)}</p>
        </div>
        <div className="flex gap-2">
          <PriorityBadge priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Emergency Alert */}
          {request.priority === 'emergency' && request.status !== 'completed' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Emergency Request</h3>
                    <p className="text-sm text-red-700">This request requires immediate attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {request.description || 'No description provided'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {request.category}
                </Badge>
                <Badge variant="outline">{formatDate(request.created_at)}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Photos (FIXED) */}
          {Array.isArray(request.photo_urls) && request.photo_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Photos ({request.photo_urls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.photo_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule */}
          {(request.preferred_date || request.preferred_time) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Preferred Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.preferred_date && (
                    <p className="text-gray-700">Date: {formatDate(request.preferred_date)}</p>
                  )}
                  {request.preferred_time && (
                    <p className="text-gray-700 capitalize">Time: {request.preferred_time}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    Entry allowed: {request.entry_allowed ? 'Yes' : 'No'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolution Notes */}
          {request.status === 'completed' && request.resolution_notes && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">Resolution Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-800">{request.resolution_notes}</p>
                {request.completed_at && (
                  <p className="text-sm text-green-700 mt-2">
                    Completed on {formatDate(request.completed_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{comment.author?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {comment.author?.role || ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {formatDateTime(comment.created_at)}
                        </p>
                        {comment.is_internal && (
                          <Badge className="bg-yellow-600 text-xs mt-1">Internal</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No comments yet</p>
                )}
              </div>

              <div className="border-t pt-4">
                <Textarea
                  rows={3}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-3"
                />

                {canManage && (
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="internal-note"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="internal-note" className="text-sm text-gray-700">
                      Internal note (hidden from tenant)
                    </label>
                  </div>
                )}

                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.status === 'submitted' && (
                  <Button onClick={() => setShowAssignModal(true)} className="w-full">
                    Assign to Staff
                  </Button>
                )}

                {request.status === 'assigned' && isAssigned && (
                  <Button onClick={() => handleStatusUpdate('in_progress')} className="w-full">
                    Start Work
                  </Button>
                )}

                {request.status === 'in_progress' && isAssigned && (
                  <Button
                    onClick={() => setShowCompleteModal(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Mark Complete
                  </Button>
                )}

                {request.status !== 'completed' && request.status !== 'cancelled' && (
                  <Button
                    onClick={() => handleStatusUpdate('cancelled')}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel Request
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem icon={Clock} label="Submitted" date={request.created_at} completed />
                <TimelineItem
                  icon={User}
                  label="Assigned"
                  date={request.assigned_at}
                  completed={!!request.assigned_at}
                />
                <TimelineItem
                  icon={Clock}
                  label="In Progress"
                  date={request.in_progress_at || null}
                  completed={request.status === 'in_progress' || request.status === 'completed'}
                />
                <TimelineItem
                  icon={CheckCircle}
                  label="Completed"
                  date={request.completed_at}
                  completed={request.status === 'completed'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold">{request.property?.name || '—'}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Unit {request.unit?.unit_number || '—'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {request.property?.address || ''}
                <br />
                {request.property?.city || ''}, {request.property?.state || ''}{' '}
                {request.property?.zip || ''}
              </p>
            </CardContent>
          </Card>

          {/* Tenant Info (for staff) */}
          {canManage && request.tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Tenant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold">{request.tenant.full_name}</p>

                {request.tenant.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${request.tenant.email}`} className="hover:underline">
                      {request.tenant.email}
                    </a>
                  </div>
                )}

                {request.tenant.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${request.tenant.phone}`} className="hover:underline">
                      {request.tenant.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assigned Staff */}
          {request.assigned && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{request.assigned.full_name}</p>
                {request.assigned.email && (
                  <p className="text-sm text-gray-600 mt-1">{request.assigned.email}</p>
                )}
                {request.assigned.phone && (
                  <p className="text-sm text-gray-600">{request.assigned.phone}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Assign to Staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staff.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAssign(member.profile_id)}
                  className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <p className="font-semibold">{member.profile?.full_name || 'Unknown'}</p>
                  {Array.isArray(member.specialties) && member.specialties.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{member.specialties.join(', ')}</p>
                  )}
                </button>
              ))}

              <Button
                onClick={() => setShowAssignModal(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Mark as Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Resolution Notes (optional)
                </label>
                <Textarea
                  rows={4}
                  placeholder="Describe what was done to resolve the issue..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCompleteModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('completed')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function TimelineItem({ icon: Icon, label, date, completed }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-full ${completed ? 'bg-green-100' : 'bg-gray-100'}`}>
        <Icon className={`h-4 w-4 ${completed ? 'text-green-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1">
        <p className={`font-medium ${completed ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
        {date && <p className="text-xs text-gray-500">{formatDateTime(date)}</p>}
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

  const p = priority || 'low'
  return <Badge className={variants[p] || variants.low}>{p}</Badge>
}

function StatusBadge({ status }) {
  const variants = {
    submitted: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  const s = status || 'submitted'
  return <Badge className={variants[s] || variants.submitted}>{String(s).replaceAll('_', ' ')}</Badge>
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
