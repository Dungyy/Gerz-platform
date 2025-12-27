"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Home,
  Wrench,
  Building2,
  Users,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";

export default function Sidebar({ profile, currentPath }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getNavigation = () => {
    const baseNav = [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Requests", href: "/dashboard/requests", icon: Wrench },
    ];

    if (profile?.role === "tenant") {
      return [
        ...baseNav,
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
      ];
    }

    if (profile?.role === "worker") {
      return [
        ...baseNav,
        { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
      ];
    }

    return [
      ...baseNav,
      { name: "Properties", href: "/dashboard/properties", icon: Building2 },
      { name: "Tenants", href: "/dashboard/tenants", icon: Users },
      { name: "Workers", href: "/dashboard/workers", icon: UserCog },
      { name: "Managers", href: "/dashboard/managers", icon: UserCog },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];
  };

  const navigation = getNavigation();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-background font-bold text-sm">
              d
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">dingy.app</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 z-40 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-background font-bold text-sm">
                d
              </div>
              <div className="leading-tight">
                <div className="font-semibold">dingy.app</div>
                <div className="text-xs text-muted-foreground">
                  {profile?.organization?.name || "Maintenance"}
                </div>
              </div>
            </Link>
          </div>

          {/* Profile Info */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-transparent hover:border-border transition-colors">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background font-semibold text-sm shadow-sm">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive =
                currentPath === item.href ||
                currentPath?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm border border-transparent
                    ${
                      isActive
                        ? "bg-muted font-medium border-border"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border"
                    }
                  `}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t space-y-2">

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors text-sm border border-transparent hover:border-red-200 dark:hover:border-red-900"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
