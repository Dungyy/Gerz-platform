"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AddUnitModal } from "@/components/modals/add-unit-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
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

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [deletingUnitId, setDeletingUnitId] = useState(null);

  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false);
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);

  const unitsPerPage = 20;

  useEffect(() => {
    if (!params?.id) return;
    loadProperty();
  }, [params.id]);

  useEffect(() => {
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

      setProperty(data);
    } catch (err) {
      console.error("Error loading property:", err);
      setError(err.message);
      toast.error(`Failed to load property: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProperty() {
    setDeleting(true);

    try {
      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete property");
      }

      toast.success("Property deleted successfully");
      router.push("/dashboard/properties");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(`Failed to delete property: ${err.message}`);
    } finally {
      setDeleting(false);
      setShowDeletePropertyModal(false);
    }
  }

  async function handleDeleteUnit() {
    if (!unitToDelete) return;

    setDeletingUnitId(unitToDelete.id);

    try {
      const response = await fetchWithAuth(`/api/units/${unitToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to delete unit");
      }

      toast.success(`Unit ${unitToDelete.unit_number} deleted successfully`);
      await loadProperty();
    } catch (err) {
      console.error("Delete unit error:", err);
      toast.error(`Failed to delete unit: ${err.message}`);
    } finally {
      setDeletingUnitId(null);
      setShowDeleteUnitModal(false);
      setUnitToDelete(null);
    }
  }

  function openDeleteUnitModal(unit) {
    setUnitToDelete(unit);
    setShowDeleteUnitModal(true);
  }

  // Loading
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading property...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-6">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-3 sm:py-4 text-red-700 text-sm">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found
  if (!property) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold mb-2">
            Property Not Found
          </h2>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            This property may have been deleted.
          </p>
          <Link href="/dashboard/properties">
            <Button className="text-sm sm:text-base">Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const units = property.units || [];
  const occupiedUnits = units.filter((u) => u.tenant_id).length;
  const vacantUnits = units.length - occupiedUnits;
  const occupancyRate =
    units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

  const filteredUnits = units
    .filter((unit) => {
      const searchLower = unitSearch.toLowerCase();
      const matchesSearch =
        unit.unit_number?.toLowerCase().includes(searchLower) ||
        unit.tenant?.full_name?.toLowerCase().includes(searchLower) ||
        unit.floor?.toString().includes(searchLower);

      if (!matchesSearch) return false;

      if (unitFilter === "occupied") return unit.tenant_id;
      if (unitFilter === "vacant") return !unit.tenant_id;
      return true;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.unit_number, 10);
      const bNum = parseInt(b.unit_number, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return (a.unit_number || "").localeCompare(b.unit_number || "");
    });

  const totalPages = Math.ceil(filteredUnits.length / unitsPerPage);
  const startIndex = (currentPage - 1) * unitsPerPage;
  const endIndex = startIndex + unitsPerPage;
  const paginatedUnits = filteredUnits.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.back()}
            className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border mt-0.5 sm:mt-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
              {property.name}
            </h2>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 flex items-start gap-1.5 text-xs sm:text-sm">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
              <span className="leading-snug line-clamp-2">
                {property.address}, {property.city}, {property.state}{" "}
                {property.zip_code || property.zip}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/properties/${params.id}/edit`}
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
            onClick={() => setShowDeletePropertyModal(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden xs:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
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
          title="Occupancy"
          value={`${occupancyRate}%`}
          icon={Calendar}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Units */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">
                    Units ({filteredUnits.length}
                    {filteredUnits.length !== units.length &&
                      ` of ${units.length}`}
                    )
                  </CardTitle>
                  <Button
                    size="sm"
                    className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={() => setShowAddUnitModal(true)}
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Add Unit</span>
                    <span className="xs:hidden">Add</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-4">
              {/* Search & Filter */}
              {units.length > 5 && (
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search units..."
                      className="pl-9 sm:pl-10 text-sm h-9 sm:h-10"
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <Button
                      variant={unitFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUnitFilter("all")}
                      className="gap-1 whitespace-nowrap h-8 text-xs sm:text-sm"
                    >
                      <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      All
                    </Button>
                    <Button
                      variant={
                        unitFilter === "occupied" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setUnitFilter("occupied")}
                      className="whitespace-nowrap h-8 text-xs sm:text-sm"
                    >
                      Occupied
                    </Button>
                    <Button
                      variant={unitFilter === "vacant" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUnitFilter("vacant")}
                      className="whitespace-nowrap h-8 text-xs sm:text-sm"
                    >
                      Vacant
                    </Button>
                  </div>
                </div>
              )}

              {/* Units List */}
              {filteredUnits.length === 0 ? (
                <div className="text-center py-8 sm:py-10 lg:py-12 px-4">
                  <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl bg-muted mx-auto mb-3 sm:mb-4">
                    <Home className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base lg:text-lg">
                    {units.length === 0 ? "No Units Yet" : "No Units Found"}
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-4">
                    {units.length === 0
                      ? "Add units to this property to start managing tenants."
                      : "Try adjusting your search or filter."}
                  </p>
                  {units.length === 0 && (
                    <Button
                      size="sm"
                      className="gap-2 text-xs sm:text-sm"
                      onClick={() => setShowAddUnitModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add First Unit
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {/* Desktop header - hidden on mobile */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                      <div className="col-span-2">Unit #</div>
                      <div className="col-span-1">Floor</div>
                      <div className="col-span-2">Beds/Baths</div>
                      <div className="col-span-2">Sq Ft</div>
                      <div className="col-span-2">Tenant</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>

                    {/* Units */}
                    {paginatedUnits.map((unit) => (
                      <div
                        key={unit.id}
                        className="border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        {/* Desktop row - hidden on tablet and mobile */}
                        <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-center p-4">
                          <div className="col-span-2 font-semibold text-sm">
                            Unit {unit.unit_number}
                          </div>
                          <div className="col-span-1 text-xs text-muted-foreground">
                            {unit.floor ? `Floor ${unit.floor}` : "—"}
                          </div>
                          <div className="col-span-2 text-xs text-muted-foreground">
                            {unit.bedrooms && unit.bathrooms
                              ? `${unit.bedrooms}/${unit.bathrooms}`
                              : "—"}
                          </div>
                          <div className="col-span-2 text-xs text-muted-foreground">
                            {unit.square_feet
                              ? `${unit.square_feet.toLocaleString()} sq ft`
                              : "—"}
                          </div>
                          <div className="col-span-2 text-sm">
                            {unit.tenant ? (
                              <Link
                                href={`/dashboard/tenants/${unit.tenant_id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {unit.tenant.full_name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Badge
                              className={
                                unit.tenant
                                  ? "bg-green-500/15 text-green-700 hover:bg-green-500/15 text-xs"
                                  : "bg-orange-500/15 text-orange-700 hover:bg-orange-500/15 text-xs"
                              }
                            >
                              {unit.tenant ? "Occupied" : "Vacant"}
                            </Badge>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {!unit.tenant && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteUnitModal(unit)}
                                disabled={deletingUnitId === unit.id}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Mobile/Tablet card */}
                        <div className="lg:hidden p-3 sm:p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg bg-blue-500/10 flex-shrink-0">
                                <Home className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
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
                                    ? "bg-green-500/15 text-green-700 hover:bg-green-500/15 text-[10px] sm:text-xs"
                                    : "bg-orange-500/15 text-orange-700 hover:bg-orange-500/15 text-[10px] sm:text-xs"
                                }
                              >
                                {unit.tenant ? "Occupied" : "Vacant"}
                              </Badge>
                              {!unit.tenant && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteUnitModal(unit)}
                                  disabled={deletingUnitId === unit.id}
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {(unit.bedrooms ||
                            unit.bathrooms ||
                            unit.square_feet) && (
                            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
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
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">
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
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-xs sm:text-sm">
                      <p className="text-muted-foreground">
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
                          className="gap-1 h-8 text-xs sm:text-sm"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden xs:inline">Prev</span>
                        </Button>
                        <span className="text-muted-foreground whitespace-nowrap">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="gap-1 h-8 text-xs sm:text-sm"
                        >
                          <span className="hidden xs:inline">Next</span>
                          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
        <div className="space-y-4 sm:space-y-6">
          {/* Property Info */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary" className="capitalize text-xs">
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
                  <Separator className="my-2 sm:my-3" />
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs sm:text-sm">
                      Description
                    </p>
                    <p className="text-xs sm:text-sm">{property.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Manager */}
          {property.manager && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Property Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <p className="font-semibold">{property.manager.full_name}</p>

                {property.manager.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={`mailto:${property.manager.email}`}
                      className="text-blue-600 hover:underline truncate"
                    >
                      {property.manager.email}
                    </a>
                  </div>
                )}

                {property.manager.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
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
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg text-red-600">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Deleting this property will permanently remove:
              </p>
              <ul className="text-xs sm:text-sm text-muted-foreground mb-4 space-y-1">
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
                className="w-full gap-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700  "
                onClick={() => setShowDeletePropertyModal(true)}
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Delete Property
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
        onSuccess={() => {
          loadProperty();
          toast.success("Unit added successfully");
        }}
      />

      {/* Delete Property Confirmation */}
      <ConfirmationModal
        isOpen={showDeletePropertyModal}
        onClose={() => setShowDeletePropertyModal(false)}
        onConfirm={handleDeleteProperty}
        title="Delete Property?"
        variant="danger"
        confirmText="Delete Property"
        loading={deleting}
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            You are about to permanently delete{" "}
            <span className="font-semibold text-foreground">
              {property.name}
            </span>
            .
          </p>
          <div className="p-3 bg-red-50 border  rounded-lg">
            <p className="font-medium text-red-900 mb-2">
              This will permanently remove:
            </p>
            <ul className="text-red-700 space-y-1">
              <li>
                • All {units.length} unit{units.length !== 1 ? "s" : ""}
              </li>
              {occupiedUnits > 0 && (
                <li className="font-semibold">
                  • {occupiedUnits} tenant assignment
                  {occupiedUnits > 1 ? "s" : ""}
                </li>
              )}
              <li>• All maintenance requests</li>
              <li>• All property history</li>
            </ul>
          </div>
          <p className="font-semibold text-red-600">
            This action cannot be undone!
          </p>
        </div>
      </ConfirmationModal>

      {/* Delete Unit Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteUnitModal}
        onClose={() => {
          setShowDeleteUnitModal(false);
          setUnitToDelete(null);
        }}
        onConfirm={handleDeleteUnit}
        title="Delete Unit?"
        variant="danger"
        confirmText="Delete Unit"
        loading={deletingUnitId !== null}
      >
        {unitToDelete && (
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              Unit {unitToDelete.unit_number}
            </span>
            ? This action cannot be undone.
          </p>
        )}
      </ConfirmationModal>
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
            className={`grid h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12 flex-shrink-0 place-items-center rounded-xl ${colors[color]}`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
