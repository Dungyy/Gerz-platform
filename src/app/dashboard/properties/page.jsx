"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Users,
  Plus,
  Search,
  ArrowRight,
  Home,
} from "lucide-react";

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is manager/owner
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const allowed =
        profileData?.role === "owner" || profileData?.role === "manager";
      setCanCreate(allowed);

      if (!allowed) {
        router.push("/dashboard");
        return;
      }

      await loadProperties();
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }

  async function loadProperties() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth("/api/properties", {
        method: "GET",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load properties");
      }

      setProperties(Array.isArray(data) ? data : data.properties || []);
    } catch (err) {
      console.error("Error loading properties:", err);
      setError(err.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  }

  const filteredProperties = properties.filter(
    (property) =>
      property.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Properties</h2>
          <p className="text-muted-foreground mt-1">
            {properties.length}{" "}
            {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>

        {canCreate && (
          <Link href="/dashboard/properties/new">
            <Button className="gap-2">
              <Plus className="h-5 w-5" />
              Add Property
            </Button>
          </Link>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-4 text-red-700">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search properties by name, address, or city..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted mx-auto mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Add your first property to get started"}
            </p>
            {!searchQuery && canCreate && (
              <Link href="/dashboard/properties/new">
                <Button className="gap-2">
                  <Plus className="h-5 w-5" />
                  Add Property
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const unitCount =
              property.units_count ??
              property.unit_count ??
              property.unitsCount ??
              0;

            return (
              <Link
                key={property.id}
                href={`/dashboard/properties/${property.id}`}
              >
                <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full border border-transparent hover:border-border">
                  <CardContent className="pt-6">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-500/10">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {property.name}
                        </h3>
                        <Badge variant="secondary" className="mt-1 capitalize">
                          {property.property_type || "Property"}
                        </Badge>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">
                          {property.address}
                          {property.city && `, ${property.city}`}
                          {property.state && `, ${property.state}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Home className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {unitCount} {unitCount === 1 ? "unit" : "units"}
                        </span>
                      </div>
                    </div>
                    {console.log(property)}
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      {property.manager?.full_name ? (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Manager
                          </p>
                          <p className="text-sm font-medium truncate">
                            {property.manager.full_name}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No manager assigned
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
