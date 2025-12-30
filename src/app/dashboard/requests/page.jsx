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
import { 
  Wrench, 
  Search, 
  Plus, 
  User, 
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building,
  Home,
  Calendar,
  MessageSquare,
  Image as ImageIcon,
  ChevronRight,
  Zap,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  async function handleRefresh() {
    setRefreshing(true);
    await loadRequests();
    setTimeout(() => setRefreshing(false), 500);
    toast.success("Refreshed!");
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.tenant?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    const matchesPriority = filterPriority === "all" || request.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const isStaff = ["manager", "owner", "worker"].includes(profile?.role);
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
    <div className="space-y-4 sm:space-y-6 pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Requests
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {isTenant && (
            <Link href="/dashboard/requests/new">
              <Button className="h-9 text-sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search requests..."
            className="pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-9 ${showFilters ? 'bg-gray-100' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          Filters
        </Button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
          <div>
            <label className="block text-xs font-medium mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-md text-sm h-9"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-md text-sm h-9"
            >
              <option value="all">All Priorities</option>
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No requests found</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              isTenant={isTenant}
              currentUserId={currentUser?.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, isTenant, currentUserId }) {
  // Helper function to parse images (same as detail page)
  function getImagesArray(images) {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse images:', e);
        return [];
      }
    }
    return [];
  }

  const requestImages = getImagesArray(request.images);
  const hasPhotos = requestImages.length > 0;
  const commentCount = 0; // Would come from API

  return (
    <Link href={`/dashboard/requests/${request.id}`}>
      <Card className="hover:shadow-lg transition-all border-2 hover:border-gray-400 bg-white">
        <CardContent className="p-4 sm:p-5">
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
                <span className="flex items-center gap-1">
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
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {requestImages.length} photo{requestImages.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Photo Preview Thumbnails */}
          {hasPhotos && (
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto">
                {requestImages.slice(0, 3).map((url, index) => (
                  <div
                    key={index}
                    className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0 hover:border-gray-400 transition-colors"
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {requestImages.length > 3 && (
                  <div className="w-16 h-16 rounded-lg border-2 border-gray-300 bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-700 flex-shrink-0">
                    +{requestImages.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-4">
            <p className="text-sm text-gray-900 mb-1 line-clamp-2">
              {request.description}
            </p>
            {request.location_details && (
              <p className="text-xs text-gray-600">
                📍 {request.location_details}
              </p>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-2.5 border-2 border-gray-200">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                <Wrench className="h-3.5 w-3.5" />
                <span className="font-medium">Assigned</span>
              </div>
              <p className="text-sm font-medium truncate">
                {request.assigned_to_user ? (
                  request.assigned_to === currentUserId ? 'You' : request.assigned_to_user.full_name
                ) : (
                  <span className="text-gray-500">Unassigned</span>
                )}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-2.5 border-2 border-gray-200">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium">Priority</span>
              </div>
              <p className="text-sm font-medium capitalize">
                {request.priority}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-2.5 border-2 border-gray-200">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">Status</span>
              </div>
              <p className="text-sm font-medium">
                {request.status === 'completed' ? 'Done' : formatETA(request.created_at)}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border-2 border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Timeline</p>
            <div className="space-y-1.5">
              <TimelineItem
                label="Submitted"
                value={formatTimestamp(request.created_at)}
              />
              {request.status !== 'submitted' && (
                <TimelineItem
                  label="Assigned"
                  value={formatTimestamp(request.updated_at)}
                />
              )}
              {request.status === 'in_progress' && (
                <TimelineItem
                  label="In progress"
                  value="Now"
                />
              )}
              {request.status === 'completed' && (
                <TimelineItem
                  label="Completed"
                  value={formatTimestamp(request.completed_at)}
                />
              )}
            </div>
          </div>

          {/* Latest Message */}
          {request.latest_comment && (
            <div className="mt-3 pt-3 border-t-2 border-gray-200">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 mb-0.5">
                    Latest message
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {request.latest_comment}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tenant Info (for staff) */}
          {!isTenant && request.tenant && (
            <div className="mt-3 pt-3 border-t-2 border-gray-200">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Tenant</p>
                  <p className="text-sm font-medium">{request.tenant.full_name}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function TimelineItem({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-600">{value}</span>
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
    <Badge className={`${variants[status] || variants.submitted} text-xs font-medium px-2 py-0.5 border-0`}>
      {labels[status] || status}
    </Badge>
  );
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
    day: "numeric"
  });
}

function formatETA(createdAt) {
  const created = new Date(createdAt);
  const eta = new Date(created);
  eta.setDate(eta.getDate() + 2); // 2 day ETA
  
  const now = new Date();
  if (eta < now) return "Overdue";
  
  if (eta.toDateString() === now.toDateString()) return "Today";
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (eta.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  
  return eta.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}