"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Home,
  Wrench,
  Building2,
  Users,
  UserCog,
  Settings,
  LogOut,
  HelpCircle,
  ChevronDown,
  User,
} from "lucide-react";
import Image from "next/image";

export default function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);

        const { data: profileData } = await supabase
          .from("profiles")
          .select(
            `
            *,
            organization:organizations(*)
          `
          )
          .eq("id", user.id)
          .single();

        setProfile(profileData);
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setProfile(null);
    router.push("/");
  }

  // Get navigation based on auth state
  const getNavigation = () => {
    if (!isAuthenticated) {
      return [
        { href: "/#features", label: "Features" },
        { href: "/#how", label: "How it works" },
        { href: "/#pricing", label: "Pricing" },
      ];
    }

    // Authenticated - role-based navigation
    const base = [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/dashboard/requests", label: "Requests", icon: Wrench },
    ];

    if (profile?.role === "tenant") {
      return base;
    }

    if (profile?.role === "worker") {
      return base;
    }

    // Manager/Owner
    return [
      ...base,
      { href: "/dashboard/properties", label: "Properties", icon: Building2 },
      { href: "/dashboard/tenants", label: "Tenants", icon: Users },
      { href: "/dashboard/workers", label: "Workers", icon: UserCog },
    ];
  };

  const navigation = getNavigation();

  if (loading) {
    return (
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2"
          >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background font-bold">
                d
              </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-sm font-semibold">dingy.app</div>
              <div className="text-xs text-muted-foreground">
                {isAuthenticated
                  ? profile?.organization?.name || "Dashboard"
                  : "Maintenance"}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Help Link */}
                <Link href="/help">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <HelpCircle className="h-4 w-4" />
                    <span className="hidden lg:inline">Help</span>
                  </Button>
                </Link>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-foreground text-background">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile?.full_name || "User"}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {profile?.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}                      </div>
                      <span className="hidden lg:inline text-sm font-medium">
                        {profile?.full_name?.split(" ")[0]}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.full_name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">
                          {profile?.role}
                          {profile?.organization?.name &&
                            ` • ${profile.organization.name}`}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/settings"
                        className="cursor-pointer"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/help" className="cursor-pointer">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help Center
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // Auth Buttons
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden grid h-9 w-9 place-items-center rounded-lg hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="px-4 py-4 space-y-1">
            {isAuthenticated && (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-muted/50">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold">
                    {profile?.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {profile?.role}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Links */}
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                {/* Divider */}
                <div className="my-2 border-t" />

                {/* Quick Links */}
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Link
                  href="/help"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help Center
                </Link>

                {/* Divider */}
                <div className="my-2 border-t" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors w-full text-left text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </>
            ) : (
              <>
                {/* Divider */}
                <div className="my-2 border-t" />

                {/* Auth Buttons */}
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full mb-2">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
