"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  User,
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
      property.city?.toLowerCase().includes(q) ||
      property.manager?.full_name?.toLowerCase().includes(q)
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
    <div className="space-y-4 sm:space-y-6 pb-6 overflow-x-hidden">
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
      <Card className="shadow-sm overflow-x-hidden">
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
          <p className="text-xs text-muted-foreground mt-2">
            Search by name, address, or manager
          </p>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card className="shadow-sm overflow-x-hidden">
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
                <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full border-2 border-transparent hover:border-gray-400 overflow-hidden">
                  <CardContent className="p-0 flex flex-col h-full">
                    {/* Property Image */}
                    <div className="relative w-full h-32 sm:h-40 bg-muted flex items-center justify-center overflow-hidden">
                      {property.photo_url ? (
                        <Image
                          src={property.photo_url}
                          alt={property.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      ) : (
                        <Building2 className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                      )}
                      
                      {/* Property Type Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant="secondary"
                          className="capitalize text-[10px] sm:text-xs bg-white/90 backdrop-blur-sm"
                        >
                          {property.property_type || "Property"}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 flex flex-col flex-1">
                      {/* Header */}
                      <div className="mb-3 sm:mb-4">
                        <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate mb-1">
                          {property.name}
                        </h3>
                        <div className="flex items-start gap-2 text-muted-foreground text-xs sm:text-sm">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">
                            {property.address}
                            {property.city && `, ${property.city}`}
                            {property.state && `, ${property.state}`}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                          <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="font-medium">
                            {unitCount} {unitCount === 1 ? "unit" : "units"}
                          </span>
                        </div>
                      </div>

                      {/* Manager Info */}
                      <div className="mt-auto pt-3 border-t">
                        <div className="flex items-center justify-between">
                          {property.manager?.full_name ? (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Manager Avatar */}
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden text-background flex-shrink-0">
                                {property.manager?.avatar_url ? (
                                  <Image
                                    src={property.manager.avatar_url}
                                    alt={property.manager.full_name}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-semibold text-sm">
                                    {property.manager.full_name[0]?.toUpperCase() || "M"}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                                  Manager
                                </p>
                                <p className="text-xs sm:text-sm font-medium truncate">
                                  {property.manager.full_name}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full dark:bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              </div>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                No manager assigned
                              </span>
                            </div>
                          )}
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 ml-2" />
                        </div>
                      </div>
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