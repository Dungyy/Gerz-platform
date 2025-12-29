"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Search, Plus, User, Clock } from "lucide-react";
import { toast } from "sonner";

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

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

      setCurrentUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      await loadRequests();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRequests() {
    try {
      const response = await fetchWithAuth("/api/requests", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  }

  async function handleQuickAssign(requestId) {
    try {
      const response = await fetchWithAuth(`/api/requests/${requestId}`, {
        method: "PUT",
        body: JSON.stringify({
          assigned_to: currentUser.id,
          status: "assigned",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to assign");
      }

      toast.success("✅ Request assigned to you!");
      await loadRequests();
    } catch (error) {
      console.error("Error assigning:", error);
      toast.error(`❌ Error: ${error.message}`);
    }
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.tenant?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || request.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || request.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const unassignedRequests = filteredRequests.filter((r) => !r.assigned_to);
  const myRequests = filteredRequests.filter(
    (r) => r.assigned_to === currentUser?.id
  );

  const isStaff =
    profile?.role === "manager" ||
    profile?.role === "owner" ||
    profile?.role === "worker";
  const isTenant = profile?.role === "tenant";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Maintenance Requests
          </h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {filteredRequests.length} total requests
          </p>
        </div>

        {isTenant && (
          <Link href="/dashboard/requests/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              New Request
            </Button>
          </Link>
        )}
      </div>

      {/* Quick Stats for Staff */}
      {isStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-orange-700 font-medium">
                    Unassigned
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-900 mt-1">
                    {unassignedRequests.length}
                  </p>
                </div>
                <Wrench className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-blue-700 font-medium">
                    Assigned to Me
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">
                    {myRequests.length}
                  </p>
                </div>
                <User className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-green-700 font-medium">
                    Total Requests
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">
                    {filteredRequests.length}
                  </p>
                </div>
                <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <Input
                placeholder="Search requests..."
                className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm sm:text-base h-10 sm:h-11 col-span-2 sm:col-span-1"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm sm:text-base h-10 sm:h-11 col-span-2 sm:col-span-1"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unassigned Requests Section (Staff Only) */}
      {isStaff && unassignedRequests.length > 0 && (
        <Card className="border-orange-200">
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-orange-900">
              🔔 Unassigned Requests ({unassignedRequests.length})
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {unassignedRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/requests/${request.id}`}>
                        <h4 className="font-semibold hover:text-blue-600 text-sm sm:text-base truncate">
                          {request.title}
                        </h4>
                      </Link>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                        {request.property?.name} - Unit{" "}
                        {request.unit?.unit_number}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {request.tenant?.full_name} •{" "}
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-4">
                      <PriorityBadge priority={request.priority} />
                      <Button
                        size="sm"
                        onClick={() => handleQuickAssign(request.id)}
                        className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                      >
                        🙋 Take It
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="space-y-2 sm:space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <Wrench className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  No requests found
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  {searchQuery
                    ? "Try a different search"
                    : "No maintenance requests yet"}
                </p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0">
                          {request.title}
                        </h4>
                        {request.assigned_to === currentUser?.id && (
                          <Badge className="bg-blue-100 text-blue-700 text-[10px] sm:text-xs whitespace-nowrap">
                            Assigned to you
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {request.property?.name} - Unit{" "}
                        {request.unit?.unit_number}
                      </p>
                      {!isTenant && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                          {request.tenant?.full_name} •{" "}
                          {formatDate(request.created_at)}
                        </p>
                      )}
                      {request.assigned_to_user &&
                        request.assigned_to !== currentUser?.id && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                            Assigned to: {request.assigned_to_user.full_name}
                          </p>
                        )}
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <PriorityBadge priority={request.priority} />
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const variants = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    emergency: "bg-red-100 text-red-700",
  };

  return (
    <Badge
      className={`${
        variants[priority] || "bg-gray-100 text-gray-700"
      } text-[10px] sm:text-xs`}
    >
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }) {
  const variants = {
    submitted: "bg-yellow-100 text-yellow-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge
      className={`${
        variants[status] || "bg-gray-100 text-gray-700"
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
  });
}
