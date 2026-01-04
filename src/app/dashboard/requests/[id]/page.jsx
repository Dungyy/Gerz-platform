'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageLightbox } from '@/components/modals/image-lightbox'
import {
  ArrowLeft,
  User,
  Home,
  MessageSquare,
  Clock,
  Send,
  Lock,
  Building,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Wrench,
  CheckCircle2,
  Play,
  Pause,
  Image as ImageIcon,
  MoreVertical
} from 'lucide-react'
import Image from 'next/image'
import { toast } from "sonner";

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      await loadRequest()
      await loadComments()

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
      if (!response.ok) throw new Error(data?.error || 'Failed to load request')

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

      await logActivity({
        action: "Added comment",
        details: {
          comment_type: isInternal ? "internal_note" : "public_comment",
          comment_preview: newComment.substring(0, 50)
        },
        request_id: params.id,
      });

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to add comment')

      setNewComment('')
      setIsInternal(false)
      await loadComments()
      toast.success('Comment added')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error(`Error: ${error.message}`)
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
        toast.error('No changes to save')
        setUpdating(false)
        return
      }

      const response = await fetchWithAuth(`/api/requests/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      await logActivity({
        action: "Updated request",
        details: updates,
        request_id: params.id,
      });

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to update')

      toast.success('Request updated')
      await loadRequest()
      await loadComments()
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  async function handleQuickAction(action) {
    setUpdating(true)
    try {
      let updates = {}

      if (action === 'assign-me') {
        updates = { assigned_to: currentUser.id, status: 'assigned' }
      } else if (action === 'start') {
        updates = { status: 'in_progress' }
      } else if (action === 'complete') {
        if (!confirm('Mark as completed?')) {
          setUpdating(false)
          return
        }
        updates = { status: 'completed' }
      }

      const response = await fetchWithAuth(`/api/requests/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      await logActivity({
        action: "Updated request",
        details: updates,
        request_id: params.id,
      });

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to update')

      toast.success('Updated')
      await loadRequest()
      await loadComments()
    } catch (error) {
      console.error('Error updating:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  // Helper function to parse images
  function getImagesArray(images) {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse images:', e);
        return [];
      }
    }
    return [];
  }

  const canManage = profile?.role === 'manager' || profile?.role === 'owner'
  const canUpdate = canManage || (profile?.role === 'worker' && request?.assigned_to === currentUser?.id)
  const isTenant = profile?.role === 'tenant'
  const requestImages = request ? getImagesArray(request.images) : [];

  if (loading || !request) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading request...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border mt-0.5 sm:mt-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title & Status */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            {request.title}
          </h1>
          <StatusBadge status={request.status} />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
          <span>Unit {request.unit?.unit_number}</span>
          <span>•</span>
          <span className="capitalize">{request.category}</span>
          {requestImages.length > 0 && (
            <>
              <span>•</span>
              <span>{requestImages.length} photo{requestImages.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {canUpdate && request.status !== 'completed' && (
        <div className="flex gap-2 flex-wrap">
          {!request.assigned_to && (
            <Button
              size="sm"
              onClick={() => handleQuickAction('assign-me')}
              disabled={updating}
            >
              Assign to Me
            </Button>
          )}
          {request.assigned_to === currentUser?.id && request.status === 'assigned' && (
            <Button
              size="sm"
              onClick={() => handleQuickAction('start')}
              disabled={updating}
            >
              <Play className="h-4 w-4 mr-1.5" />
              Start Work
            </Button>
          )}
          {request.assigned_to === currentUser?.id && request.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => handleQuickAction('complete')}
              disabled={updating}
              variant="default"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Complete
            </Button>
          )}
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="p-5">
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            <p className="text-sm text-gray-900 leading-relaxed">
              {request.description}
            </p>
            {request.location_details && (
              <p className="text-sm text-gray-600 mt-2">
                Location: "{request.location_details}"
              </p>
            )}
          </div>

          {/* Photos */}
          {requestImages.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4" />
                <h3 className="text-sm font-semibold">
                  Photos ({requestImages.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {requestImages.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setLightboxIndex(index)
                      setLightboxOpen(true)
                    }}
                    className="group relative rounded-lg overflow-hidden border hover:border-gray-400 transition-all cursor-pointer"
                  >
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <InfoBox
              icon={Wrench}
              label="Assigned to"
              value={
                request.assigned_to_user
                  ? request.assigned_to === currentUser?.id
                    ? "You"
                    : request.assigned_to_user.full_name
                  : "Unassigned"
              }
            />
            <InfoBox
              icon={AlertCircle}
              label="Priority"
              value={<span className="capitalize">{request.priority}</span>}
            />
            <InfoBox
              icon={Clock}
              label="ETA"
              value={request.status === 'completed' ? 'Done' : 'Today'}
            />
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="text-sm font-semibold mb-3">Timeline</h3>
            <div className="space-y-2">
              <TimelineItem
                label="Submitted"
                value={formatTimestamp(request.created_at)}
              />
              {request.status !== 'submitted' && (
                <TimelineItem
                  label="Assigned"
                  value={formatTimestamp(request.updated_at)}
                />
              )}
              {request.status === 'in_progress' && (
                <TimelineItem
                  label="In progress"
                  value="Now"
                />
              )}
              {request.status === 'completed' && (
                <TimelineItem
                  label="Completed"
                  value={formatTimestamp(request.completed_at)}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Panel */}
      {canUpdate && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Manage Request</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Status
                </label>
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm h-10"
                >
                  <option value="submitted">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {canManage && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Assign Worker
                  </label>
                  <select
                    value={assignedWorker}
                    onChange={(e) => setAssignedWorker(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm h-10"
                  >
                    <option value="">Unassigned</option>
                    <option value={currentUser.id}>Me ({profile.full_name})</option>
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

              <Button
                onClick={handleUpdateRequest}
                disabled={updating}
                className="w-full h-10"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              Message Thread ({comments.length})
            </h3>
          </div>

          {/* Comments List */}
          <div className="space-y-3 mb-4">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">
                No messages yet
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border ${comment.is_internal
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-foreground text-background">
                {comment.user?.avatar_url ? (
                  <Image
                    src={comment.user.avatar_url}
                    alt={comment.user?.full_name || "User"}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-semibold text-sm">
                    {comment.user?.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
                      <div>
                        <p className="text-sm font-medium">
                          {comment.user?.full_name}
                        </p>
                        <p className="text-xs text-gray-600 capitalize">
                          {comment.user?.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {comment.is_internal && (
                        <Badge className="bg-yellow-200 text-yellow-800 text-xs border-0">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          Internal
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(comment.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mt-2">{comment.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="border-t pt-4 space-y-3">
            <Textarea
              placeholder="Add a message..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />

            {!isTenant && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="internal"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded h-4 w-4"
                />
                <label htmlFor="internal" className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <Lock className="h-3.5 w-3.5" />
                  Internal note (staff only)
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={commenting || !newComment.trim()}
              size="sm"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {commenting ? 'Posting...' : 'Post'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sidebar Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Property */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Property</h3>
            </div>
            <p className="text-sm font-medium mb-2">{request.property?.name}</p>
            <p className="text-xs text-gray-600">
              {request.property?.address}<br />
              {request.property?.city}, {request.property?.state}
            </p>
          </CardContent>
        </Card>

        {/* Tenant */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Tenant</h3>
            </div>
            <p className="text-sm font-medium mb-2">{request.tenant?.full_name}</p>
            {!isTenant && request.tenant?.email && (
              <a
                href={`mailto:${request.tenant.email}`}
                className="text-xs text-blue-600 hover:underline block mb-1"
              >
                {request.tenant.email}
              </a>
            )}
            {!isTenant && request.tenant?.phone && (
              <a
                href={`tel:${request.tenant.phone}`}
                className="text-xs text-blue-600 hover:underline block"
              >
                {request.tenant.phone}
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={requestImages}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={lightboxIndex}
      />
    </div>
  )
}

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function TimelineItem({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-600">{value}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const variants = {
    submitted: "bg-amber-100 text-amber-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-700",
  }

  const labels = {
    submitted: "Open",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Done",
    cancelled: "Cancelled",
  }

  return (
    <Badge className={`${variants[status]} text-sm font-medium px-2.5 py-1 border-0`}>
      {labels[status] || status}
    </Badge>
  )
}

function formatTimestamp(dateString) {
  if (!dateString) return "N/A"

  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hours ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}