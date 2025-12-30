"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import {
  Bell,
  X,
  Check,
  Activity,
  Wrench,
  User,
  Calendar,
  Trash2,
  Settings,
  Filter,
  CheckCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Header({ profile }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, request, user, status
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (profile?.role === "manager" || profile?.role === "owner") {
      loadNotifications();

      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [profile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);

      const response = await fetchWithAuth("/api/activity-logs", {
        method: "GET",
      });

      if (!response.ok) return;

      const data = await response.json();
      const logs = Array.isArray(data) ? data : [];

      // Get viewed notifications from localStorage
      const viewedIds = getViewedNotifications();

      // Filter to recent activities (last 7 days for more history)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogs = logs
        .filter((log) => new Date(log.created_at) > sevenDaysAgo)
        .slice(0, 20); // Show last 20

      setNotifications(recentLogs);

      // Count unread (not in viewed list)
      const unread = recentLogs.filter((log) => !viewedIds.includes(log.id));
      setUnreadCount(unread.length);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  function getViewedNotifications() {
    try {
      const viewed = localStorage.getItem("viewedNotifications");
      return viewed ? JSON.parse(viewed) : [];
    } catch {
      return [];
    }
  }

  function saveViewedNotifications(ids) {
    try {
      localStorage.setItem("viewedNotifications", JSON.stringify(ids));
    } catch (error) {
      console.error("Error saving viewed notifications:", error);
    }
  }

  function handleOpen() {
    setIsOpen(!isOpen);

    if (!isOpen && notifications.length > 0) {
      // Mark all as viewed when opening dropdown
      const viewedIds = getViewedNotifications();
      const allIds = notifications.map((n) => n.id);
      const newViewedIds = [...new Set([...viewedIds, ...allIds])];

      // Keep only last 100 viewed IDs to prevent localStorage bloat
      const trimmedIds = newViewedIds.slice(-100);
      saveViewedNotifications(trimmedIds);
      setUnreadCount(0);
    }
  }

  function handleMarkAllRead() {
    const allIds = notifications.map((n) => n.id);
    saveViewedNotifications(allIds);
    setUnreadCount(0);
  }

  function handleClearAll() {
    const allIds = notifications.map((n) => n.id);
    saveViewedNotifications(allIds);
    setNotifications([]);
    setUnreadCount(0);
  }

  function handleClearOne(id) {
    const viewedIds = getViewedNotifications();
    if (!viewedIds.includes(id)) {
      viewedIds.push(id);
      saveViewedNotifications(viewedIds);
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
    // Remove from list
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  // Filter notifications by type
  const filteredNotifications = notifications.filter((notification) => {
    if (filterType === "all") return true;

    const actionLower = notification.action.toLowerCase();

    if (filterType === "request") {
      return (
        actionLower.includes("request") ||
        actionLower.includes("maintenance") ||
        actionLower.includes("repair")
      );
    }

    if (filterType === "user") {
      return (
        actionLower.includes("user") ||
        actionLower.includes("tenant") ||
        actionLower.includes("worker") ||
        actionLower.includes("manager") ||
        actionLower.includes("invite")
      );
    }

    if (filterType === "status") {
      return (
        actionLower.includes("status") ||
        actionLower.includes("completed") ||
        actionLower.includes("assigned") ||
        actionLower.includes("cancelled")
      );
    }

    return true;
  });

  // Don't show notifications for non-managers/owners
  if (!profile || (profile.role !== "manager" && profile.role !== "owner")) {
    return (
      <header className="hidden lg:block border-b bg-background sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-end">
            <div className="text-sm text-muted-foreground">
              Welcome, {profile?.full_name}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="hidden lg:block border-b bg-background sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Welcome back, {profile?.full_name}
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleOpen}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-[420px] bg-background border rounded-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <h3 className="font-semibold text-sm">
                        Recent Activity
                      </h3>
                      {unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 px-1.5 text-xs"
                        >
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {notifications.length > 0 && (
                        <>
                          <button
                            onClick={handleMarkAllRead}
                            className="p-1 rounded hover:bg-muted transition-colors"
                            title="Mark all as read"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleClearAll}
                            className="p-1 rounded hover:bg-muted transition-colors text-red-600"
                            title="Clear all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-1">
                    {[
                      { key: "all", label: "All" },
                      { key: "request", label: "Requests" },
                      { key: "user", label: "Users" },
                      { key: "status", label: "Status" },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setFilterType(filter.key)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          filterType === filter.key
                            ? "bg-foreground text-background font-medium"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-[450px] overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Loading notifications...
                      </p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {filterType === "all"
                          ? "No recent activity"
                          : `No ${filterType} activities`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Activity from the last 7 days will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClear={() => handleClearOne(notification.id)}
                          onClose={() => setIsOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
                  <Link
                    href="/dashboard/activity"
                    onClick={() => setIsOpen(false)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View all activity
                    <Activity className="h-3 w-3" />
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {filteredNotifications.length} of {notifications.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ notification, onClear, onClose }) {
  const icon = getActivityIcon(notification.action);
  const viewedIds = JSON.parse(
    localStorage.getItem("viewedNotifications") || "[]"
  );
  const isViewed = viewedIds.includes(notification.id);

  return (
    <div
      className={`px-4 py-3 hover:bg-muted/40 transition-colors group relative ${
        isViewed ? "opacity-70" : "bg-blue-50/30 dark:bg-blue-950/10"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${icon.bg}`}
        >
          <icon.component className={`h-4 w-4 ${icon.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-medium leading-snug">
            {notification.action}
          </p>

          {/* Show request link if available */}
          {notification.request && (
            <Link
              href={`/dashboard/requests/${notification.request.id}`}
              onClick={onClose}
              className="text-xs text-blue-600 hover:underline block mt-1 font-medium"
            >
              → {notification.request.title}
            </Link>
          )}

          {/* User and time */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            {notification.user && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {notification.user.full_name}
              </span>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatTimestamp(notification.created_at)}
            </span>
          </div>

          {/* New badge */}
          {!isViewed && (
            <Badge
              variant="default"
              className="absolute top-3 right-3 h-5 px-1.5 text-xs bg-blue-500"
            >
              New
            </Badge>
          )}
        </div>

        {/* Clear button (shows on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute top-2 right-2 p-1 rounded hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
          title="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-red-600" />
        </button>
      </div>
    </div>
  );
}

function getActivityIcon(action) {
  const actionLower = action.toLowerCase();

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

  if (
    actionLower.includes("status") ||
    actionLower.includes("completed") ||
    actionLower.includes("cancelled") ||
    actionLower.includes("assigned")
  ) {
    return {
      component: Check,
      bg: "bg-purple-100 dark:bg-purple-950/30",
      color: "text-purple-600 dark:text-purple-400",
    };
  }

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
  });
}