"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InviteManagerModal } from "@/components/modals/invite-manager-modal";
import { User, Mail, Plus, Search, ArrowRight } from "lucide-react";

export default function ManagersPage() {
  const router = useRouter();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [canInvite, setCanInvite] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Only owners can see managers page + invite managers
      if (profile?.role !== "owner") {
        router.push("/dashboard");
        return;
      }

      setCanInvite(true);
      await loadManagers();
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }

  async function loadManagers() {
    try {
      const response = await fetchWithAuth("/api/managers", { method: "GET" });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load managers");
      }

      const data = await response.json();
      setManagers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading managers:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredManagers = managers.filter(
    (m) =>
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading managers...</p>
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
            Managers
          </h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {managers.length} {managers.length === 1 ? "manager" : "managers"}{" "}
            in your organization
          </p>
        </div>

        {canInvite && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Invite Manager</span>
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Search managers..."
              className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {filteredManagers.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 sm:py-10 lg:py-12 text-center px-4">
            <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl bg-muted mx-auto mb-3 sm:mb-4">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              No managers yet
            </h3>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base px-2">
              Invite a manager to help manage properties and requests.
            </p>
            {canInvite && (
              <Button
                className="gap-2 w-full sm:w-auto text-sm sm:text-base"
                onClick={() => setShowInviteModal(true)}
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                Invite Manager
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {filteredManagers.map((manager) => (
            <Link key={manager.id} href={`/dashboard/managers/${manager.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full border border-transparent hover:border-border">
                <CardContent className="pt-4 sm:pt-6 pb-4">
                  <div className="flex items-start gap-3 mb-3 sm:mb-4">
                    <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-foreground text-background font-semibold text-base sm:text-lg flex-shrink-0">
                      {manager.full_name?.[0]?.toUpperCase() || "M"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-sm sm:text-base">
                        {manager.full_name}
                      </h3>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Manager
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3 sm:mb-4">
                    {manager.email && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{manager.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Joined{" "}
                      {manager.created_at
                        ? new Date(manager.created_at).toLocaleDateString()
                        : "—"}
                    </p>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Invite Manager Modal */}
      <InviteManagerModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={loadManagers}
      />
    </div>
  );
}
