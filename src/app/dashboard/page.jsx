'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Plus,
  Home,
  User,
  Users,
  Building,
  ClipboardList
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    inProgress: 0,
    completed: 0,
    emergency: 0,
    myAssigned: 0,
  })
  const [recentRequests, setRecentRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)
      console.log('👤 Loading dashboard for:', user.email)

      // Get profile with organization and unit info
      const { data: profileData } = await supabase
        .from('profiles')
        .select(`
          *,
          organization:organizations(*),
          unit:units!units_tenant_id_fkey(
            id,
            unit_number,
            property:properties(
              id,
              name,
              address,
              city,
              state,
              zip
            )
          )
        `)
        .eq('id', user.id)
        .single()

      console.log('✅ Profile loaded:', profileData?.role)
      setProfile(profileData)

      // Load requests based on role
      await loadRequests(user.id, profileData)

      setLoading(false)
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      setLoading(false)
    }
  }

  async function loadRequests(userId, profileData) {
    try {
      const response = await fetchWithAuth('/api/requests', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load requests')
      }

      const data = await response.json()
      const requestsData = Array.isArray(data) ? data : []

      console.log('📊 Loaded', requestsData.length, 'requests')

      // Set recent requests based on role
      if (profileData.role === 'worker') {
        // Workers see their assigned requests first
        const myRequests = requestsData.filter(r => r.assigned_to === userId)
        const otherRequests = requestsData.filter(r => r.assigned_to !== userId)
        setRecentRequests([...myRequests.slice(0, 3), ...otherRequests.slice(0, 2)])
      } else {
        setRecentRequests(requestsData.slice(0, profileData.role === 'tenant' ? 10 : 5))
      }

      // Calculate stats
      const myAssigned = requestsData.filter(r => r.assigned_to === userId).length
      
      setStats({
        total: requestsData.length,
        submitted: requestsData.filter(r => r.status === 'submitted').length,
        inProgress: requestsData.filter(r => r.status === 'in_progress' || r.status === 'assigned').length,
        completed: requestsData.filter(r => r.status === 'completed').length,
        emergency: requestsData.filter(r => r.priority === 'emergency' && r.status !== 'completed').length,
        myAssigned: myAssigned,
      })
    } catch (error) {
      console.error('❌ Error loading requests:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Render based on role
  if (profile?.role === 'tenant') {
    return <TenantDashboard profile={profile} stats={stats} requests={recentRequests} />
  }

  if (profile?.role === 'worker') {
    return <WorkerDashboard profile={profile} stats={stats} requests={recentRequests} currentUserId={currentUserId} />
  }

  return <ManagerDashboard profile={profile} stats={stats} requests={recentRequests} />
}

// ============================================
// TENANT DASHBOARD
// ============================================
function TenantDashboard({ profile, stats, requests }) {
  const activeRequests = requests?.filter(r => r.status !== 'completed' && r.status !== 'cancelled') || []
  const unit = profile.unit && profile.unit.length > 0 ? profile.unit[0] : null
  const property = unit?.property

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome, {profile.full_name}!</h1>
        <p className="text-gray-600 mt-1">Submit and track your maintenance requests</p>
      </div>

      {/* Unit Info Card */}
      {unit && property && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Your Unit</p>
                <p className="text-sm text-blue-700 mt-1">
                  {property.name} - Unit {unit.unit_number}
                </p>
                <p className="text-sm text-blue-600">
                  {property.address}, {property.city}, {property.state}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold mt-2 text-yellow-600">{stats.submitted}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-3xl font-bold mt-2 text-blue-600">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/requests/new">
            <Button size="lg" className="w-full">
              <Plus className="h-5 w-5 mr-2" />
              Submit New Maintenance Request
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">
              Active Requests ({activeRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-4 bg-white border border-orange-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{request.title}</h4>
                        <PriorityBadge priority={request.priority} />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Unit {request.unit?.unit_number} • {formatDate(request.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Maintenance Requests</CardTitle>
            {requests.length > 0 && (
              <Link href="/dashboard/requests" className="text-sm text-blue-600 hover:underline">
                View All
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
              <p className="text-gray-600 mb-4">
                Submit your first maintenance request to get started
              </p>
              <Link href="/dashboard/requests/new">
                <Button>
                  <Plus className="h-5 w-5 mr-2" />
                  Submit Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{request.title}</h4>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {request.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(request.created_at)}
                        </span>
                        {request.priority && (
                          <span className="capitalize">{request.priority} priority</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// WORKER DASHBOARD
// ============================================
function WorkerDashboard({ profile, stats, requests, currentUserId }) {
  const myRequests = requests?.filter(r => r.assigned_to === currentUserId) || []
  const availableRequests = requests?.filter(r => !r.assigned_to && r.status === 'submitted') || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Worker Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Welcome back, {profile?.full_name} • {profile?.organization?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="My Assigned" 
          value={stats.myAssigned} 
          icon={User} 
          color="blue" 
        />
        <StatsCard 
          title="Available" 
          value={stats.submitted} 
          icon={Clock} 
          color="yellow" 
        />
        <StatsCard 
          title="In Progress" 
          value={stats.inProgress} 
          icon={TrendingUp} 
          color="purple" 
        />
        <StatsCard 
          title="Completed" 
          value={stats.completed} 
          icon={CheckCircle} 
          color="green" 
        />
      </div>

      {/* Emergency Alerts */}
      {stats.emergency > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">
                  {stats.emergency} Emergency Request{stats.emergency > 1 ? 's' : ''} Need Attention
                </h3>
                <p className="text-sm text-red-700">
                  Please review these high-priority requests
                </p>
              </div>
              <Link href="/dashboard/requests?priority=emergency">
                <Button variant="outline" className="bg-red-600 text-white hover:bg-red-700">
                  View Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Assigned Requests */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-blue-900">
              My Assigned Requests ({myRequests.length})
            </CardTitle>
            {myRequests.length > 0 && (
              <Link href="/dashboard/requests?assigned=me" className="text-sm text-blue-600 hover:underline">
                View All
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No requests assigned to you yet</p>
              <p className="text-sm text-gray-400 mt-1">Check available requests below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-4 bg-white border border-blue-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{request.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {request.property?.name} - Unit {request.unit?.unit_number}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {request.tenant?.full_name} • {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <PriorityBadge priority={request.priority} />
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Requests */}
      {availableRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Available Requests ({availableRequests.length})</CardTitle>
              <Link href="/dashboard/requests?status=submitted" className="text-sm text-blue-600 hover:underline">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableRequests.slice(0, 5).map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{request.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {request.property?.name} - Unit {request.unit?.unit_number}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {request.tenant?.full_name} • {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <PriorityBadge priority={request.priority} />
                      <Badge className="bg-green-100 text-green-700">Available</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// MANAGER/OWNER DASHBOARD
// ============================================
function ManagerDashboard({ profile, stats, requests }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Welcome back, {profile?.full_name} • {profile?.organization?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Requests" 
          value={stats.total} 
          icon={Wrench} 
          color="blue" 
        />
        <StatsCard 
          title="New Requests" 
          value={stats.submitted} 
          icon={Clock} 
          color="yellow" 
        />
        <StatsCard 
          title="In Progress" 
          value={stats.inProgress} 
          icon={TrendingUp} 
          color="blue" 
        />
        <StatsCard 
          title="Completed" 
          value={stats.completed} 
          icon={CheckCircle} 
          color="green" 
        />
      </div>

      {/* Emergency Alerts */}
      {stats.emergency > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">
                  {stats.emergency} Emergency Request{stats.emergency > 1 ? 's' : ''} Require Attention
                </h3>
                <p className="text-sm text-red-700">
                  Please review and assign these requests immediately
                </p>
              </div>
              <Link href="/dashboard/requests?priority=emergency">
                <Button variant="outline" className="bg-red-600 text-white hover:bg-red-700">
                  View Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/properties">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 bg-blue-100 rounded-lg inline-block mb-3">
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg">Properties</h3>
              <p className="text-sm text-gray-600 mt-1">Manage properties and units</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tenants">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 bg-green-100 rounded-lg inline-block mb-3">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Tenants</h3>
              <p className="text-sm text-gray-600 mt-1">View and invite tenants</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/requests">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 bg-orange-100 rounded-lg inline-block mb-3">
                <Wrench className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg">Requests</h3>
              <p className="text-sm text-gray-600 mt-1">Manage maintenance requests</p>
            </CardContent>
          </Card>
        </Link>
      </div>

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
            {requests?.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No requests yet</p>
              </div>
            ) : (
              requests?.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{request.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {request.property?.name} - Unit {request.unit?.unit_number}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {request.tenant?.full_name} • {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
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
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================
function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
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

  const label = status?.replace('_', ' ') || 'pending'

  return (
    <Badge className={variants[status] || 'bg-gray-100 text-gray-700'}>
      {label}
    </Badge>
  )
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInHours < 48) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}