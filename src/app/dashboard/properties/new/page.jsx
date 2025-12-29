"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  X,
  ArrowLeft,
  AlertCircle,
  Upload,
  Download,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api-helper";
import { toast } from "sonner";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    property_type: "apartment",
    year_built: "",
    description: "",
  });

  const [units, setUnits] = useState([
    {
      unit_number: "",
      floor: "",
      bedrooms: "",
      bathrooms: "",
      square_feet: "",
    },
  ]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "owner" && profile?.role !== "manager") {
        router.push("/dashboard/properties");
        return;
      }

      setOrgId(profile?.organization_id);
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function addUnit() {
    const lastUnit = units[units.length - 1];
    const nextNumber = lastUnit?.unit_number
      ? String(parseInt(lastUnit.unit_number, 10) + 1)
      : "";
    setUnits([
      ...units,
      {
        unit_number: nextNumber,
        floor: lastUnit?.floor || "",
        bedrooms: lastUnit?.bedrooms || 1,
        bathrooms: lastUnit?.bathrooms || 1,
        square_feet: lastUnit?.square_feet || "",
      },
    ]);
  }

  function removeUnit(index) {
    setUnits(units.filter((_, i) => i !== index));
  }

  function updateUnit(index, field, value) {
    const newUnits = [...units];
    newUnits[index][field] = value;
    setUnits(newUnits);
  }

  function generateUnitsFromRange() {
    const startUnit = prompt("Enter starting unit number (e.g., 101):");
    const endUnit = prompt("Enter ending unit number (e.g., 120):");
    if (!startUnit || !endUnit) return;

    const start = parseInt(startUnit, 10);
    const end = parseInt(endUnit, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      toast.error("Invalid range");
      return;
    }

    const bedrooms = prompt("Default bedrooms:", "1");
    const bathrooms = prompt("Default bathrooms:", "1");
    const squareFeet = prompt("Default square feet (optional):", "");

    const newUnits = [];
    for (let i = start; i <= end; i++) {
      const floor = Math.floor(i / 100);
      newUnits.push({
        unit_number: String(i),
        floor: String(floor),
        bedrooms: bedrooms ? Number(bedrooms) : 1,
        bathrooms: bathrooms ? Number(bathrooms) : 1,
        square_feet: squareFeet || "",
      });
    }

    setUnits(newUnits);
    toast.success(`${newUnits.length} units generated!`);
  }

  function handleCSVImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      const rows = text.split("\n").filter((row) => row.trim());
      const dataRows = rows.slice(1);

      const importedUnits = dataRows
        .map((row) => {
          const [unit_number, floor, bedrooms, bathrooms, square_feet] = row
            .split(",")
            .map((s) => s.trim());

          return {
            unit_number: unit_number || "",
            floor: floor || "",
            bedrooms: bedrooms ? Number(bedrooms) : 1,
            bathrooms: bathrooms ? Number(bathrooms) : 1,
            square_feet: square_feet || "",
          };
        })
        .filter((u) => u.unit_number);

      if (importedUnits.length) {
        setUnits(importedUnits);
        toast.success(`${importedUnits.length} units imported!`);
      } else {
        toast.error("No valid units found in CSV");
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  }

  function downloadTemplate() {
    const csv = `unit_number,floor,bedrooms,bathrooms,square_feet
101,1,1,1,650
102,1,1,1,650
103,1,2,1,850
201,2,1,1,650
202,2,2,1,850`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "units_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orgId) {
      toast.error("Missing organization. Please re-login.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        organization_id: orgId,
        units: units
          .filter((u) => u.unit_number && u.unit_number.trim())
          .map((u) => ({
            ...u,
            bedrooms: u.bedrooms === "" ? null : Number(u.bedrooms),
            bathrooms: u.bathrooms === "" ? null : Number(u.bathrooms),
            square_feet: u.square_feet === "" ? null : Number(u.square_feet),
          })),
      };

      const response = await fetchWithAuth("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to create property");
      }

      toast.success(
        `✅ Property created with ${
          data.units_created ?? payload.units.length
        } units!`
      );
      router.push("/dashboard/properties");
    } catch (err) {
      console.error("Error creating property:", err);
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6  px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Add Property
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a new property with units
          </p>
        </div>
      </div>

      {/* Info Box */}
      <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-semibold mb-1">Quick tip</p>
              <p className="text-muted-foreground">
                Use bulk import or range generator to quickly add multiple units
                at once.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="name"
                placeholder="Property Name *"
                value={formData.name}
                onChange={handleChange}
                required
                className="md:col-span-2"
              />

              <Input
                name="address"
                placeholder="Street Address *"
                value={formData.address}
                onChange={handleChange}
                required
                className="md:col-span-2"
              />

              <Input
                name="city"
                placeholder="City *"
                value={formData.city}
                onChange={handleChange}
                required
              />
              <Input
                name="state"
                placeholder="State *"
                value={formData.state}
                onChange={handleChange}
                required
              />
              <Input
                name="zip"
                placeholder="ZIP Code *"
                value={formData.zip}
                onChange={handleChange}
                required
              />

              <select
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
              >
                <option value="apartment">Apartment Building</option>
                <option value="house">Single Family Home</option>
                <option value="condo">Condo</option>
                <option value="commercial">Commercial</option>
                <option value="mixed">Mixed Use</option>
              </select>

              <Input
                type="number"
                name="year_built"
                placeholder="Year Built"
                value={formData.year_built}
                onChange={handleChange}
              />

              <Textarea
                name="description"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={handleChange}
                className="md:col-span-2"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Units */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Units ({units.length})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkImport((v) => !v)}
                  className="gap-1"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Bulk Import</span>
                  <span className="sm:hidden">Bulk</span>
                </Button>
                <Button
                  type="button"
                  onClick={addUnit}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Unit
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {showBulkImport && (
              <div className="p-4 border-2 border-dashed rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <h4 className="font-semibold mb-3 text-sm">
                  Quick Add Multiple Units
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateUnitsFromRange}
                  >
                    Generate Range
                  </Button>

                  <label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="inline-flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Import CSV
                      </span>
                    </Button>
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Template
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Generate units 101-120, or import CSV with columns:
                  unit_number, floor, bedrooms, bathrooms, square_feet
                </p>
              </div>
            )}

            <div className="space-y-3 max-h-[26rem] overflow-y-auto">
              {units.map((unit, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-3 items-start p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1 w-full">
                    <Input
                      placeholder="Unit #"
                      value={unit.unit_number}
                      onChange={(e) =>
                        updateUnit(index, "unit_number", e.target.value)
                      }
                      required
                      className="text-sm col-span-2 sm:col-span-1"
                    />
                    <Input
                      placeholder="Floor"
                      value={unit.floor}
                      onChange={(e) =>
                        updateUnit(index, "floor", e.target.value)
                      }
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Beds"
                      value={unit.bedrooms}
                      onChange={(e) =>
                        updateUnit(index, "bedrooms", e.target.value)
                      }
                      min="0"
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Baths"
                      value={unit.bathrooms}
                      onChange={(e) =>
                        updateUnit(index, "bathrooms", e.target.value)
                      }
                      min="0"
                      step="0.5"
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Sq Ft"
                      value={unit.square_feet}
                      onChange={(e) =>
                        updateUnit(index, "square_feet", e.target.value)
                      }
                      min="0"
                      className="text-sm"
                    />
                  </div>

                  {units.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeUnit(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={loading || !orgId}
            className="gap-2 w-full sm:w-auto"
          >
            {loading
              ? "Creating..."
              : `Create Property with ${units.length} ${
                  units.length === 1 ? "Unit" : "Units"
                }`}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
