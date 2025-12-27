"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import {
  User,
  Mail,
  Phone,
  Plus,
  Search,
  Wrench,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
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
      setCurrentUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileData?.role !== "manager" && profileData?.role !== "owner") {
        router.push("/dashboard");
        return;
      }

      await loadWorkers();
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }

  async function loadWorkers() {
    try {
      const response = await fetchWithAuth("/api/workers", { method: "GET" });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 403) {
        toast.error("You do not have permission to view workers");
        router.push("/dashboard");
        return;
      }

      const data = await response.json();
      setWorkers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading workers:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredWorkers = workers.filter(
    (worker) =>
      worker.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workers</h2>
          <p className="text-muted-foreground mt-1">
            {workers.length} maintenance{" "}
            {workers.length === 1 ? "worker" : "workers"}
          </p>
        </div>

        <div className="flex gap-2">
          {/* <Link href="/dashboard/workers/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-5 w-5" />
              Add Worker
            </Button>
          </Link> */}
          <Button onClick={() => setShowInviteModal(true)} className="gap-2">
            <Mail className="h-5 w-5" />
            Invite Worker
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search workers by name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted mx-auto mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No workers found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Invite your first worker to get started"}
            </p>
            {!searchQuery && (
              <div className="flex gap-2 justify-center">
                {/* <Link href="/dashboard/workers/new">
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Add Worker
                  </Button>
                </Link> */}
                <Button
                  onClick={() => setShowInviteModal(true)}
                  className="gap-2"
                >
                  <Mail className="h-5 w-5" />
                  Invite Worker
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkers.map((worker) => (
            <Link key={worker.id} href={`/dashboard/workers/${worker.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full border border-transparent hover:border-border">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-foreground from-blue-600 to-indigo-600 text-white font-semibold text-lg shadow-sm">
                      {worker.full_name?.[0]?.toUpperCase() || "W"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {worker.full_name}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        Worker
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {worker.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{worker.email}</span>
                      </div>
                    )}

                    {worker.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{worker.phone}</span>
                      </div>
                    )}
                  </div>

                  {worker.stats && (
                    <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {worker.stats.total}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-600">
                          {worker.stats.active}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Active
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {worker.stats.completed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Done
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(worker.created_at).toLocaleDateString()}
                    </p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={loadWorkers}
        properties={properties}
      />
    </div>
  );
}
