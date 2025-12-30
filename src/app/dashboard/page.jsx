"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  Home,
  User,
  Users,
  Building2,
  ClipboardList,
  ArrowRight,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    inProgress: 0,
    completed: 0,
    emergency: 0,
    myAssigned: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          `
          *,
          organization:organizations(*),
          unit:units!units_tenant_id_fkey(
            id,
            unit_number,
            property:properties(
              id,
              name,
              address,
              city,
              state,
              zip
            )
          )
        `
        )
        .eq("id", user.id)
        .single();

      setProfile(profileData);
      await loadRequests(user.id, profileData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setLoading(false);
    }
  }

  async function loadRequests(userId, profileData) {
    try {
      const response = await fetchWithAuth("/api/requests", { method: "GET" });
      if (!response.ok) throw new Error("Failed to load requests");

      const data = await response.json();
      const requestsData = Array.isArray(data) ? data : [];

      if (profileData.role === "worker") {
        const myRequests = requestsData.filter((r) => r.assigned_to === userId);
        const otherRequests = requestsData.filter(
          (r) => r.assigned_to !== userId
        );
        setRecentRequests([
          ...myRequests.slice(0, 3),
          ...otherRequests.slice(0, 2),
        ]);
      } else {
        setRecentRequests(
          requestsData.slice(0, profileData.role === "tenant" ? 10 : 5)
        );
      }

      const myAssigned = requestsData.filter(
        (r) => r.assigned_to === userId
      ).length;

      setStats({
        total: requestsData.length,
        submitted: requestsData.filter((r) => r.status === "submitted").length,
        inProgress: requestsData.filter(
          (r) => r.status === "in_progress" || r.status === "assigned"
        ).length,
        completed: requestsData.filter((r) => r.status === "completed").length,
        emergency: requestsData.filter(
          (r) => r.priority === "emergency" && r.status !== "completed"
        ).length,
        myAssigned: myAssigned,
      });
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (profile?.role === "tenant") {
    return (
      <TenantDashboard
        profile={profile}
        stats={stats}
        requests={recentRequests}
      />
    );
  }

  if (profile?.role === "worker") {
    return (
      <WorkerDashboard
        profile={profile}
        stats={stats}
        requests={recentRequests}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <ManagerDashboard
      profile={profile}
      stats={stats}
      requests={recentRequests}
      currentUserId={currentUserId}
    />
  );
}

// ============================================
// TENANT DASHBOARD
// ============================================
function TenantDashboard({ profile, stats, requests }) {
  const activeRequests =
    requests?.filter(
      (r) => r.status !== "completed" && r.status !== "cancelled"
    ) || [];
  const unit = profile.unit && profile.unit.length > 0 ? profile.unit[0] : null;
  const property = unit?.property;

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back, {profile.full_name}
        </p>
      </div>

      {/* Unit Info Card */}
      {unit && property && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Your Unit</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {property.name} - Unit {unit.unit_number}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {property.address}, {property.city}, {property.state}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total" value={stats.total} />
        <StatCard title="Open" value={stats.submitted} />
        <StatCard title="Active" value={stats.inProgress} />
        <StatCard title="Done" value={stats.completed} />
      </div>

      {/* Quick Action */}
      <Link href="/dashboard/requests/new">
        <Button size="lg" className="w-full h-12 text-sm font-medium">
          <Plus className="h-4 w-4 mr-2" />
          Submit New Maintenance Request
        </Button>
      </Link>

      {/* Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Requests</h2>
          {requests.length > 5 && (
            <Link
              href="/dashboard/requests"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">
                No requests yet. Submit your first maintenance request.
              </p>
              <Link href="/dashboard/requests/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Submit Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} isTenant />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// WORKER DASHBOARD
// ============================================
function WorkerDashboard({ profile, stats, requests, currentUserId }) {
  const myRequests =
    requests?.filter((r) => r.assigned_to === currentUserId) || [];
  const availableRequests =
    requests?.filter((r) => !r.assigned_to && r.status === "submitted") || [];

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back, {profile?.full_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="My Tasks" value={stats.myAssigned} icon={User} />
        <StatCard title="Available" value={stats.submitted} icon={Clock} />
        <StatCard title="Active" value={stats.inProgress} icon={TrendingUp} />
        <StatCard title="Done" value={stats.completed} icon={CheckCircle2} />
      </div>

      {/* Emergency Alert */}
      {stats.emergency > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {stats.emergency} Emergency Request
                  {stats.emergency > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
                  Require immediate attention
                </p>
              </div>
              <Link href="/dashboard/requests?priority=emergency">
                <Button size="sm">View</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            My Assigned ({myRequests.length})
          </h2>
          {myRequests.length > 0 && (
            <Link
              href="/dashboard/requests?assigned=me"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {myRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No assigned requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Available */}
      {availableRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Available ({availableRequests.length})
            </h2>
            <Link
              href="/dashboard/requests?status=submitted"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {availableRequests.slice(0, 3).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                currentUserId={currentUserId}
                available
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MANAGER/OWNER DASHBOARD
// ============================================
function ManagerDashboard({ profile, stats, requests, currentUserId }) {
  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back, {profile?.full_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total" value={stats.total} icon={Wrench} />
        <StatCard title="New" value={stats.submitted} icon={Clock} />
        <StatCard title="Active" value={stats.inProgress} icon={TrendingUp} />
        <StatCard title="Done" value={stats.completed} icon={CheckCircle2} />
      </div>

      {/* Emergency Alert */}
      {stats.emergency > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {stats.emergency} Emergency Request
                  {stats.emergency > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
                  Require immediate attention
                </p>
              </div>
              <Link href="/dashboard/requests?priority=emergency">
                <Button size="sm">View</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLinkCard
          href="/dashboard/properties"
          icon={Building2}
          title="Properties"
          description="Manage properties"
        />
        <QuickLinkCard
          href="/dashboard/tenants"
          icon={Users}
          title="Tenants"
          description="View tenants"
        />
        <QuickLinkCard
          href="/dashboard/requests"
          icon={Wrench}
          title="Requests"
          description="All maintenance"
        />
      </div>

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Requests</h2>
          <Link
            href="/dashboard/requests"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {requests?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                No requests yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests?.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                currentUserId={currentUserId}
                showTenant
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================
function StatCard({ title, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
          </div>
          {Icon && (
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="h-4 w-4 text-gray-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLinkCard({ href, icon: Icon, title, description }) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Icon className="h-6 w-6 text-gray-700" />
          </div>
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-xs text-gray-600">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function RequestCard({ request, isTenant, currentUserId, available, showTenant }) {
  const hasPhotos = request.images && request.images.length > 0;

  return (
    <Link href={`/dashboard/requests/${request.id}`}>
      <Card className="hover:shadow-md transition-all border hover:border-gray-300">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-base">
                  {request.title}
                </h3>
                <StatusBadge status={request.status} />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                <span>
                  {request.unit?.unit_number && `Unit ${request.unit.unit_number}`}
                </span>
                {request.category && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{request.category}</span>
                  </>
                )}
                {hasPhotos && (
                  <>
                    <span>•</span>
                    <span>{request.images.length} photo{request.images.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-900 mb-3 line-clamp-2">
            {request.description}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-3">
            {hasPhotos && (
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md">
                <ImageIcon className="h-3.5 w-3.5" />
                Photos
              </button>
            )}
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md">
              <MessageSquare className="h-3.5 w-3.5" />
              Thread
            </button>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-2">
            <InfoBox
              icon={Wrench}
              label="Assigned to"
              value={
                request.assigned_to_user
                  ? request.assigned_to === currentUserId
                    ? "You"
                    : request.assigned_to_user.full_name
                  : "Unassigned"
              }
            />
            <InfoBox
              icon={AlertCircle}
              label="Priority"
              value={<span className="capitalize">{request.priority}</span>}
            />
            <InfoBox
              icon={Clock}
              label="ETA"
              value={formatETA(request.created_at, request.status)}
            />
          </div>

          {/* Tenant (for staff) */}
          {showTenant && request.tenant && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Tenant</p>
                <p className="text-sm font-medium">{request.tenant.full_name}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 border">
      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-medium truncate">{label}</span>
      </div>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const variants = {
    submitted: "bg-amber-100 text-amber-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-700",
  };

  const labels = {
    submitted: "Open",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Done",
    cancelled: "Cancelled",
  };

  return (
    <Badge className={`${variants[status]} text-xs font-medium px-2 py-0.5 border-0`}>
      {labels[status] || status}
    </Badge>
  );
}

function formatETA(createdAt, status) {
  if (status === 'completed') return "Done";
  
  const created = new Date(createdAt);
  const eta = new Date(created);
  eta.setDate(eta.getDate() + 2);
  
  const now = new Date();
  if (eta < now) return "Overdue";
  
  if (eta.toDateString() === now.toDateString()) return "Today";
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (eta.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  
  return eta.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}