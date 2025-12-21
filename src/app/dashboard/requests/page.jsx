'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Plus } from 'lucide-react'

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  })
  const searchParams = useSearchParams()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile) {
      loadRequests()
    }
  }, [profile, filters])

  useEffect(() => {
    // Apply URL filters
    const priority = searchParams.get('priority')
    if (priority) {
      setFilters(prev => ({ ...prev, priority }))
    }
  }, [searchParams])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  async function loadRequests() {
    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(name, address),
        unit:units(unit_number),
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email),
        assigned:profiles!maintenance_requests_assigned_to_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    // Filter by organization or tenant
    if (profile.role === 'tenant') {
      query = query.eq('tenant_id', profile.id)
    } else {
      query = query.eq('organization_id', profile.organization_id)
    }

    // Apply filters
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data } = await query
    setRequests(data || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Maintenance Requests</h2>
          <p className="text-gray-600 mt-1">{requests.length} total requests</p>
        </div>
        {profile.role === 'tenant' && (
          <Link href="/dashboard/requests/new">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-5 w-5" />
              New Request
            </button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search requests..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <select
              className="px-3 py-2 border rounded-lg"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className="px-3 py-2 border rounded-lg"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>

            <button
              onClick={() => setFilters({ status: '', priority: '', search: '' })}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No requests found</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Link key={request.id} href={`/dashboard/requests/${request.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{request.title}</h3>
                          {profile.role !== 'tenant' && (
                            <p className="text-sm text-gray-600 mt-1">
                              {request.property?.name} - Unit {request.unit?.unit_number}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {profile.role !== 'tenant' && `${request.tenant?.full_name} • `}
                            {request.category} • {formatDate(request.created_at)}
                          </p>
                          {request.assigned && (
                            <p className="text-sm text-blue-600 mt-1">
                              Assigned to: {request.assigned.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <PriorityBadge priority={request.priority} />
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
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
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}