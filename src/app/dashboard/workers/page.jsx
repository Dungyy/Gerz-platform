'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Phone, Plus, Search } from 'lucide-react'

export default function WorkersPage() {
  const router = useRouter()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadWorkers()
  }, [])

  async function loadWorkers() {
    try {
      const response = await fetchWithAuth('/api/workers', { method: 'GET' })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (response.status === 403) {
        alert('You do not have permission to view workers')
        router.push('/dashboard')
        return
      }

      const data = await response.json()
      setWorkers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredWorkers = workers.filter((worker) =>
    worker.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Workers</h2>
          <p className="text-gray-600 mt-1">{workers.length} maintenance workers</p>
        </div>

        <Link href="/dashboard/workers/new">
          <Button>
            <Plus className="h-5 w-5 mr-2" />
            Invite Worker
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search workers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workers found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try a different search term' : 'Invite your first worker to get started'}
            </p>
            {!searchQuery && (
              <Link href="/dashboard/workers/new">
                <Button>
                  <Plus className="h-5 w-5 mr-2" />
                  Invite Worker
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkers.map((worker) => (
            <Card key={worker.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{worker.full_name}</h3>
                    <p className="text-sm text-gray-600">Worker</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {worker.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{worker.email}</span>
                    </div>
                  )}

                  {worker.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{worker.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Joined {new Date(worker.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}