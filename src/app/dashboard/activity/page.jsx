"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Search,
  Filter,
  User,
  Wrench,
  Calendar,
  RefreshCw,
  ChevronDown,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function ActivityLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileData?.role !== "manager" && profileData?.role !== "owner") {
        router.push("/dashboard");
        return;
      }

      await loadLogs();
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }

  async function loadLogs() {
    try {
      setLoading(true);

      const response = await fetchWithAuth("/api/activity", {
        method: "GET",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load activity logs");
      }

      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadLogs();
    setTimeout(() => setRefreshing(false), 500);
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.request?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details || {})
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            Loading activity logs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Activity Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredLogs.length} activit{filteredLogs.length !== 1 ? "ies" : "y"}{" "}
          recorded
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                className="pl-9 h-10 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-10"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No matching activities found" : "No activity yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <ActivityLogItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityLogItem({ log }) {
  const icon = getActivityIcon(log.action);

  return (
    <div className="flex items-start gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/40 transition-colors">
      {/* Icon */}
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${icon.bg}`}
      >
        <icon.component className={`h-4 w-4 sm:h-5 sm:w-5 ${icon.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{log.action}</p>

            {/* Show request link if available */}
            {log.request && (
              <Link
                href={`/dashboard/requests/${log.request.id}`}
                className="text-xs sm:text-sm text-blue-600 hover:underline mt-0.5 block"
              >
                {log.request.title}
              </Link>
            )}

            {/* Show details if available */}
            {log.details && Object.keys(log.details).length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                <DetailsDisplay details={log.details} />
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
          {log.user && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.user.full_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatTimestamp(log.created_at)}
          </span>
          {log.request && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              <Wrench className="h-3 w-3 mr-1" />
              Request
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsDisplay({ details }) {
  if (!details || typeof details !== "object") return null;

  // Format key-value pairs nicely
  const entries = Object.entries(details).slice(0, 3); // Show first 3 details

  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="font-medium capitalize">
            {key.replace(/_/g, " ")}:
          </span>
          <span className="truncate">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function getActivityIcon(action) {
  const actionLower = action.toLowerCase();

  // Request-related activities
  if (
    actionLower.includes("request") ||
    actionLower.includes("maintenance") ||
    actionLower.includes("repair")
  ) {
    return {
      component: Wrench,
      bg: "bg-blue-100 dark:bg-blue-950/30",
      color: "text-blue-600 dark:text-blue-400",
    };
  }

  // User-related activities
  if (
    actionLower.includes("user") ||
    actionLower.includes("tenant") ||
    actionLower.includes("worker") ||
    actionLower.includes("manager") ||
    actionLower.includes("invite")
  ) {
    return {
      component: User,
      bg: "bg-green-100 dark:bg-green-950/30",
      color: "text-green-600 dark:text-green-400",
    };
  }

  // Status changes
  if (
    actionLower.includes("status") ||
    actionLower.includes("completed") ||
    actionLower.includes("cancelled")
  ) {
    return {
      component: AlertCircle,
      bg: "bg-purple-100 dark:bg-purple-950/30",
      color: "text-purple-600 dark:text-purple-400",
    };
  }

  // Comments
  if (actionLower.includes("comment") || actionLower.includes("note")) {
    return {
      component: FileText,
      bg: "bg-amber-100 dark:bg-amber-950/30",
      color: "text-amber-600 dark:text-amber-400",
    };
  }

  // Default
  return {
    component: Activity,
    bg: "bg-gray-100 dark:bg-gray-950/30",
    color: "text-gray-600 dark:text-gray-400",
  };
}

function formatTimestamp(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}