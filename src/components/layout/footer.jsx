"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  Rocket,
  HelpCircle,
  FileText,
  Home,
  Wrench,
  Building2,
  Users,
  Settings,
  Heart,
} from "lucide-react";

export default function Footer() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState(null);

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
      console.error("Footer auth check:", error);
    }
  }

  const currentYear = new Date().getFullYear();

  // Product links
  const productLinks = [
    { href: "/#features", label: "Features", icon: Rocket },
    { href: "/#how", label: "How it Works", icon: HelpCircle },
    { href: "/#pricing", label: "Pricing", icon: FileText },
  ];

  // Resources links
  const resourceLinks = [
    { href: "/help", label: "Help Center", icon: HelpCircle },
    { href: "/privacy", label: "Privacy Policy", icon: FileText },
    { href: "/terms", label: "Terms of Service", icon: FileText },
  ];

  // Dashboard links (if authenticated)
  const getDashboardLinks = () => {
    if (!isAuthenticated || !profile) return [];

    const links = [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/dashboard/requests", label: "Requests", icon: Wrench },
    ];

    if (profile.role === "manager" || profile.role === "owner") {
      links.push(
        { href: "/dashboard/properties", label: "Properties", icon: Building2 },
        { href: "/dashboard/tenants", label: "Tenants", icon: Users },
        { href: "/dashboard/workers", label: "Workers", icon: Users },
        { href: "/dashboard/managers", label: "Managers", icon: Users }
      );
    }

    links.push({
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
    });

    return links;
  };

  const dashboardLinks = getDashboardLinks();

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <Link
              href={isAuthenticated ? "/dashboard" : "/"}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background font-bold">
                d
              </div>
              <span className="hidden sm:inline font-medium">
                © {currentYear} dingy.app
              </span>
            </Link>

            {/* Desktop Quick Links */}
            <div className="hidden md:flex items-center gap-1 text-sm">
              <Link
                href="/help"
                className="text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border"
              >
                Help
              </Link>
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border"
              >
                Terms
              </Link>
            </div>
          </div>

          {/* Right: Dropdown Menus */}
          <div className="flex items-center gap-2">
            {/* Dashboard Menu (if authenticated) */}
            {isAuthenticated && dashboardLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground border border-transparent hover:border-border focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Your Account</span>
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Quick Access
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {dashboardLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="cursor-pointer">
                        <link.icon className="mr-2 h-4 w-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Product Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground border border-transparent hover:border-border focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
                  <Rocket className="h-4 w-4" />
                  <span className="hidden sm:inline">Product</span>
                  <ChevronUp className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Explore
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {productLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="cursor-pointer">
                      <link.icon className="mr-2 h-4 w-4" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Resources Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground border border-transparent hover:border-border focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Resources</span>
                  <ChevronUp className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Support & Legal
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {resourceLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="cursor-pointer">
                      <link.icon className="mr-2 h-4 w-4" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Badge (if authenticated) */}
            {isAuthenticated && profile && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-transparent hover:border-border transition-colors text-xs cursor-default">
                <span className="capitalize font-medium">{profile.role}</span>
                {profile.organization?.name && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground truncate max-w-[120px]">
                      {profile.organization.name}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Made with Love */}
            <div className="hidden xl:flex items-center gap-1 text-xs text-muted-foreground">
              Made with <Heart className="h-3 w-3 fill-red-500 text-red-500" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}