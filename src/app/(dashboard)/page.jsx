'user client'

import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from 'src/components/ui/card'
import { Badge } from 'src/components/ui/badge'
import Link from 'next/link'
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  // Different dashboard based on role
  if (profile.role === 'tenant') {
    return <TenantDashboard userId={user.id} profile={profile} />
  } else {
    return <ManagerDashboard userId={user.id} profile={profile} />
  }
}

async function ManagerDashboard({ userId, profile }) {
  const supabase = createServerClient()

  // Get stats
  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('organization_id', profile.organization_id)

  const stats = {
    total: requests?.length || 0,
    submitted: requests?.filter(r => r.status === 'submitted').length || 0,
    inProgress: requests?.filter(r => r.status === 'in_progress' || r.status === 'assigned').length || 0,
    completed: requests?.filter(r => r.status === 'completed').length || 0,
    emergency: requests?.filter(r => r.priority === 'emergency' && r.status !== 'completed').length || 0,
  }

  // Get recent requests
  const { data: recentRequests } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(name),
      unit:units(unit_number),
      tenant:profiles!maintenance_requests_tenant_id_fkey(full_name)
    `)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-gray-600 mt-1">Overview of all maintenance requests</p>
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
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">
                  {stats.emergency} Emergency Request{stats.emergency > 1 ? 's' : ''} Require Attention
                </h3>
                <p className="text-sm text-red-700">
                  Please review and assign these requests immediately
                </p>
              </div>
              <Link href="/dashboard/requests?priority=emergency" className="ml-auto">
                <Badge className="bg-red-600">View Now</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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
            {recentRequests?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No requests yet</p>
            ) : (
              recentRequests?.map((request) => (
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

async function TenantDashboard({ userId, profile }) {
  const supabase = createServerClient()

  // Get tenant's requests
  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(name),
      unit:units(unit_number)
    `)
    .eq('tenant_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  const activeRequests = requests?.filter(r => r.status !== 'completed' && r.status !== 'cancelled') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Requests</h2>
          <p className="text-gray-600 mt-1">Track your maintenance requests</p>
        </div>
        <Link href="/dashboard/requests/new">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            New Request
          </button>
        </Link>
      </div>

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Requests ({activeRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{request.title}</h4>
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
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests?.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No requests yet</p>
                <Link href="/dashboard/requests/new">
                  <button className="mt-3 text-blue-600 hover:underline">
                    Submit your first request
                  </button>
                </Link>
              </div>
            ) : (
              requests?.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{request.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
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

// Helper Components
function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
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
    <Badge className={variants[priority]}>
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
    <Badge className={variants[status]}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInHours < 48) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}