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

export default function EditManagerPage() {
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
    checkAuthAndLoad();
  }, [params.id]);

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

      // Only owners can edit managers
      if (profileData?.role !== "owner") {
        router.push("/dashboard");
        return;
      }

      await loadManager();
    } catch (error) {
      console.error("Auth error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  async function loadManager() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/managers/${params.id}`, {
        method: "GET",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load manager");
      }

      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
      });
    } catch (err) {
      console.error("Error loading manager:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetchWithAuth(`/api/managers/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update manager");
      }

      toast.success("✅ Manager updated successfully!");
      router.push(`/dashboard/managers/${params.id}`);
    } catch (err) {
      console.error("Error updating manager:", err);
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading manager...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 pb-6 px-2 sm:px-0">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-3 sm:py-4 text-red-700 text-sm">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 pb-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border mt-0.5 sm:mt-0"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Edit Manager
          </h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Update manager information
          </p>
        </div>
      </div>

      {/* Info Box */}
      <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="flex gap-3">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg bg-blue-500/10 flex-shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-semibold mb-1">Note</p>
              <p className="text-muted-foreground">
                Changes to email address will require the manager to verify
                their new email. Phone number changes take effect immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">
              Manager Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  name="full_name"
                  placeholder="Jane Manager"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  placeholder="jane.manager@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Used for login and email notifications
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Phone (optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                For contact purposes and SMS notifications
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
            className="w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
