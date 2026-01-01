'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Building,
  Home,
  ArrowRight,
  BarChart3,
  Activity,
  Calendar,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
  })
  const [recentRequests, setRecentRequests] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Load requests
      const response = await fetchWithAuth('/api/requests', {
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json()
        const requests = Array.isArray(data) ? data : []

        // Calculate stats
        setStats({
          total: requests.length,
          open: requests.filter(r => r.status === 'submitted').length,
          in_progress: requests.filter(r => r.status === 'in_progress').length,
          completed: requests.filter(r => r.status === 'completed').length,
        })

        // Get 5 most recent
        setRecentRequests(requests.slice(0, 5))
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const isTenant = profile?.role === 'tenant'
  const isStaff = ['manager', 'owner', 'worker'].includes(profile?.role)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6 max-w-6xl mx-auto overflow-x-hidden">
      {/* Welcome Header */}
      <div className="overflow-x-hidden">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          {isTenant
            ? "Here's what's happening with your maintenance requests"
            : "Here's your maintenance overview"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap overflow-x-hidden">
        {isTenant && (
          <Link href="/dashboard/requests/new" className="flex-shrink-0">
            <Button size="lg" className="h-11 w-full sm:w-auto">
              <Plus className="h-5 w-5 mr-2" />
              New Request
            </Button>
          </Link>
        )}
        <Link href="/dashboard/requests" className="flex-shrink-0">
          <Button variant="outline" size="lg" className="h-11 w-full sm:w-auto">
            <Wrench className="h-5 w-5 mr-2" />
            View All Requests
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-hidden">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Open"
          value={stats.open}
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="In Progress"
          value={stats.in_progress}
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* Recent Requests */}
      <Card className="overflow-x-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold">Recent Requests</CardTitle>
          <Link href="/dashboard/requests">
            <Button variant="ghost" size="sm">
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-hidden">
          {recentRequests.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">No requests yet</p>
              {isTenant && (
                <Link href="/dashboard/requests/new">
                  <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Request
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3 overflow-x-hidden">
              {recentRequests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="border-blue-200 bg-blue-50/50 overflow-x-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-hidden">
          <ul className="space-y-2 text-sm text-gray-700">
            {isTenant ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                  <span>Add photos to your requests for faster resolution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                  <span>Include specific location details (e.g., "master bathroom sink")</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                  <span>Check your request status and messages regularly</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                  <span>Respond to requests within 24 hours for better tenant satisfaction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                  <span>Use internal notes to communicate with your team</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                  <span>Update request status regularly to keep tenants informed</span>
                </li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
  }

  return (
    <Card className="border-2 overflow-x-hidden">
      <CardContent className="p-5 overflow-x-hidden">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600 truncate pr-2">{title}</p>
          <div className={`p-2 rounded-lg ${colorClasses[color]}/10 flex-shrink-0`}>
            <Icon className={`h-5 w-5 text-${color}-600`} />
          </div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function RequestRow({ request }) {
  return (
    <Link href={`/dashboard/requests/${request.id}`} className="block overflow-x-hidden">
      <div className="flex items-center justify-between p-3 rounded-lg border-2 hover:border-gray-400 hover:bg-gray-50 transition-all overflow-x-hidden">
        <div className="flex-1 min-w-0 overflow-x-hidden">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-sm truncate">{request.title}</h4>
            <StatusBadge status={request.status} />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
            <span className="whitespace-nowrap">Unit {request.unit?.unit_number}</span>
            <span className="hidden sm:inline">•</span>
            <span className="capitalize whitespace-nowrap">{request.priority} priority</span>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap">{formatTimestamp(request.created_at)}</span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    </Link>
  )
}

function StatusBadge({ status }) {
  const variants = {
    submitted: 'bg-amber-100 text-amber-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  const labels = {
    submitted: 'Open',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Done',
    cancelled: 'Cancelled',
  }

  return (
    <Badge className={`${variants[status]} text-xs font-medium px-2 py-0.5 border-0 whitespace-nowrap flex-shrink-0`}>
      {labels[status] || status}
    </Badge>
  )
}

function formatTimestamp(dateString) {
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}