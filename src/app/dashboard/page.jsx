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
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Plus,
  Home,
  User,
  Users,
  Building2,
  ClipboardList,
  ArrowRight
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

      setProfile(profileData)
      await loadRequests(user.id, profileData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  async function loadRequests(userId, profileData) {
    try {
      const response = await fetchWithAuth('/api/requests', { method: 'GET' })
      if (!response.ok) throw new Error('Failed to load requests')

      const data = await response.json()
      const requestsData = Array.isArray(data) ? data : []

      if (profileData.role === 'worker') {
        const myRequests = requestsData.filter(r => r.assigned_to === userId)
        const otherRequests = requestsData.filter(r => r.assigned_to !== userId)
        setRecentRequests([...myRequests.slice(0, 3), ...otherRequests.slice(0, 2)])
      } else {
        setRecentRequests(requestsData.slice(0, profileData.role === 'tenant' ? 10 : 5))
      }

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
      console.error('Error loading requests:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

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
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile.full_name}!</h1>
        <p className="text-muted-foreground mt-1">Submit and track your maintenance requests</p>
      </div>

      {/* Unit Info Card */}
      {unit && property && (
        <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Your Unit</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {property.name} - Unit {unit.unit_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {property.address}, {property.city}, {property.state}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats.total} />
        <StatCard title="Pending" value={stats.submitted} color="amber" />
        <StatCard title="In Progress" value={stats.inProgress} color="blue" />
        <StatCard title="Completed" value={stats.completed} color="green" />
      </div>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
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
        <Card className="shadow-sm border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Active Requests ({activeRequests.length})
              </CardTitle>
              <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                Needs Attention
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Maintenance Requests</CardTitle>
            {requests.length > 0 && (
              <Link href="/dashboard/requests" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <EmptyState 
              icon={Wrench}
              title="No Requests Yet"
              description="Submit your first maintenance request to get started"
              action={
                <Link href="/dashboard/requests/new">
                  <Button>
                    <Plus className="h-5 w-5 mr-2" />
                    Submit Request
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} showDescription />
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
        <h2 className="text-3xl font-bold tracking-tight">Worker Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Welcome back, {profile?.full_name} • {profile?.organization?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Assigned" value={stats.myAssigned} icon={User} color="blue" />
        <StatCard title="Available" value={stats.submitted} icon={Clock} color="amber" />
        <StatCard title="In Progress" value={stats.inProgress} icon={TrendingUp} color="purple" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="green" />
      </div>

      {/* Emergency Alert */}
      {stats.emergency > 0 && (
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">
                  {stats.emergency} Emergency Request{stats.emergency > 1 ? 's' : ''} Need Attention
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please review these high-priority requests
                </p>
              </div>
              <Link href="/dashboard/requests?priority=emergency">
                <Button>View Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Assigned Requests */}
      <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              My Assigned Requests ({myRequests.length})
            </CardTitle>
            {myRequests.length > 0 && (
              <Link href="/dashboard/requests?assigned=me" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <EmptyState 
              icon={ClipboardList}
              title="No Assigned Requests"
              description="Check available requests below to get started"
            />
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <RequestCard key={request.id} request={request} showProperty />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Requests */}
      {availableRequests.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Available Requests ({availableRequests.length})</CardTitle>
              <Link href="/dashboard/requests?status=submitted" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableRequests.slice(0, 5).map((request) => (
                <RequestCard key={request.id} request={request} showProperty available />
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
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Welcome back, {profile?.full_name} • {profile?.organization?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats.total} icon={Wrench} />
        <StatCard title="New Requests" value={stats.submitted} icon={Clock} color="amber" />
        <StatCard title="In Progress" value={stats.inProgress} icon={TrendingUp} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="green" />
      </div>

      {/* Emergency Alert */}
      {stats.emergency > 0 && (
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">
                  {stats.emergency} Emergency Request{stats.emergency > 1 ? 's' : ''} Require Attention
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please review and assign these requests immediately
                </p>
              </div>
              <Link href="/dashboard/requests?priority=emergency">
                <Button>View Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLinkCard 
          href="/dashboard/properties"
          icon={Building2}
          title="Properties"
          description="Manage properties and units"
          color="blue"
        />
        <QuickLinkCard 
          href="/dashboard/tenants"
          icon={Users}
          title="Tenants"
          description="View and invite tenants"
          color="green"
        />
        <QuickLinkCard 
          href="/dashboard/requests"
          icon={Wrench}
          title="Requests"
          description="Manage maintenance requests"
          color="amber"
        />
      </div>

      {/* Recent Requests */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Requests</CardTitle>
            <Link href="/dashboard/requests" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {requests?.length === 0 ? (
            <EmptyState 
              icon={Wrench}
              title="No Requests Yet"
              description="Requests will appear here once tenants submit them"
            />
          ) : (
            <div className="space-y-3">
              {requests?.map((request) => (
                <RequestCard key={request.id} request={request} showProperty showTenant />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================
function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    green: 'text-green-600 bg-green-500/10',
    purple: 'text-purple-600 bg-purple-500/10',
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          {Icon && (
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[color] || 'bg-muted'}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function QuickLinkCard({ href, icon: Icon, title, description, color }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
  }

  return (
    <Link href={href}>
      <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="pt-6 text-center">
          <div className={`grid h-12 w-12 place-items-center rounded-xl ${colors[color]} mx-auto mb-3`}>
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function RequestCard({ request, showDescription, showProperty, showTenant, available }) {
  return (
    <Link
      href={`/dashboard/requests/${request.id}`}
      className="block rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold">{request.title}</h4>
            <PriorityBadge priority={request.priority} />
            {!available && <StatusBadge status={request.status} />}
            {available && (
              <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15">
                Available
              </Badge>
            )}
          </div>
          
          {showDescription && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {request.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            {showProperty && request.property && (
              <span>{request.property.name} - Unit {request.unit?.unit_number}</span>
            )}
            {!showProperty && request.unit && (
              <span>Unit {request.unit.unit_number}</span>
            )}
            {showTenant && request.tenant && (
              <span>{request.tenant.full_name}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(request.created_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function PriorityBadge({ priority }) {
  const variants = {
    low: 'bg-gray-500/10 text-gray-700',
    medium: 'bg-blue-500/15 text-blue-700',
    high: 'bg-amber-500/15 text-amber-700',
    emergency: 'bg-red-500/15 text-red-700',
  }

  return (
    <Badge className={variants[priority] || variants.low}>
      {priority}
    </Badge>
  )
}

function StatusBadge({ status }) {
  const variants = {
    submitted: 'bg-amber-500/15 text-amber-700',
    assigned: 'bg-blue-500/15 text-blue-700',
    in_progress: 'bg-purple-500/15 text-purple-700',
    completed: 'bg-green-500/15 text-green-700',
    cancelled: 'bg-gray-500/10 text-gray-700',
  }

  const label = status?.replace('_', ' ') || 'pending'

  return (
    <Badge className={variants[status] || variants.submitted}>
      {label}
    </Badge>
  )
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted mx-auto mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      {action}
    </div>
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