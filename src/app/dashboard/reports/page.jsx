'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Calendar,
  Download
} from 'lucide-react'

export default function ReportsPage() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    avgResolutionTime: 0,
    byCategory: {},
    byPriority: {},
    byStatus: {},
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')

  useEffect(() => {
    loadStats()
  }, [dateRange])

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))

    // Load requests
    let query = supabase
      .from('maintenance_requests')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (profile.role === 'tenant') {
      query = query.eq('tenant_id', user.id)
    } else {
      query = query.eq('organization_id', profile.organization_id)
    }

    const { data: requests } = await query

    if (requests) {
      // Calculate stats
      const completed = requests.filter(r => r.status === 'completed')
      const pending = requests.filter(r => r.status === 'submitted')

      // Calculate average resolution time
      const completedWithTime = completed.filter(r => r.completed_at)
      const avgTime = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, r) => {
            const created = new Date(r.created_at)
            const completedDate = new Date(r.completed_at)
            return sum + (completedDate - created)
          }, 0) / completedWithTime.length
        : 0

      // Group by category
      const byCategory = requests.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1
        return acc
      }, {})

      // Group by priority
      const byPriority = requests.reduce((acc, r) => {
        acc[r.priority] = (acc[r.priority] || 0) + 1
        return acc
      }, {})

      // Group by status
      const byStatus = requests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1
        return acc
      }, {})

      setStats({
        total: requests.length,
        completed: completed.length,
        pending: pending.length,
        avgResolutionTime: avgTime,
        byCategory,
        byPriority,
        byStatus,
        recentActivity: requests.slice(0, 10),
      })
    }

    setLoading(false)
  }

  function formatTime(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">View insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold mt-2">{stats.completed}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold mt-2">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Resolution</p>
                <p className="text-3xl font-bold mt-2">
                  {stats.avgResolutionTime > 0 ? formatTime(stats.avgResolutionTime) : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="capitalize text-sm font-medium">{category}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold ml-3">{count}</span>
                  </div>
                ))}
              {Object.keys(stats.byCategory).length === 0 && (
                <p className="text-gray-500 text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['emergency', 'high', 'medium', 'low'].map((priority) => {
                const count = stats.byPriority[priority] || 0
                const colors = {
                  emergency: 'bg-red-600',
                  high: 'bg-orange-600',
                  medium: 'bg-blue-600',
                  low: 'bg-gray-600',
                }
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="capitalize text-sm font-medium w-24">{priority}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[priority]}`}
                          style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold ml-3">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={status} />
                    </div>
                    <span className="text-lg font-semibold">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-start justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{request.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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