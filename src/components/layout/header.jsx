'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Bell, Search, HelpCircle, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function Header({ profile }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  async function loadNotifications() {
    if (!profile?.id) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          request:maintenance_requests(
            id,
            title,
            property:properties(name),
            unit:units(unit_number)
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleNotificationClick(notification) {
    markAsRead(notification.id)
    setShowNotifications(false)
    
    if (notification.request_id) {
      router.push(`/dashboard/requests/${notification.request_id}`)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/requests?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'request_created':
        return '🔔'
      case 'request_assigned':
        return '👤'
      case 'request_status_changed':
        return '🔄'
      case 'request_commented':
        return '💬'
      case 'request_completed':
        return '✅'
      default:
        return '📌'
    }
  }

  function formatNotificationTime(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
      <div className="px-4 sm:px-6 lg:px-8 py-4 mt-16 lg:mt-0">
        <div className="flex items-center justify-between gap-4">
          {/* Welcome Message */}
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Search Bar (Desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search requests, properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Help */}
            <Link href="/help">
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  
                  {/* Dropdown */}
                  <Card className="absolute right-0 mt-2 w-96 max-h-[32rem] overflow-hidden z-50 shadow-lg">
                    <div className="sticky top-0 bg-background border-b px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Notifications</h3>
                          {unreadCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {unreadCount} unread
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              disabled={loading}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="grid h-7 w-7 place-items-center rounded-lg hover:bg-muted"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[28rem]">
                      {notifications.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted mx-auto mb-3">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`
                              w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors
                              ${!notification.read ? 'bg-blue-500/5' : ''}
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-xl flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                {notification.request && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {notification.request.property?.name} - Unit {notification.request.unit?.unit_number}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatNotificationTime(notification.created_at)}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="sticky bottom-0 bg-background border-t px-4 py-3">
                        <Link href="/dashboard/notifications">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setShowNotifications(false)}
                          >
                            View All Notifications
                          </Button>
                        </Link>
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar (Mobile) */}
        <form onSubmit={handleSearch} className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </form>
      </div>
    </header>
  )
}