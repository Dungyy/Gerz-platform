'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Home, 
  Wrench, 
  Building, 
  Users, 
  UserCog, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar({ profile, currentPath }) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ✅ ROLE-BASED NAVIGATION
  const getNavigation = () => {
    const baseNav = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Requests', href: '/dashboard/requests', icon: Wrench },
    ]

    // ✅ TENANT: Only Dashboard and Requests
    if (profile?.role === 'tenant') {
      return [
        ...baseNav,
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      ]
    }

    // ✅ WORKER: Dashboard, Requests, Settings
    if (profile?.role === 'worker') {
      return [
        ...baseNav,
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      ]
    }

    // ✅ MANAGER/OWNER: Full access
    return [
      ...baseNav,
      { name: 'Properties', href: '/dashboard/properties', icon: Building },
      { name: 'Tenants', href: '/dashboard/tenants', icon: Users },
      { name: 'Workers', href: '/dashboard/workers', icon: UserCog },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]
  }

  const navigation = getNavigation()

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-blue-600">Gerz</h1>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-blue-600">Gerz</h1>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {profile?.organization?.name || 'Maintenance'}
            </p>
          </div>

          {/* Profile Info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{profile?.full_name}</p>
                <p className="text-sm text-gray-600 capitalize">{profile?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = currentPath === item.href || currentPath?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}