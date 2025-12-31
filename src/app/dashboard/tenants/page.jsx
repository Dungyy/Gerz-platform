"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Search,
  Home,
  ArrowRight,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api-helper";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    checkAuthAndLoad();
    loadProperties();
  }, []);

  async function loadProperties() {
    try {
      const response = await fetchWithAuth("/api/properties", {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        setProperties(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load properties:", err);
    }
  }

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

      if (profileData?.role !== "manager" && profileData?.role !== "owner") {
        router.push("/dashboard");
        return;
      }

      await loadTenants();
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }

  async function loadTenants() {
    try {
      setLoading(true);
      setError("");

      const res = await fetchWithAuth("/api/tenants", { method: "GET" });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || "Failed to load tenants");

      setTenants(Array.isArray(data) ? data : data.tenants || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load tenants");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredTenants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        (t.full_name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q)
    );
  }, [tenants, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading tenants...</p>
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
            Tenants
          </h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {tenants.length} total {tenants.length === 1 ? "tenant" : "tenants"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setShowInviteModal(true)}
            className="gap-2 w-full sm:w-auto"
          >
            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Invite Tenant</span>
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-3 sm:py-4 text-red-700 text-sm">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {filteredTenants.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 sm:py-12 text-center">
            <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl bg-muted mx-auto mb-3 sm:mb-4">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              No tenants found
            </h3>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base px-4">
              {searchQuery
                ? "Try a different search term"
                : "Invite your first tenant to get started"}
            </p>
            {!searchQuery && (
              <div className="flex gap-2 justify-center px-4">
                <Button
                  onClick={() => setShowInviteModal(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Invite Tenant</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {filteredTenants.map((tenant) => {
            const unit = Array.isArray(tenant.unit)
              ? tenant.unit[0]
              : tenant.unit;
            return (
              <Link key={tenant.id} href={`/dashboard/tenants/${tenant.id}`}>
                <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full border border-transparent hover:border-border">
                  <CardContent className="pt-4 sm:pt-6 pb-4">
                    <div className="flex items-start gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-foreground text-background">
                {tenant?.avatar_url ? (
                  <Image
                    src={tenant.avatar_url}
                    alt={tenant?.full_name || "User"}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {tenant?.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate text-sm sm:text-base">
                          {tenant.full_name}
                        </h3>
                        {unit?.unit_number ? (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Unit {unit.unit_number}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1 text-xs">
                            No Unit
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-3 sm:mb-4">
                      {tenant.email && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{tenant.email}</span>
                        </div>
                      )}

                      {tenant.phone && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{tenant.phone}</span>
                        </div>
                      )}

                      {unit?.property?.name && (
                        <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">
                            {unit.property.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Joined{" "}
                        {tenant.created_at
                          ? new Date(tenant.created_at).toLocaleDateString()
                          : "—"}
                      </p>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={loadTenants}
        properties={properties}
      />
    </div>
  );
}
