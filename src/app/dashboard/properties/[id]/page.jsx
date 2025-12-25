"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AddUnitModal } from "@/components/modals/add-unit-modal";
import {
  ArrowLeft,
  MapPin,
  User,
  Home,
  Plus,
  Mail,
  Phone,
  Edit,
  Trash2,
  Building2,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();

  // ✅ ALL STATE HOOKS FIRST (SAME ORDER EVERY RENDER)
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [deletingUnitId, setDeletingUnitId] = useState(null);

  const unitsPerPage = 20;

  // ✅ ALL EFFECTS TOGETHER (AFTER STATE HOOKS)
  useEffect(() => {
    loadProperty();
  }, [params.id]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [unitSearch, unitFilter]);

  async function loadProperty() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: "GET",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load property");
      }

      console.log("✅ Property loaded:", data);
      setProperty(data);
    } catch (err) {
      console.error("Error loading property:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const units = property?.units || [];
    const occupiedUnits = units.filter((u) => u.tenant_id).length;

    if (occupiedUnits > 0) {
      const confirmWithTenants = confirm(
        `⚠️ WARNING: This property has ${occupiedUnits} occupied unit${
          occupiedUnits > 1 ? "s" : ""
        }.\n\n` +
          `Deleting this property will:\n` +
          `• Remove all ${units.length} units\n` +
          `• Unassign ${occupiedUnits} tenant${
            occupiedUnits > 1 ? "s" : ""
          }\n` +
          `• Delete all maintenance requests for this property\n\n` +
          `This action CANNOT be undone!\n\n` +
          `Are you absolutely sure you want to delete "${property.name}"?`
      );

      if (!confirmWithTenants) return;
    } else {
      const confirmed = confirm(
        `Are you sure you want to delete "${property.name}"?\n\n` +
          `This will permanently delete:\n` +
          `• The property\n` +
          `• All ${units.length} unit${units.length !== 1 ? "s" : ""}\n` +
          `• All maintenance requests\n\n` +
          `This action cannot be undone.`
      );

      if (!confirmed) return;
    }

    setDeleting(true);

    try {
      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete property");
      }

      alert("✅ Property deleted successfully");
      router.push("/dashboard/properties");
    } catch (err) {
      console.error("Delete error:", err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteUnit(unitId, unitNumber) {
    const confirmed = confirm(
      `Are you sure you want to delete Unit ${unitNumber}?\n\n` +
        `This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingUnitId(unitId);

    try {
      const response = await fetchWithAuth(`/api/units/${unitId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to delete unit");
      }

      alert("✅ Unit deleted successfully");
      await loadProperty(); // Reload property data
    } catch (err) {
      console.error("Delete unit error:", err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setDeletingUnitId(null);
    }
  }

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-4 text-red-700">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ NOT FOUND STATE
  if (!property) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This property may have been deleted.
          </p>
          <Link href="/dashboard/properties">
            <Button>Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ✅ CALCULATE STATS (AFTER EARLY RETURNS)
  const units = property.units || [];
  const occupiedUnits = units.filter((u) => u.tenant_id).length;
  const vacantUnits = units.length - occupiedUnits;
  const occupancyRate =
    units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

  // ✅ FILTER UNITS
  const filteredUnits = units
    .filter((unit) => {
      // Filter by search
      const searchLower = unitSearch.toLowerCase();
      const matchesSearch =
        unit.unit_number?.toLowerCase().includes(searchLower) ||
        unit.tenant?.full_name?.toLowerCase().includes(searchLower) ||
        unit.floor?.toString().includes(searchLower);

      if (!matchesSearch) return false;

      // Filter by occupancy
      if (unitFilter === "occupied") return unit.tenant_id;
      if (unitFilter === "vacant") return !unit.tenant_id;
      return true;
    })
    .sort((a, b) => {
      // Sort by unit number (numeric)
      const aNum = parseInt(a.unit_number, 10);
      const bNum = parseInt(b.unit_number, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return (a.unit_number || "").localeCompare(b.unit_number || "");
    });

  // ✅ PAGINATION
  const totalPages = Math.ceil(filteredUnits.length / unitsPerPage);
  const startIndex = (currentPage - 1) * unitsPerPage;
  const endIndex = startIndex + unitsPerPage;
  const paginatedUnits = filteredUnits.slice(startIndex, endIndex);

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
            <h2 className="text-3xl font-bold tracking-tight">
              {property.name}
            </h2>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {property.address}, {property.city}, {property.state}{" "}
              {property.zip_code || property.zip}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/properties/${params.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Units"
          value={units.length}
          icon={Home}
          color="blue"
        />
        <StatCard
          title="Occupied"
          value={occupiedUnits}
          icon={User}
          color="green"
        />
        <StatCard
          title="Vacant"
          value={vacantUnits}
          icon={Building2}
          color="orange"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          icon={Calendar}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Units */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">
                  Units ({filteredUnits.length}
                  {filteredUnits.length !== units.length &&
                    ` of ${units.length}`}
                  )
                </CardTitle>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowAddUnitModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter */}
              {units.length > 5 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by unit #, tenant, or floor..."
                      className="pl-9"
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={unitFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUnitFilter("all")}
                      className="gap-1"
                    >
                      <Filter className="h-4 w-4" />
                      All
                    </Button>
                    <Button
                      variant={
                        unitFilter === "occupied" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setUnitFilter("occupied")}
                    >
                      Occupied
                    </Button>
                    <Button
                      variant={unitFilter === "vacant" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUnitFilter("vacant")}
                    >
                      Vacant
                    </Button>
                  </div>
                </div>
              )}

              {/* Units List */}
              {filteredUnits.length === 0 ? (
                <div className="text-center py-12">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted mx-auto mb-4">
                    <Home className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {units.length === 0 ? "No Units Yet" : "No Units Found"}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {units.length === 0
                      ? "Add units to this property to start managing tenants."
                      : "Try adjusting your search or filter."}
                  </p>
                  {units.length === 0 && (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowAddUnitModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add First Unit
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Responsive Table/Cards */}
                  <div className="space-y-2">
                    {/* Desktop Table Header */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                      <div className="col-span-2">Unit #</div>
                      <div className="col-span-1">Floor</div>
                      <div className="col-span-2">Beds/Baths</div>
                      <div className="col-span-2">Sq Ft</div>
                      <div className="col-span-2">Tenant</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1">Actions</div>
                    </div>

                    {/* Units */}
                    {paginatedUnits.map((unit) => (
                      <div
                        key={unit.id}
                        className="border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        {/* Desktop View - Table Row */}
                        <div className="hidden md:grid md:grid-cols-12 gap-4 items-center p-4">
                          <div className="col-span-2 font-semibold">
                            Unit {unit.unit_number}
                          </div>
                          <div className="col-span-1 text-sm text-muted-foreground">
                            {unit.floor ? `Floor ${unit.floor}` : "—"}
                          </div>
                          <div className="col-span-2 text-sm text-muted-foreground">
                            {unit.bedrooms && unit.bathrooms
                              ? `${unit.bedrooms}/${unit.bathrooms}`
                              : "—"}
                          </div>
                          <div className="col-span-2 text-sm text-muted-foreground">
                            {unit.square_feet
                              ? `${unit.square_feet.toLocaleString()} sq ft`
                              : "—"}
                          </div>
                          <div className="col-span-2">
                            {unit.tenant ? (
                              <Link
                                href={`/dashboard/tenants/${unit.tenant_id}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {unit.tenant.full_name}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Badge
                              className={
                                unit.tenant
                                  ? "bg-green-500/15 text-green-700 hover:bg-green-500/15"
                                  : "bg-orange-500/15 text-orange-700 hover:bg-orange-500/15"
                              }
                            >
                              {unit.tenant ? "Occupied" : "Vacant"}
                            </Badge>
                          </div>
                          <div className="col-span-1">
                            {!unit.tenant && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteUnit(unit.id, unit.unit_number)
                                }
                                disabled={deletingUnitId === unit.id}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Mobile View - Card */}
                        <div className="md:hidden p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10">
                                <Home className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  Unit {unit.unit_number}
                                </p>
                                {unit.floor && (
                                  <p className="text-xs text-muted-foreground">
                                    Floor {unit.floor}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  unit.tenant
                                    ? "bg-green-500/15 text-green-700 hover:bg-green-500/15"
                                    : "bg-orange-500/15 text-orange-700 hover:bg-orange-500/15"
                                }
                              >
                                {unit.tenant ? "Occupied" : "Vacant"}
                              </Badge>
                              {!unit.tenant && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteUnit(unit.id, unit.unit_number)
                                  }
                                  disabled={deletingUnitId === unit.id}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {(unit.bedrooms ||
                            unit.bathrooms ||
                            unit.square_feet) && (
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              {unit.bedrooms && (
                                <span>{unit.bedrooms} bed</span>
                              )}
                              {unit.bathrooms && (
                                <span>{unit.bathrooms} bath</span>
                              )}
                              {unit.square_feet && (
                                <span>
                                  {unit.square_feet.toLocaleString()} sq ft
                                </span>
                              )}
                            </div>
                          )}

                          {unit.tenant && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Tenant
                              </p>
                              <Link
                                href={`/dashboard/tenants/${unit.tenant_id}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {unit.tenant.full_name}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}-
                        {Math.min(endIndex, filteredUnits.length)} of{" "}
                        {filteredUnits.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Prev</span>
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="gap-1"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary" className="capitalize">
                  {property.property_type || "Property"}
                </Badge>
              </div>

              {property.year_built && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Year Built</span>
                  <span className="font-medium">{property.year_built}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Units</span>
                <span className="font-medium">{units.length}</span>
              </div>

              {property.description && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-muted-foreground mb-2">Description</p>
                    <p className="text-sm">{property.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Manager */}
          {property.manager && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Property Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold">{property.manager.full_name}</p>
                </div>

                {property.manager.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${property.manager.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {property.manager.email}
                    </a>
                  </div>
                )}

                {property.manager.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${property.manager.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {property.manager.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="shadow-sm border-red-500/20">
            <CardHeader>
              <CardTitle className="text-lg text-red-600">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Deleting this property will permanently remove:
              </p>
              <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                <li>
                  • All {units.length} unit{units.length !== 1 ? "s" : ""}
                </li>
                {occupiedUnits > 0 && (
                  <li className="text-orange-600 font-medium">
                    • {occupiedUnits} tenant assignment
                    {occupiedUnits > 1 ? "s" : ""}
                  </li>
                )}
                <li>• All maintenance requests</li>
                <li>• All property history</li>
              </ul>
              <Button
                variant="outline"
                className="w-full gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 border-red-200 dark:border-red-900"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete Property"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Unit Modal */}
      <AddUnitModal
        isOpen={showAddUnitModal}
        onClose={() => setShowAddUnitModal(false)}
        propertyId={params.id}
        onSuccess={loadProperty}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "text-blue-600 bg-blue-500/10",
    green: "text-green-600 bg-green-500/10",
    orange: "text-orange-600 bg-orange-500/10",
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
