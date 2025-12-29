"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function EditWorkerPage() {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (!params?.id) return;
    checkAuthAndLoad();
  }, [params.id]);

  async function checkAuthAndLoad() {
    try {
      setLoading(true);
      setError(null);

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
        toast.error("You do not have permission to edit workers");
        router.push("/dashboard/workers");
        return;
      }

      await loadWorker();
    } catch (err) {
      console.error("Auth error:", err);
      setError("Failed to verify permissions");
    } finally {
      setLoading(false);
    }
  }

  async function loadWorker() {
    try {
      setError(null);

      const response = await fetchWithAuth(`/api/workers/${params.id}`, {
        method: "GET",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        throw new Error(data?.error || "Failed to load worker");
      }

      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
      });
    } catch (err) {
      console.error("Error loading worker:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load worker details"
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
      };

      const response = await fetchWithAuth(`/api/workers/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update worker");
      }

      toast.success("✅ Worker updated successfully!");
      router.push(`/dashboard/workers/${params.id}`);
    } catch (err) {
      console.error("Error updating worker:", err);
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
          <p className="text-muted-foreground">Loading worker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-6  px-2 sm:px-0">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-6">
            <p className="text-red-700 font-medium mb-1">
              {error || "Worker not found"}
            </p>
            <p className="text-sm text-red-700/80 mb-4">
              This worker may have been deleted or is not accessible.
            </p>
            <Button onClick={() => router.push("/dashboard/workers")}>
              Back to Workers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6  px-2 sm:px-0">
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
            Edit Worker
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Update worker contact information
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
                Changes take effect immediately. If you update the email, make
                sure the worker knows which email to use when logging in.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Worker Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  name="full_name"
                  placeholder="John Smith"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  placeholder="john.smith@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone (optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
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
