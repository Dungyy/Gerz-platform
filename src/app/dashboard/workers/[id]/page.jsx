// app/dashboard/workers/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  Trash2,
  Edit,
  MoreVertical,
} from "lucide-react";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { toast } from "sonner";

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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        avgCompletionTime: 0,
      });
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  }

  async function handleDeleteWorkerConfirmed() {
    if (!worker) return;

    try {
      setDeleteLoading(true);

      const response = await fetchWithAuth(`/api/workers/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete worker");
      }

      toast.success("Worker deleted successfully");
      router.push("/dashboard/workers");
    } catch (error) {
      console.error("Error deleting worker:", error);
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm sm:text-base">
            Loading worker details...
          </p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold mb-2">
            Worker Not Found
          </h2>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            This worker may have been deleted or doesn&apos;t exist.
          </p>
          <Link href="/dashboard/workers">
            <Button className="text-sm sm:text-base">Back to Workers</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                {worker.full_name}
              </h1>
              <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
                Maintenance Worker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none text-sm"
              onClick={() =>
                router.push(`/dashboard/workers/${params.id}/edit`)
              }
            >
              <Edit className="h-4 w-4" />
              <span className="hidden xs:inline">Edit</span>
            </Button>
            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden xs:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <StatCard
            title="Total"
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
            title="Done"
            value={stats.completed}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="Rate"
            value={
              stats.total > 0
                ? `${Math.round((stats.completed / stats.total) * 100)}%`
                : "0%"
            }
            icon={TrendingUp}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Contact Info */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg bg-blue-500/10">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Email
                    </p>
                    <a
                      href={`mailto:${worker.email}`}
                      className="text-xs sm:text-sm font-medium hover:underline truncate block"
                    >
                      {worker.email}
                    </a>
                  </div>
                </div>

                {worker.phone && (
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg bg-green-500/10">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Phone
                      </p>
                      <a
                        href={`tel:${worker.phone}`}
                        className="text-xs sm:text-sm font-medium hover:underline"
                      >
                        {worker.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg bg-purple-500/10">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Joined
                    </p>
                    <p className="text-xs sm:text-sm font-medium">
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
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Wrench className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">
                      Requests ({requests.length})
                    </span>
                  </CardTitle>
                  {requests.length > 0 && (
                    <Link
                      href={`/dashboard/requests?worker=${params.id}`}
                      className="text-xs sm:text-sm text-blue-600 hover:underline whitespace-nowrap"
                    >
                      View All
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl bg-muted mx-auto mb-3 sm:mb-4">
                      <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">
                      No Requests Assigned
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm px-4">
                      This worker hasn&apos;t been assigned any requests yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {requests.slice(0, 5).map((request) => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                    {requests.length > 5 && (
                      <Link href={`/dashboard/requests?worker=${params.id}`}>
                        <Button
                          variant="outline"
                          className="w-full text-sm"
                          size="sm"
                        >
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
          <div className="space-y-4 sm:space-y-6">
            {/* Profile Card */}
            <Card className="shadow-sm">
              <CardContent className="pt-4 sm:pt-6">
                <div className="text-center mb-3 sm:mb-4">
              <div className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-foreground text-white font-bold text-xl sm:text-2xl mx-auto mb-2 sm:mb-3 shadow-lg">
                {worker?.avatar_url ? (
                  <Image
                    src={worker.avatar_url}
                    alt={worker?.full_name || "User"}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {worker?.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
                  <h3 className="font-semibold text-base sm:text-lg truncate px-2">
                    {worker.full_name}
                  </h3>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Maintenance Worker
                  </Badge>
                </div>

                <Separator className="my-3 sm:my-4" />

                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground truncate">
                      Organization
                    </span>
                    <span className="font-medium truncate text-right">
                      {worker.organization?.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 text-xs">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Active Requests
                    </span>
                    <span className="text-xs sm:text-sm font-semibold">
                      {stats.active}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{
                        width: `${
                          stats.total > 0
                            ? (stats.active / stats.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Completed
                    </span>
                    <span className="text-xs sm:text-sm font-semibold">
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
                  <p className="text-2xl sm:text-3xl font-bold">
                    {stats.total > 0
                      ? Math.round((stats.completed / stats.total) * 100)
                      : 0}
                    %
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Success Rate
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleteLoading) setShowDeleteModal(false);
        }}
        onConfirm={handleDeleteWorkerConfirmed}
        title={`Delete ${worker.full_name}?`}
        description="This worker will be removed from your organization. Any completed or cancelled requests will be unassigned. Active requests must be reassigned first."
        confirmText="Delete Worker"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      />
    </>
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
      <CardContent className="pt-4 sm:pt-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 sm:mt-2">
              {value}
            </p>
          </div>
          <div
            className={`grid h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 place-items-center rounded-xl ${colors[color]}`}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
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
      className="block rounded-lg sm:rounded-xl border bg-card p-3 sm:p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h4 className="font-semibold text-xs sm:text-sm truncate">
              {request.title}
            </h4>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>

          <div className="flex items-start sm:items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-col sm:flex-row">
            {request.property && (
              <span className="flex items-center gap-1 truncate max-w-full">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {request.property.name} - Unit {request.unit?.unit_number}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-3 w-3 flex-shrink-0" />
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
    <Badge
      className={`${variants[priority] || variants.low} text-[10px] sm:text-xs`}
    >
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
    <Badge
      className={`${
        variants[status] || variants.submitted
      } text-[10px] sm:text-xs`}
    >
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
