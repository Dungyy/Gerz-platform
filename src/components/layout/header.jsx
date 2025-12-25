"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Header({ profile }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/dashboard/requests?search=${encodeURIComponent(searchQuery)}`
      );
    }
  }

  // Get role-specific help link
  const getHelpLink = () => {
    switch (profile?.role) {
      case "tenant":
        return "/help/tenants";
      case "worker":
        return "/help/workers";
      case "manager":
      case "owner":
        return "/help/managers";
      default:
        return "/help";
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
      <div className="px-4 sm:px-6 lg:px-8 py-4 mt-16 lg:mt-0">
        <div className="flex items-center justify-between gap-4">
          {/* Welcome Message */}
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0] || "User"}!
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Search Bar (Desktop) - Only for non-tenants */}
          {profile?.role !== "tenant" && (
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-md"
            >
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
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Help - Role-specific */}
            <Link href={getHelpLink()}>
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
            </Link>

            {/* Notifications - Placeholder for future */}
            <Link href="/dashboard/notifications">
              <button className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="h-5 w-5" />
                {/* Placeholder badge - you can connect this to real data later */}
                {/* <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500">
                  3
                </Badge> */}
              </button>
            </Link>
          </div>
        </div>

        {/* Search Bar (Mobile) - Only for non-tenants */}
        {profile?.role !== "tenant" && (
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
        )}
      </div>
    </header>
  );
}
