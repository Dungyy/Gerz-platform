"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-helper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function InviteManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    send_sms: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
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

      // Only owners can create managers
      if (profileData?.role !== "owner") {
        router.push("/dashboard");
        return;
      }
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetchWithAuth("/api/managers", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create manager");
      }

      toast.success(
        `Manager invite created for ${formData.full_name}!\n\nThey'll receive an email to set their password and finish setup.`
      );
      router.push("/dashboard/managers");
    } catch (err) {
      console.error("Error creating manager:", err);
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
            Add Manager
          </h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Create a new manager account for your organization
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
            <div className="text-xs sm:text-sm flex-1 min-w-0">
              <p className="font-semibold mb-2">How manager accounts work:</p>
              <ul className="space-y-1.5 sm:space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Manager receives an email invite to set their password and
                    complete setup
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Managers can view and manage maintenance requests,
                    properties, and workers
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    They belong to the same organization as your owner account
                  </span>
                </li>
              </ul>
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

            <div className="flex items-start gap-2 sm:gap-3">
              <input
                id="send_sms"
                name="send_sms"
                type="checkbox"
                className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5"
                checked={formData.send_sms}
                onChange={handleChange}
              />
              <label
                htmlFor="send_sms"
                className="text-xs sm:text-sm text-muted-foreground flex-1"
              >
                Send a welcome SMS if a phone number is provided
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="gap-2 w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
          >
            {loading ? "Creating..." : "Create Manager"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
