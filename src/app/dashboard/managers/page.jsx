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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading managers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Managers</h2>
          <p className="text-muted-foreground mt-1">
            {managers.length} {managers.length === 1 ? "manager" : "managers"}{" "}
            in your organization
          </p>
        </div>

        {canInvite && (
          <Button onClick={() => setShowInviteModal(true)} className="gap-2">
            <Plus className="h-5 w-5" />
            Invite Manager
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search managers by name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {filteredManagers.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted mx-auto mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No managers yet</h3>
            <p className="text-muted-foreground mb-4">
              Invite a manager to help manage properties and requests.
            </p>
            {canInvite && (
              <Button
                className="gap-2"
                onClick={() => setShowInviteModal(true)}
              >
                <Plus className="h-5 w-5" />
                Invite Manager
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredManagers.map((manager) => (
            <Link key={manager.id} href={`/dashboard/managers/${manager.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full border border-transparent hover:border-border">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-background font-semibold text-lg">
                      {manager.full_name?.[0]?.toUpperCase() || "M"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {manager.full_name}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        Manager
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {manager.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{manager.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Joined{" "}
                      {manager.created_at
                        ? new Date(manager.created_at).toLocaleDateString()
                        : "—"}
                    </p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
