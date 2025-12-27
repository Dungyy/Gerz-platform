"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Calendar,
  Wrench,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    loadTenant();
  }, [params.id]);

  async function loadTenant() {
    try {
      // Load tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from("profiles")
        .select(
          `
        *,
        unit:units!units_tenant_id_fkey(
          id,
          unit_number,
          floor,
          bedrooms,
          bathrooms,
          square_feet,
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
        .eq("id", params.id)
        .eq("role", "tenant")
        .single();

      if (tenantError) {
        console.error("Error loading tenant:", tenantError);
      }
      setTenant(tenantData);

      // Load tenant's requests
      const { data: requestsData, error: reqError } = await supabase
        .from("maintenance_requests")
        .select(
          `
        *,
        property:properties(name),
        unit:units(unit_number)
      `
        )
        .eq("tenant_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reqError) {
        console.error("Error loading tenant requests:", reqError);
      }

      setRequests(requestsData || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTenantConfirmed() {
    if (!tenant) return;

    try {
      setRemoveLoading(true);

      // Unassign from unit
      if (tenant.unit && tenant.unit.length > 0) {
        await supabase
          .from("units")
          .update({ tenant_id: null })
          .eq("id", tenant.unit[0].id);
      }

      toast.success("Tenant removed from unit successfully");
      router.push("/dashboard/tenants");
    } catch (error) {
      console.error("Error removing tenant:", error);
      toast.error("Error removing tenant");
    } finally {
      setRemoveLoading(false);
      setShowRemoveModal(false);
    }
  }

  if (loading || !tenant) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  const unit = tenant.unit && tenant.unit.length > 0 ? tenant.unit[0] : null;
  const property = unit?.property;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{tenant.full_name}</h2>
            <p className="text-gray-600 mt-1">Tenant Profile</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="text-red-600"
              onClick={() => setShowRemoveModal(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <a
                        href={`mailto:${tenant.email}`}
                        className="font-medium hover:text-blue-600"
                      >
                        {tenant.email}
                      </a>
                    </div>
                  </div>
                )}

                {tenant.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <a
                        href={`tel:${tenant.phone}`}
                        className="font-medium hover:text-blue-600"
                      >
                        {tenant.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="font-medium">
                      {new Date(tenant.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <Badge className="capitalize">{tenant.role}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Requests */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Maintenance Requests ({requests.length})
                  </CardTitle>
                  <Link
                    href="/dashboard/requests"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View All
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No requests yet
                    </p>
                  ) : (
                    requests.map((request) => (
                      <Link
                        key={request.id}
                        href={`/dashboard/requests/${request.id}`}
                        className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{request.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {request.property?.name} - Unit{" "}
                              {request.unit?.unit_number}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(
                                request.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status={request.status} />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Unit Information */}
            {unit && property ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Current Unit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Unit Number</p>
                    <p className="text-2xl font-bold">#{unit.unit_number}</p>
                  </div>

                  {unit.floor && (
                    <div>
                      <p className="text-sm text-gray-600">Floor</p>
                      <p className="font-medium">{unit.floor}</p>
                    </div>
                  )}

                  {(unit.bedrooms || unit.bathrooms) && (
                    <div className="flex gap-4">
                      {unit.bedrooms && (
                        <div>
                          <p className="text-sm text-gray-600">Bedrooms</p>
                          <p className="font-medium">{unit.bedrooms}</p>
                        </div>
                      )}
                      {unit.bathrooms && (
                        <div>
                          <p className="text-sm text-gray-600">Bathrooms</p>
                          <p className="font-medium">{unit.bathrooms}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {unit.square_feet && (
                    <div>
                      <p className="text-sm text-gray-600">Square Feet</p>
                      <p className="font-medium">
                        {unit.square_feet.toLocaleString()} sq ft
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Property</p>
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="hover:text-blue-600"
                    >
                      <p className="font-semibold">{property.name}</p>
                    </Link>
                    <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {property.address}
                        <br />
                        {property.city}, {property.state} {property.zip}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Home className="h-12 w-12 text-orange-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-orange-900 mb-2">
                      No Unit Assigned
                    </h3>
                    <p className="text-sm text-orange-700 mb-4">
                      This tenant is not currently assigned to a unit
                    </p>
                    <Button variant="outline" size="sm">
                      Assign Unit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Requests</span>
                  <span className="font-semibold">{requests.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-semibold">
                    {requests.filter((r) => r.status === "submitted").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-semibold">
                    {requests.filter((r) => r.status === "completed").length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Remove tenant modal */}
      <ConfirmationModal
        isOpen={showRemoveModal}
        onClose={() => {
          if (!removeLoading) setShowRemoveModal(false);
        }}
        onConfirm={handleRemoveTenantConfirmed}
        title={`Remove ${tenant.full_name} from unit?`}
        description="This will unassign the tenant from their current unit but keep their account active in your organization."
        confirmText="Remove from Unit"
        cancelText="Cancel"
        variant="warning"
        loading={removeLoading}
      />
    </>
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

  return <Badge className={variants[status]}>{status.replace("_", " ")}</Badge>;
}
