"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, User, Home, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    unit_id: "",
  });

  const [units, setUnits] = useState([]);
  const [currentUnitId, setCurrentUnitId] = useState(null);

  useEffect(() => {
    if (!params?.id) return;
    init();
  }, [params.id]);

  async function init() {
    try {
      setLoading(true);
      setError(null);

      // Auth + role check
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "owner" && profile?.role !== "manager") {
        toast.error("You do not have permission to edit tenants");
        router.push("/dashboard/tenants");
        return;
      }

      // Load tenant
      await loadTenantAndUnits();
    } catch (err) {
      console.error("Auth/init error:", err);
      setError("Failed to verify permissions or load tenant");
    } finally {
      setLoading(false);
    }
  }

  async function loadTenantAndUnits() {
    try {
      // Fetch tenant details from /api/tenants/[id]
      const res = await fetchWithAuth(`/api/tenants/${params.id}`, {
        method: "GET",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const tenant = await res.json().catch(() => null);

      if (!res.ok || !tenant) {
        throw new Error(tenant?.error || "Failed to load tenant");
      }

      const unit = Array.isArray(tenant.unit) ? tenant.unit[0] : tenant.unit;
      const assignedUnitId = unit?.id || null;

      setFormData({
        full_name: tenant.full_name || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        unit_id: assignedUnitId || "",
      });
      setCurrentUnitId(assignedUnitId);

      // Load units (similar to invite tenant page)
      const unitsRes = await fetchWithAuth("/api/units", { method: "GET" });
      const unitsData = await unitsRes.json().catch(() => []);

      const allUnits = Array.isArray(unitsData) ? unitsData : [];

      // Only show vacant units + this tenant's current unit (even if occupied)
      const selectableUnits = allUnits.filter(
        (u) => !u.tenant_id || u.id === assignedUnitId
      );

      setUnits(selectableUnits);
    } catch (err) {
      console.error("Error loading tenant/units:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load tenant details"
      );
    }
  }

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        unit_id: formData.unit_id || null, // null = unassign
      };

      const res = await fetchWithAuth(`/api/tenants/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update tenant");
      }

      toast.success("Tenant updated successfully!");
      router.push(`/dashboard/tenants/${params.id}`);
    } catch (err) {
      console.error("Error updating tenant:", err);
      toast.error(
        `❌ Error: ${err instanceof Error ? err.message : "Unknown"}`
      );
    } finally {
      setSaving(false);
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
          <CardContent className="py-4 sm:py-6">
            <p className="text-red-700 font-medium mb-1 text-sm sm:text-base">
              {error || "Tenant not found"}
            </p>
            <p className="text-xs sm:text-sm text-red-700/80 mb-4">
              This tenant may have been deleted or is not accessible.
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

  // Group units by property name for the select
  const unitsByProperty = units.reduce((acc, unit) => {
    const propertyName = unit.property?.name || "Unknown Property";
    if (!acc[propertyName]) acc[propertyName] = [];
    acc[propertyName].push(unit);
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Edit Tenant
          </h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Update tenant information and unit assignment
          </p>
        </div>
      </div>

      {/* Info Box */}
      <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="flex gap-3">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg bg-blue-500/10 flex-shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-semibold mb-1">Note</p>
              <p className="text-muted-foreground">
                Changes take effect immediately. If you change the unit, the
                tenant will be unassigned from their previous unit and assigned
                to the new one.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Tenant Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">
              Tenant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  name="full_name"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Phone (optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit Selection */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              Unit Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-xs sm:text-sm font-medium mb-2">
              Assign Unit
            </label>

            {units.length === 0 ? (
              <div className="p-4 sm:p-6 border-2 border-dashed rounded-lg text-center">
                <Home className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-medium text-sm sm:text-base">
                  No available units found
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 px-2">
                  This tenant may remain unassigned, or you can create more
                  units.
                </p>
              </div>
            ) : (
              <select
                name="unit_id"
                value={formData.unit_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 text-sm sm:text-base h-10 sm:h-11"
              >
                <option value="">— No unit / Unassign —</option>
                {Object.entries(unitsByProperty).map(
                  ([propertyName, propertyUnits]) => (
                    <optgroup key={propertyName} label={propertyName}>
                      {propertyUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unit_number}
                          {unit.bedrooms
                            ? ` • ${unit.bedrooms} bed, ${unit.bathrooms} bath`
                            : ""}
                          {unit.id === currentUnitId ? " (current)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            )}

            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              Showing vacant units{currentUnitId ? " and current unit" : ""}.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 w-full sm:flex-1 text-sm sm:text-base"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
            className="w-full sm:flex-1 text-sm sm:text-base"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
