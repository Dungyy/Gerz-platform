'use client'

import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t mt-auto">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Copyright */}
          <div className="text-sm">
            <span className="font-semibold">dingy.app</span>
            <span className="text-muted-foreground"> — Maintenance Request Management</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard/settings" className="hover:text-foreground">
              Settings
            </Link>
            <Link href="/help" className="hover:text-foreground">
              Help Center
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>

          {/* Version */}
          <div className="text-sm text-muted-foreground">
            © {currentYear}
          </div>
        </div>
      </div>
    </footer>
  )
}