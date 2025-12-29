"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    if (!params?.id) return;
    loadProperty();
  }, [params.id]);

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

      setFormData({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip_code || data.zip || "",
        property_type: data.property_type || "apartment",
        year_built: data.year_built || "",
        description: data.description || "",
      });
    } catch (err) {
      console.error("Error loading property:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          zip_code: formData.zip,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update property");
      }

      toast.success("✅ Property updated successfully!");
      router.push(`/dashboard/properties/${params.id}`);
    } catch (err) {
      console.error("Error updating property:", err);
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] mt-16 lg:mt-0">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 mt-16 lg:mt-0 px-2 sm:px-0">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-4 text-red-700 text-sm">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-16 lg:mt-0 px-2 sm:px-0">
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
            Edit Property
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Update property information
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
              <p className="font-semibold mb-1">Note</p>
              <p className="text-muted-foreground">
                Changes to the property will be saved immediately. Units can be
                managed from the property detail page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  placeholder="Property Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <Input
                  name="address"
                  placeholder="Street Address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <Input
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <Input
                  name="zip"
                  placeholder="ZIP Code"
                  value={formData.zip}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Property Type
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  <option value="apartment">Apartment Building</option>
                  <option value="house">Single Family Home</option>
                  <option value="condo">Condo</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed Use</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Year Built
                </label>
                <Input
                  type="number"
                  name="year_built"
                  placeholder="Year Built"
                  value={formData.year_built}
                  onChange={handleChange}
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  name="description"
                  placeholder="Optional description of the property..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 w-full sm:w-auto"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
