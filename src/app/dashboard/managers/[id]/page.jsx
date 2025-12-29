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
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";

export default function ManagerDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [manager, setManager] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error loading current user profile:", profileError);
      }

      if (profileData?.role !== "manager" && profileData?.role !== "owner") {
        router.push("/dashboard");
        return;
      }

      setRole(profileData.role);

      await loadManager();
      await loadRequests();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadManager() {
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
        .eq("role", "manager")
        .single();

      if (error) throw error;
      setManager(data);
    } catch (error) {
      console.error("Error loading manager:", error);
    }
  }

  async function loadRequests() {
    try {
      const response = await fetchWithAuth("/api/requests", { method: "GET" });
      if (!response.ok) throw new Error("Failed to load requests");

      const allRequests = await response.json();

      // Assuming requests table has created_by = manager id
      const managerRequests = allRequests.filter(
        (r) => r.created_by === params.id
      );

      setRequests(managerRequests);

      const active = managerRequests.filter(
        (r) => r.status !== "completed" && r.status !== "cancelled"
      ).length;
      const completed = managerRequests.filter(
        (r) => r.status === "completed"
      ).length;

      setStats({
        total: managerRequests.length,
        active,
        completed,
      });
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  }

  async function handleDeleteManagerConfirmed() {
    if (role !== "owner") {
      toast.error("Only owners can delete managers.");
      setShowDeleteModal(false);
      return;
    }

    try {
      setDeleteLoading(true);

      const response = await fetchWithAuth(`/api/managers/${params.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete manager");
      }

      toast.success("✅ Manager deleted successfully");
      router.push("/dashboard/managers");
    } catch (error) {
      console.error("Error deleting manager:", error);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">
            Loading manager details...
          </p>
        </div>
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold mb-2">
            Manager Not Found
          </h2>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            This manager may have been deleted or doesn&apos;t exist.
          </p>
          <Link href="/dashboard/managers">
            <Button className="text-sm sm:text-base">Back to Managers</Button>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                {manager.full_name}
              </h1>
              <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
                Property Manager
              </p>
            </div>
          </div>

          {role === "owner" && (
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/managers/${params.id}/edit`}
                className="flex-1 sm:flex-none"
              >
                <Button variant="outline" className="gap-2 w-full text-sm">
                  <Edit className="h-4 w-4" />
                  <span className="hidden xs:inline">Edit</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                className="gap-2 flex-1 sm:flex-none text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden xs:inline">Delete</span>
              </Button>
            </div>
          )}
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
            {/* Contact Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg bg-blue-500/10 flex-shrink-0">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Email
                    </p>
                    <a
                      href={`mailto:${manager.email}`}
                      className="text-xs sm:text-sm font-medium hover:underline truncate block"
                    >
                      {manager.email}
                    </a>
                  </div>
                </div>

                {manager.phone && (
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg bg-green-500/10 flex-shrink-0">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Phone
                      </p>
                      <a
                        href={`tel:${manager.phone}`}
                        className="text-xs sm:text-sm font-medium hover:underline"
                      >
                        {manager.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg bg-purple-500/10 flex-shrink-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Joined
                    </p>
                    <p className="text-xs sm:text-sm font-medium">
                      {new Date(manager.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requests Created */}
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
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      Latest {Math.min(requests.length, 5)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8 sm:py-10 lg:py-12 px-4">
                    <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl bg-muted mx-auto mb-3 sm:mb-4">
                      <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">
                      No Requests Created
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      This manager hasn&apos;t created any maintenance requests
                      yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {requests.slice(0, 5).map((request) => (
                      <RequestCard key={request.id} request={request} />
                    ))}
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
                    {manager.full_name?.[0]?.toUpperCase() || "M"}
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg truncate px-2">
                    {manager.full_name}
                  </h3>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Manager
                  </Badge>
                </div>

                <Separator className="my-3 sm:my-4" />

                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground truncate">
                      Organization
                    </span>
                    <span className="font-medium truncate text-right">
                      {manager.organization?.name || "N/A"}
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

            {/* Quick Stats */}
            <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Activity Overview
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

      {/* Delete manager modal (owner only) */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleteLoading) setShowDeleteModal(false);
        }}
        onConfirm={handleDeleteManagerConfirmed}
        title={`Delete ${manager.full_name}?`}
        description="This will permanently remove this manager from your organization. This action cannot be undone."
        confirmText="Delete Manager"
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
      <CardContent className="pt-4 sm:pt-5 lg:pt-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-1 lg:mt-2">
              {value}
            </p>
          </div>
          <div
            className={`grid h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12 place-items-center rounded-xl ${colors[color]} flex-shrink-0`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
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
          <div className="flex items-center gap-2 flex-wrap mb-1.5 sm:mb-2">
            <h4 className="font-semibold text-xs sm:text-sm truncate">
              {request.title}
            </h4>
          </div>

          <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
            {request.property && (
              <span className="flex items-center gap-1 truncate">
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
