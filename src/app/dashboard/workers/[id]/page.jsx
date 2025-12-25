"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Building2,
  BarChart3,
  Edit,
  Trash2,
} from "lucide-react";

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [worker, setWorker] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    avgCompletionTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      // Check if user is manager/owner
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileData?.role !== "manager" && profileData?.role !== "owner") {
        router.push("/dashboard");
        return;
      }

      await loadWorker();
      await loadRequests();
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }

  async function loadWorker() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          *,
          organization:organizations(*)
        `
        )
        .eq("id", params.id)
        .eq("role", "worker")
        .single();

      if (error) throw error;
      setWorker(data);
    } catch (error) {
      console.error("Error loading worker:", error);
    }
  }

  async function loadRequests() {
    try {
      const response = await fetchWithAuth("/api/requests", { method: "GET" });
      if (!response.ok) throw new Error("Failed to load requests");

      const allRequests = await response.json();
      const workerRequests = allRequests.filter(
        (r) => r.assigned_to === params.id
      );

      setRequests(workerRequests);

      // Calculate stats
      const active = workerRequests.filter(
        (r) => r.status !== "completed" && r.status !== "cancelled"
      ).length;
      const completed = workerRequests.filter(
        (r) => r.status === "completed"
      ).length;

      setStats({
        total: workerRequests.length,
        active,
        completed,
        avgCompletionTime: 0, // TODO: Calculate from completed requests
      });
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  }

  async function handleDeleteWorker() {
    if (
      !confirm(
        `Are you sure you want to delete ${worker.full_name}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/workers/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to delete worker");
      }

      alert("✅ Worker deleted successfully");
      router.push("/dashboard/workers");
    } catch (error) {
      console.error("Error deleting worker:", error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading worker details...</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Worker Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This worker may have been deleted or doesn't exist.
          </p>
          <Link href="/dashboard/workers">
            <Button>Back to Workers</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {worker.full_name}
            </h1>
            <p className="text-muted-foreground mt-1">Maintenance Worker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
            onClick={handleDeleteWorker}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Completion Rate"
          value={
            stats.total > 0
              ? `${Math.round((stats.completed / stats.total) * 100)}%`
              : "0%"
          }
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${worker.email}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {worker.email}
                  </a>
                </div>
              </div>

              {worker.phone && (
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-green-500/10">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${worker.phone}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {worker.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">
                    {new Date(worker.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Requests */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Assigned Requests ({requests.length})
                </CardTitle>
                {requests.length > 0 && (
                  <Link
                    href={`/dashboard/requests?worker=${params.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View All
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted mx-auto mb-4">
                    <Wrench className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No Requests Assigned</h3>
                  <p className="text-muted-foreground text-sm">
                    This worker hasn't been assigned any requests yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.slice(0, 5).map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                  {requests.length > 5 && (
                    <Link href={`/dashboard/requests?worker=${params.id}`}>
                      <Button variant="outline" className="w-full">
                        View All {requests.length} Requests
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-foreground from-blue-600 to-indigo-600 text-white font-bold text-2xl mx-auto mb-3 shadow-lg">
                  {worker.full_name?.[0]?.toUpperCase() || "W"}
                </div>
                <h3 className="font-semibold text-lg">{worker.full_name}</h3>
                <Badge variant="secondary" className="mt-2">
                  Maintenance Worker
                </Badge>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium">
                    {worker.organization?.name || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Active Requests
                  </span>
                  <span className="text-sm font-semibold">{stats.active}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${
                        stats.total > 0 ? (stats.active / stats.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Completed
                  </span>
                  <span className="text-sm font-semibold">
                    {stats.completed}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width: `${
                        stats.total > 0
                          ? (stats.completed / stats.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <Separator />

              <div className="text-center">
                <p className="text-3xl font-bold">
                  {stats.total > 0
                    ? Math.round((stats.completed / stats.total) * 100)
                    : 0}
                  %
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "text-blue-600 bg-blue-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    green: "text-green-600 bg-green-500/10",
    purple: "text-purple-600 bg-purple-500/10",
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div
            className={`grid h-12 w-12 place-items-center rounded-xl ${colors[color]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestCard({ request }) {
  return (
    <Link
      href={`/dashboard/requests/${request.id}`}
      className="block rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h4 className="font-semibold text-sm">{request.title}</h4>
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {request.property && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {request.property.name} - Unit {request.unit?.unit_number}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(request.created_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PriorityBadge({ priority }) {
  const variants = {
    low: "bg-gray-500/10 text-gray-700 hover:bg-gray-500/10",
    medium: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/15",
    high: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
    emergency: "bg-red-500/15 text-red-700 hover:bg-red-500/15",
  };

  return (
    <Badge className={`${variants[priority] || variants.low} text-xs`}>
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }) {
  const variants = {
    submitted: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
    assigned: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/15",
    in_progress: "bg-purple-500/15 text-purple-700 hover:bg-purple-500/15",
    completed: "bg-green-500/15 text-green-700 hover:bg-green-500/15",
    cancelled: "bg-gray-500/10 text-gray-700 hover:bg-gray-500/10",
  };

  return (
    <Badge className={`${variants[status] || variants.submitted} text-xs`}>
      {status?.replace("_", " ")}
    </Badge>
  );
}

function formatDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 48) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
