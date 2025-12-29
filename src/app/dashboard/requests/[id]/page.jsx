"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Home,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle,
  Send,
  Lock,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [request, setRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [commenting, setCommenting] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [assignedWorker, setAssignedWorker] = useState("");

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      await loadRequest();
      await loadComments();

      if (profileData?.role === "manager" || profileData?.role === "owner") {
        await loadWorkers();
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }

  async function loadRequest() {
    try {
      const response = await fetchWithAuth(`/api/requests/${params.id}`, {
        method: "GET",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load request");
      }

      setRequest(data);
      setStatusUpdate(data.status);
      setAssignedWorker(data.assigned_to || "");
    } catch (error) {
      console.error("Error loading request:", error);
    }
  }

  async function loadComments() {
    try {
      const response = await fetchWithAuth(
        `/api/requests/${params.id}/comments`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments(Array.isArray(data) ? data : []);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      setComments([]);
    }
  }

  async function loadWorkers() {
    try {
      const response = await fetchWithAuth("/api/workers", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setWorkers(data);
      }
    } catch (error) {
      console.error("Error loading workers:", error);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommenting(true);

    try {
      const response = await fetchWithAuth(
        `/api/requests/${params.id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            comment: newComment,
            is_internal: isInternal,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to add comment");
      }

      setNewComment("");
      setIsInternal(false);
      await loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setCommenting(false);
    }
  }

  async function handleUpdateRequest() {
    setUpdating(true);

    try {
      const updates = {};

      if (statusUpdate !== request.status) {
        updates.status = statusUpdate;
      }

      if (assignedWorker !== request.assigned_to) {
        updates.assigned_to = assignedWorker || null;
      }

      if (Object.keys(updates).length === 0) {
        toast.error("No changes to save");
        setUpdating(false);
        return;
      }

      const response = await fetchWithAuth(`/api/requests/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update request");
      }

      toast.success("✅ Request updated successfully!");
      await loadRequest();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  }

  if (loading || !request) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading request...</p>
        </div>
      </div>
    );
  }

  const canManage = profile?.role === "manager" || profile?.role === "owner";
  const canUpdate =
    canManage ||
    (profile?.role === "worker" && request.assigned_to === currentUser?.id);
  const isTenant = profile?.role === "tenant";

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.back()}
            className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold line-clamp-2">
              {request.title}
            </h1>
            <p className="text-gray-600 mt-1 text-xs sm:text-sm">
              Request #{request.id.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <PriorityBadge priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Description</p>
                <p className="mt-1 text-sm sm:text-base">
                  {request.description}
                </p>
              </div>

              {request.location_details && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Specific Location
                  </p>
                  <p className="mt-1 text-sm sm:text-base">
                    {request.location_details}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Category</p>
                  <p className="mt-1 capitalize text-sm sm:text-base">
                    {request.category}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Created</p>
                  <p className="mt-1 text-sm sm:text-base">
                    {new Date(request.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Images */}
              {request.images && request.images.length > 0 && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">
                    Photos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                    {request.images.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <Image
                          src={url}
                          alt={`Photo ${index + 1}`}
                          width={400}
                          height={128}
                          className="w-full h-24 sm:h-32 object-cover rounded-lg border group-hover:shadow-lg transition-shadow"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Management Panel (Manager/Worker Only) */}
          {canUpdate && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-blue-900 text-base sm:text-lg">
                  Manage Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Quick Self-Assignment */}
                {!request.assigned_to && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium text-green-900 mb-2">
                      Not assigned yet
                    </p>
                    <Button
                      onClick={async () => {
                        setUpdating(true);
                        try {
                          const response = await fetchWithAuth(
                            `/api/requests/${params.id}`,
                            {
                              method: "PUT",
                              body: JSON.stringify({
                                assigned_to: currentUser.id,
                                status: "assigned",
                              }),
                            }
                          );

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data?.error || "Failed to assign");
                          }

                          toast.success("✅ Request assigned to you!");
                          await loadRequest();
                          await loadComments();
                        } catch (error) {
                          console.error("Error self-assigning:", error);
                          toast.error(`❌ Error: ${error.message}`);
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                      className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base h-10 sm:h-11"
                    >
                      {updating ? "Assigning..." : "🙋 Assign to Me"}
                    </Button>
                  </div>
                )}

                {/* Current Assignment Info */}
                {request.assigned_to && (
                  <div className="p-3 bg-white border rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">
                      Currently assigned to:
                    </p>
                    <p className="font-semibold text-sm sm:text-base">
                      {request.assigned_to === currentUser?.id ? (
                        <span className="text-green-600">You</span>
                      ) : (
                        request.assigned_to_user?.full_name
                      )}
                    </p>
                  </div>
                )}

                {/* Status Update */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm sm:text-base h-10 sm:h-11"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Worker Assignment (Manager Only) */}
                {canManage && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">
                      Assign to Worker
                    </label>
                    <select
                      value={assignedWorker}
                      onChange={(e) => setAssignedWorker(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm sm:text-base h-10 sm:h-11"
                    >
                      <option value="">-- Unassigned --</option>
                      <option value={currentUser.id}>
                        Myself ({profile.full_name})
                      </option>
                      {workers
                        .filter((w) => w.id !== currentUser.id)
                        .map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.full_name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Update Button */}
                <Button
                  onClick={handleUpdateRequest}
                  disabled={updating}
                  className="w-full text-sm sm:text-base h-10 sm:h-11"
                >
                  {updating ? "Updating..." : "Update Request"}
                </Button>

                {/* Mark Complete Quick Action */}
                {request.assigned_to === currentUser?.id &&
                  request.status !== "completed" && (
                    <Button
                      onClick={async () => {
                        if (!confirm("Mark this request as completed?")) return;

                        setUpdating(true);
                        try {
                          const response = await fetchWithAuth(
                            `/api/requests/${params.id}`,
                            {
                              method: "PUT",
                              body: JSON.stringify({
                                status: "completed",
                              }),
                            }
                          );

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data?.error || "Failed to update");
                          }

                          toast.success("✅ Request marked as completed!");
                          await loadRequest();
                          await loadComments();
                        } catch (error) {
                          console.error("Error completing request:", error);
                          toast.error(`❌ Error: ${error.message}`);
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                      className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base h-10 sm:h-11"
                      variant="outline"
                    >
                      ✅ Mark as Completed
                    </Button>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Comments List */}
              <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 sm:py-8 text-sm">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 sm:p-4 rounded-lg ${
                        comment.is_internal
                          ? "bg-yellow-50 border border-yellow-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs sm:text-sm truncate">
                              {comment.user?.full_name}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 capitalize">
                              {comment.user?.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
                          {comment.is_internal && (
                            <Badge className="bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs whitespace-nowrap">
                              <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                              Internal
                            </Badge>
                          )}
                          <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form
                onSubmit={handleAddComment}
                className="border-t pt-3 sm:pt-4 space-y-3"
              >
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="text-sm sm:text-base"
                />

                {/* Internal Comment Toggle (Staff Only) */}
                {!isTenant && (
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="internal"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded h-4 w-4 mt-0.5"
                    />
                    <label
                      htmlFor="internal"
                      className="text-xs sm:text-sm flex items-center gap-1 flex-1"
                    >
                      <Lock className="h-3 w-3 flex-shrink-0" />
                      Internal note (visible to staff only)
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={commenting || !newComment.trim()}
                  className="w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  {commenting ? "Posting..." : "Post Comment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Property & Unit Info */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Property</p>
                <p className="font-semibold text-sm sm:text-base truncate">
                  {request.property?.name}
                </p>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-gray-600">Address</p>
                <p className="text-xs sm:text-sm line-clamp-2">
                  {request.property?.address}
                  <br />
                  {request.property?.city}, {request.property?.state}{" "}
                  {request.property?.zip}
                </p>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-gray-600">Unit</p>
                <p className="font-semibold text-sm sm:text-base">
                  #{request.unit?.unit_number}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Info */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Name</p>
                <p className="font-semibold text-sm sm:text-base truncate">
                  {request.tenant?.full_name}
                </p>
              </div>

              {!isTenant && (
                <>
                  {request.tenant?.email && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Email</p>
                      <a
                        href={`mailto:${request.tenant.email}`}
                        className="text-xs sm:text-sm text-blue-600 hover:underline truncate block"
                      >
                        {request.tenant.email}
                      </a>
                    </div>
                  )}

                  {request.tenant?.phone && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Phone</p>
                      <a
                        href={`tel:${request.tenant.phone}`}
                        className="text-xs sm:text-sm text-blue-600 hover:underline"
                      >
                        {request.tenant.phone}
                      </a>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Assigned Worker */}
          {request.assigned_to_user && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-green-900 flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Assigned Worker
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Name</p>
                  <p className="font-semibold text-green-900 text-sm sm:text-base truncate">
                    {request.assigned_to_user.full_name}
                  </p>
                </div>

                {!isTenant && (
                  <>
                    {request.assigned_to_user.email && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Email
                        </p>
                        <a
                          href={`mailto:${request.assigned_to_user.email}`}
                          className="text-xs sm:text-sm text-blue-600 hover:underline truncate block"
                        >
                          {request.assigned_to_user.email}
                        </a>
                      </div>
                    )}

                    {request.assigned_to_user.phone && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Phone
                        </p>
                        <a
                          href={`tel:${request.assigned_to_user.phone}`}
                          className="text-xs sm:text-sm text-blue-600 hover:underline"
                        >
                          {request.assigned_to_user.phone}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium">Created</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {request.updated_at !== request.created_at && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium">
                      Last Updated
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      {new Date(request.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
