'use client'

import Link from 'next/link'
import { Wrench } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              © {currentYear} Gerz. All rights reserved.
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link 
              href="/dashboard/settings" 
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
            <Link 
              href="/help" 
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Help Center
            </Link>
            <Link 
              href="/privacy" 
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Terms of Service
            </Link>
          </div>

          {/* Version */}
          <div className="text-sm text-gray-500">
            v1.0.0
          </div>
        </div>
      </div>
    </footer>
  )
}