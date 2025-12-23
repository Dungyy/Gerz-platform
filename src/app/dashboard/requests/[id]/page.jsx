'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
// import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  User, 
  Home, 
  Calendar, 
  MessageSquare,
  Clock,
  CheckCircle,
  Send,
  Lock,
  // Unlock
} from 'lucide-react'

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  
  const [request, setRequest] = useState(null)
  const [comments, setComments] = useState([])
  const [workers, setWorkers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [commenting, setCommenting] = useState(false)
  
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState('')
  const [assignedWorker, setAssignedWorker] = useState('')

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // Load request
      await loadRequest()
      
      // Load comments
      await loadComments()

      // Load workers if manager/owner
      if (profileData?.role === 'manager' || profileData?.role === 'owner') {
        await loadWorkers()
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  async function loadRequest() {
    try {
      const response = await fetchWithAuth(`/api/requests/${params.id}`, {
        method: 'GET'
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load request')
      }

      setRequest(data)
      setStatusUpdate(data.status)
      setAssignedWorker(data.assigned_to || '')
    } catch (error) {
      console.error('Error loading request:', error)
    }
  }

  async function loadComments() {
    try {
      const response = await fetchWithAuth(`/api/requests/${params.id}/comments`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        setComments(Array.isArray(data) ? data : [])
      } else {
        setComments([])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
      setComments([])
    }
  }

  async function loadWorkers() {
    try {
      const response = await fetchWithAuth('/api/workers', {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        setWorkers(data)
      }
    } catch (error) {
      console.error('Error loading workers:', error)
    }
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return

    setCommenting(true)

    try {
      const response = await fetchWithAuth(`/api/requests/${params.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          comment: newComment,
          is_internal: isInternal,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add comment')
      }

      console.log('✅ Comment added')
      setNewComment('')
      setIsInternal(false)
      await loadComments()
    } catch (error) {
      console.error('Error adding comment:', error)
      alert(`❌ Error: ${error.message}`)
    } finally {
      setCommenting(false)
    }
  }

  async function handleUpdateRequest() {
    setUpdating(true)

    try {
      const updates = {}

      if (statusUpdate !== request.status) {
        updates.status = statusUpdate
      }

      if (assignedWorker !== request.assigned_to) {
        updates.assigned_to = assignedWorker || null
      }

      if (Object.keys(updates).length === 0) {
        alert('No changes to save')
        setUpdating(false)
        return
      }

      const response = await fetchWithAuth(`/api/requests/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update request')
      }

      console.log('✅ Request updated')
      alert('✅ Request updated successfully!')
      await loadRequest()
    } catch (error) {
      console.error('Error updating request:', error)
      alert(`❌ Error: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !request) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading request...</p>
        </div>
      </div>
    )
  }

  const canManage = profile?.role === 'manager' || profile?.role === 'owner'
  const canUpdate = canManage || (profile?.role === 'worker' && request.assigned_to === currentUser?.id)
  const isTenant = profile?.role === 'tenant'

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
          <h1 className="text-3xl font-bold">{request.title}</h1>
          <p className="text-gray-600 mt-1">
            Request #{request.id.substring(0, 8)}
          </p>
        </div>
        <div className="flex gap-2">
          <PriorityBadge priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="mt-1">{request.description}</p>
              </div>

              {request.location_details && (
                <div>
                  <p className="text-sm text-gray-600">Specific Location</p>
                  <p className="mt-1">{request.location_details}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="mt-1 capitalize">{request.category}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="mt-1">
                    {new Date(request.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Images */}
              {request.images && request.images.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Photos</p>
                  <div className="grid grid-cols-3 gap-4">
                    {request.images.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <img
                          src={url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border group-hover:shadow-lg transition-shadow"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

{/* Management Panel (Manager/Worker Only) */}
{canUpdate && (
  <Card className="border-blue-200 bg-blue-50">
    <CardHeader>
      <CardTitle className="text-blue-900">Manage Request</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Quick Self-Assignment (Worker/Manager) */}
      {!request.assigned_to && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900 mb-2">
            Not assigned yet
          </p>
          <Button
            onClick={async () => {
              setUpdating(true)
              try {
                const response = await fetchWithAuth(`/api/requests/${params.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    assigned_to: currentUser.id,
                    status: 'assigned'
                  }),
                })

                const data = await response.json()

                if (!response.ok) {
                  throw new Error(data?.error || 'Failed to assign')
                }

                alert('✅ Request assigned to you!')
                await loadRequest()
                await loadComments()
              } catch (error) {
                console.error('Error self-assigning:', error)
                alert(`❌ Error: ${error.message}`)
              } finally {
                setUpdating(false)
              }
            }}
            disabled={updating}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {updating ? 'Assigning...' : '🙋 Assign to Me'}
          </Button>
        </div>
      )}

      {/* Current Assignment Info */}
      {request.assigned_to && (
        <div className="p-3 bg-white border rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Currently assigned to:</p>
          <p className="font-semibold">
            {request.assigned_to === currentUser?.id ? (
              <span className="text-green-600">You</span>
            ) : (
              request.assigned_to_user?.full_name
            )}
          </p>
        </div>
      )}

      {/* Status Update */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Status
        </label>
        <select
          value={statusUpdate}
          onChange={(e) => setStatusUpdate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="submitted">Submitted</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Worker Assignment (Manager Only) */}
      {canManage && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Assign to Worker
          </label>
          <select
            value={assignedWorker}
            onChange={(e) => setAssignedWorker(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">-- Unassigned --</option>
            <option value={currentUser.id}>Myself ({profile.full_name})</option>
            {workers
              .filter(w => w.id !== currentUser.id)
              .map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.full_name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Update Button */}
      <Button
        onClick={handleUpdateRequest}
        disabled={updating}
        className="w-full"
      >
        {updating ? 'Updating...' : 'Update Request'}
      </Button>

      {/* Mark Complete Quick Action (if assigned to current user) */}
      {request.assigned_to === currentUser?.id && request.status !== 'completed' && (
        <Button
          onClick={async () => {
            if (!confirm('Mark this request as completed?')) return
            
            setUpdating(true)
            try {
              const response = await fetchWithAuth(`/api/requests/${params.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  status: 'completed'
                }),
              })

              const data = await response.json()

              if (!response.ok) {
                throw new Error(data?.error || 'Failed to update')
              }

              alert('✅ Request marked as completed!')
              await loadRequest()
              await loadComments()
            } catch (error) {
              console.error('Error completing request:', error)
              alert(`❌ Error: ${error.message}`)
            } finally {
              setUpdating(false)
            }
          }}
          disabled={updating}
          className="w-full bg-green-600 hover:bg-green-700"
          variant="outline"
        >
          ✅ Mark as Completed
        </Button>
      )}
    </CardContent>
  </Card>
)}

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comments List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg ${
                        comment.is_internal
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {comment.user?.full_name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {comment.user?.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {comment.is_internal && (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Internal
                            </Badge>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="border-t pt-4">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="mb-3"
                />

                {/* Internal Comment Toggle (Staff Only) */}
                {!isTenant && (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="internal"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded h-4 w-4"
                    />
                    <label htmlFor="internal" className="text-sm flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Internal note (visible to staff only)
                    </label>
                  </div>
                )}

                <Button type="submit" disabled={commenting || !newComment.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {commenting ? 'Posting...' : 'Post Comment'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property & Unit Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Property</p>
                <p className="font-semibold">{request.property?.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-sm">
                  {request.property?.address}<br />
                  {request.property?.city}, {request.property?.state} {request.property?.zip}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Unit</p>
                <p className="font-semibold">#{request.unit?.unit_number}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{request.tenant?.full_name}</p>
              </div>

              {!isTenant && (
                <>
                  {request.tenant?.email && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <a
                        href={`mailto:${request.tenant.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {request.tenant.email}
                      </a>
                    </div>
                  )}

                  {request.tenant?.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <a
                        href={`tel:${request.tenant.phone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {request.tenant.phone}
                      </a>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Assigned Worker */}
          {request.assigned_to_user && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assigned Worker
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold text-green-900">
                    {request.assigned_to_user.full_name}
                  </p>
                </div>

                {!isTenant && (
                  <>
                    {request.assigned_to_user.email && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <a
                          href={`mailto:${request.assigned_to_user.email}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {request.assigned_to_user.email}
                        </a>
                      </div>
                    )}

                    {request.assigned_to_user.phone && (
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <a
                          href={`tel:${request.assigned_to_user.phone}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {request.assigned_to_user.phone}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {request.updated_at !== request.created_at && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
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

  return (
    <Badge className={variants[priority] || 'bg-gray-100 text-gray-700'}>
      {priority}
    </Badge>
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

  return (
    <Badge className={variants[status] || 'bg-gray-100 text-gray-700'}>
      {status?.replace('_', ' ')}
    </Badge>
  )
}