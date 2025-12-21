'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Wrench, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react'
import Header from '@/components/layout/header'
import Sidebar from '@/components/layout/sidebar'

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single()

    setProfile(profileData)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header profile={profile} />
      <Sidebar profile={profile} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">{profile?.organization?.name}</p>
        </div>
        {profile?.role === 'tenant' && (
          <Link href="/dashboard/requests/new">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-5 w-5" />
              New Request
            </button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Requests" value={0} icon={Wrench} color="blue" />
        <StatsCard title="Pending" value={0} icon={Clock} color="yellow" />
        <StatsCard title="In Progress" value={0} icon={AlertCircle} color="orange" />
        <StatsCard title="Completed" value={0} icon={CheckCircle} color="green" />
      </div>

      {/* Welcome Message */}
      <div className="bg-white rounded-lg border p-8 text-center">
        <Wrench className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Welcome to Gerz!</h2>
        <p className="text-gray-600 mb-6">
          Your property maintenance management platform is ready to use.
        </p>
        {profile?.role === 'tenant' ? (
          <Link href="/dashboard/requests/new">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Submit Your First Request
            </button>
          </Link>
        ) : (
          <Link href="/dashboard/properties">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add Your First Property
            </button>
          </Link>
        )}
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}