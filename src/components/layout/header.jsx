'use client'

import { Bell, Search, HelpCircle } from 'lucide-react'
import { useState } from 'react'

export default function Header({ profile }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="bg-white border-b lg:border-l sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-4 mt-16 lg:mt-0">
        <div className="flex items-center justify-between">
          {/* Welcome Message */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests, properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Help */}
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <HelpCircle className="h-6 w-6" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>

        {/* Search Bar (Mobile) */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </header>
  )
}