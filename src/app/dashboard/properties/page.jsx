"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
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

  const filteredProperties = properties.filter((property) => {
    const q = searchQuery.toLowerCase();
    return (
      property.name?.toLowerCase().includes(q) ||
      property.address?.toLowerCase().includes(q) ||
      property.city?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Properties
          </h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {properties.length}{" "}
            {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>

        {canCreate && (
          <Link href="/dashboard/properties/new" className="w-full sm:w-auto">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Add Property</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-3 sm:py-4 text-red-700 text-sm">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 sm:py-10 lg:py-12 text-center px-4">
            <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl bg-muted mx-auto mb-3 sm:mb-4">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              No properties found
            </h3>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base px-2">
              {searchQuery
                ? "Try a different search term."
                : "Add your first property to get started."}
            </p>
            {!searchQuery && canCreate && (
              <Link href="/dashboard/properties/new">
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Add Property</span>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
                className="block h-full"
              >
                <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full border border-transparent hover:border-border">
                  <CardContent className="pt-4 sm:pt-6 pb-4 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3 sm:mb-4">
                      <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-lg bg-blue-500/10 flex-shrink-0">
                        <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate">
                          {property.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="mt-1 capitalize text-[10px] sm:text-xs"
                        >
                          {property.property_type || "Property"}
                        </Badge>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm">
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">
                          {property.address}
                          {property.city && `, ${property.city}`}
                          {property.state && `, ${property.state}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>
                          {unitCount} {unitCount === 1 ? "unit" : "units"}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 mt-auto border-t">
                      {property.manager?.full_name ? (
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                            Manager
                          </p>
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {property.manager.full_name}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                          No manager assigned
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 ml-2" />
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
