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
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { fetchWithAuth } from "@/lib/api-helper";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    loadTenant();
    loadUnits();
  }, [params.id]);

  async function loadTenant() {
    try {
      setLoading(true);

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

  async function loadUnits() {
    try {
      const response = await fetchWithAuth("/api/units", { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        // Show all vacant units
        const allUnits = Array.isArray(data) ? data : [];
        setUnits(allUnits.filter((u) => !u.tenant_id));
      }
    } catch (error) {
      console.error("Error loading units:", error);
    }
  }

  async function handleAssignUnit() {
    if (!selectedUnit) {
      toast.error("Please select a unit");
      return;
    }

    setAssigning(true);
    try {
      const response = await fetchWithAuth(`/api/tenants/${params.id}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: tenant.full_name,
          email: tenant.email,
          phone: tenant.phone,
          unit_id: selectedUnit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to assign unit");
      }

      toast.success("✅ Unit assigned successfully!");
      setShowAssignModal(false);
      await loadTenant();
      await loadUnits();
    } catch (error) {
      console.error("Error assigning unit:", error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setAssigning(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading tenant...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-6">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <Card className="shadow-sm">
          <CardContent className="py-6 sm:py-8 text-center">
            <p className="text-base sm:text-lg font-semibold mb-2">
              Tenant not found
            </p>
            <p className="text-muted-foreground text-sm mb-4 px-4">
              This tenant may have been removed.
            </p>
            <Button
              onClick={() => router.push("/dashboard/tenants")}
              className="text-sm sm:text-base"
            >
              Back to Tenants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unit = tenant.unit && tenant.unit.length > 0 ? tenant.unit[0] : null;
  const property = unit?.property;

  // Group units by property
  const unitsByProperty = units.reduce((acc, u) => {
    const propertyName = u.property?.name || "Unknown Property";
    if (!acc[propertyName]) acc[propertyName] = [];
    acc[propertyName].push(u);
    return acc;
  }, {});

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
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold truncate">
                {tenant.full_name}
              </h2>
              <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
                Tenant Profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/dashboard/tenants/${tenant.id}/edit`}
              className="flex-1 sm:flex-none"
            >
              <Button variant="outline" className="gap-2 w-full text-sm h-9">
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none text-sm h-9 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => setShowRemoveModal(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {tenant.email && (
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg bg-blue-500/10">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Email
                      </p>
                      <a
                        href={`mailto:${tenant.email}`}
                        className="font-medium hover:text-blue-600 text-sm sm:text-base truncate block"
                      >
                        {tenant.email}
                      </a>
                    </div>
                  </div>
                )}

                {tenant.phone && (
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg bg-green-500/10">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Phone
                      </p>
                      <a
                        href={`tel:${tenant.phone}`}
                        className="font-medium hover:text-blue-600 text-sm sm:text-base"
                      >
                        {tenant.phone}
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
                    <p className="font-medium text-sm sm:text-base">
                      {new Date(tenant.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg bg-orange-500/10">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Role
                    </p>
                    <Badge className="capitalize text-xs mt-1">{tenant.role}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Requests */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Wrench className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">
                      Requests ({requests.length})
                    </span>
                  </CardTitle>
                  <Link
                    href="/dashboard/requests"
                    className="text-xs sm:text-sm text-blue-600 hover:underline whitespace-nowrap"
                  >
                    View All
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  {requests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">
                      No requests yet
                    </p>
                  ) : (
                    requests.map((request) => (
                      <Link
                        key={request.id}
                        href={`/dashboard/requests/${request.id}`}
                        className="block p-3 sm:p-4 border rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex flex-col gap-2 sm:gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm sm:text-base flex-1 min-w-0">
                              {request.title}
                            </h4>
                            <StatusBadge status={request.status} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {request.property?.name} - Unit{" "}
                              {request.unit?.unit_number}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(
                                request.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Unit Information */}
            {unit && property ? (
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                    Current Unit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Unit Number
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      #{unit.unit_number}
                    </p>
                  </div>

                  {unit.floor && (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Floor
                      </p>
                      <p className="font-medium text-sm sm:text-base">
                        {unit.floor}
                      </p>
                    </div>
                  )}

                  {(unit.bedrooms || unit.bathrooms) && (
                    <div className="flex gap-4">
                      {unit.bedrooms && (
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Bedrooms
                          </p>
                          <p className="font-medium text-sm sm:text-base">
                            {unit.bedrooms}
                          </p>
                        </div>
                      )}
                      {unit.bathrooms && (
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Bathrooms
                          </p>
                          <p className="font-medium text-sm sm:text-base">
                            {unit.bathrooms}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {unit.square_feet && (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Square Feet
                      </p>
                      <p className="font-medium text-sm sm:text-base">
                        {unit.square_feet.toLocaleString()} sq ft
                      </p>
                    </div>
                  )}

                  <div className="pt-3 sm:pt-4 border-t">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      Property
                    </p>
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="hover:text-blue-600"
                    >
                      <p className="font-semibold text-sm sm:text-base">
                        {property.name}
                      </p>
                    </Link>
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground mt-2">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
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
              <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
                <CardContent className="pt-4 sm:pt-6 pb-4">
                  <div className="text-center">
                    <Home className="h-10 w-10 sm:h-12 sm:w-12 text-orange-400 mx-auto mb-2 sm:mb-3" />
                    <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-2 text-sm sm:text-base">
                      No Unit Assigned
                    </h3>
                    <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mb-3 sm:mb-4 px-2">
                      This tenant is not currently assigned to a unit.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAssignModal(true)}
                      className="text-xs sm:text-sm w-full"
                    >
                      Assign Unit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Total Requests
                  </span>
                  <span className="font-semibold text-sm sm:text-base">
                    {requests.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Pending
                  </span>
                  <span className="font-semibold text-sm sm:text-base">
                    {requests.filter((r) => r.status === "submitted").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Completed
                  </span>
                  <span className="font-semibold text-sm sm:text-base">
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

      {/* Assign Unit Modal */}
      <ConfirmationModal
        isOpen={showAssignModal}
        onClose={() => {
          if (!assigning) {
            setShowAssignModal(false);
            setSelectedUnit("");
          }
        }}
        onConfirm={handleAssignUnit}
        title={`Assign Unit to ${tenant.full_name}`}
        confirmText="Assign Unit"
        cancelText="Cancel"
        variant="default"
        loading={assigning}
        description={
          <div className="space-y-3 text-left">
            <p className="text-sm text-muted-foreground">
              Select a unit to assign to this tenant:
            </p>
            
            {units.length === 0 ? (
              <div className="p-4 border-2 border-dashed rounded-lg text-center">
                <Home className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No available units found
                </p>
              </div>
            ) : (
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                disabled={assigning}
              >
                <option value="">— Select a unit —</option>
                {Object.entries(unitsByProperty).map(([propertyName, propertyUnits]) => (
                  <optgroup key={propertyName} label={propertyName}>
                    {propertyUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unit_number}
                        {u.bedrooms ? ` • ${u.bedrooms} bed, ${u.bathrooms} bath` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
        }
      />
    </>
  );
}

function StatusBadge({ status }) {
  const variants = {
    submitted:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
    assigned:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    in_progress:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    completed:
      "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    cancelled:
      "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400",
  };

  return (
    <Badge
      className={`${
        variants[status] || variants.submitted
      } text-[10px] sm:text-xs whitespace-nowrap border-0`}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
