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
  AlertCircle,
  Home,
  User,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity-logger";

export default function InviteTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [invitationMethod, setInvitationMethod] = useState("magic_link");

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    unit_id: "",
  });

  const [sendSMS, setSendSMS] = useState(false);

  useEffect(() => {
    checkAuth();
    loadVacantUnits();
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "owner" && profile?.role !== "manager") {
        toast.error("You do not have permission to invite tenants");
        router.push("/dashboard/tenants");
        return;
      }

      setOrgId(profile?.organization_id);
    } catch (err) {
      console.error("Error loading org:", err);
      router.push("/login");
    }
  }

  async function loadVacantUnits() {
    try {
      setLoadingUnits(true);

      const response = await fetchWithAuth("/api/units", { method: "GET" });
      const data = await response.json();

      if (response.ok) {
        const vacant = (Array.isArray(data) ? data : []).filter(
          (u) => !u.tenant_id
        );
        setUnits(vacant);
      }
    } catch (err) {
      console.error("Error loading units:", err);
    } finally {
      setLoadingUnits(false);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orgId) return;

    setLoading(true);

    try {
      const payload = {
        ...formData,
        send_sms: sendSMS && formData.phone,
        invitation_method: invitationMethod,
      };

      const response = await fetchWithAuth("/api/tenants", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to invite tenant");
      }

      await logActivity({
        action: 'Invited new tenant',
        details: {
          tenant_name: formData.full_name,
          tenant_email: formData.email,
          unit_number: formData.unit_id
        },
        request_id: data.id,
      });

      toast.success(
        `Invitation sent to ${formData.full_name}!\n\nThey will receive ${
          invitationMethod === "magic_link"
            ? "a magic link"
            : "a password setup link"
        } via email.`
      );
      router.push("/dashboard/tenants");
    } catch (err) {
      console.error("Error inviting tenant:", err);
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Group units by property
  const unitsByProperty = units.reduce((acc, unit) => {
    const propertyName = unit.property?.name || "Unknown Property";
    if (!acc[propertyName]) {
      acc[propertyName] = [];
    }
    acc[propertyName].push(unit);
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Invite Tenant
          </h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Send an invitation to a new tenant
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
              <p className="font-semibold mb-2">How tenant invitations work:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Tenant receives an email with a secure link</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    They set their password or use magic link (no password)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Once set up, they can submit requests immediately</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Tenant Information */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">
              Tenant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  name="full_name"
                  placeholder="John Doe"
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
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Invitation link will be sent to this email
              </p>
            </div>

            {/* Invitation Method */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Invitation Method
              </label>
              <div className="space-y-2 sm:space-y-3">
                <div
                  onClick={() => setInvitationMethod("magic_link")}
                  className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    invitationMethod === "magic_link"
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="radio"
                      checked={invitationMethod === "magic_link"}
                      onChange={() => setInvitationMethod("magic_link")}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base">
                        🔐 Magic Link (Recommended)
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        One-click login - no password needed
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setInvitationMethod("password")}
                  className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    invitationMethod === "password"
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="radio"
                      checked={invitationMethod === "password"}
                      onChange={() => setInvitationMethod("password")}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base">
                        🔑 Set Password
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Traditional method - tenant creates password
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
                For SMS notifications
              </p>
            </div>

            {/* SMS Toggle */}
            {formData.phone && (
              <div className="flex items-center gap-3 p-3 sm:p-4 border rounded-lg bg-muted/50 border-transparent hover:border-border transition-colors">
                <input
                  type="checkbox"
                  id="send-sms"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className="rounded h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                />
                <label
                  htmlFor="send-sms"
                  className="text-xs sm:text-sm cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="font-medium">Send SMS invitation</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    Send a text message in addition to email
                  </p>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unit Selection */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              Assign Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                Select Vacant Unit <span className="text-red-500">*</span>
              </label>

              {loadingUnits ? (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Loading vacant units...
                </p>
              ) : units.length === 0 ? (
                <div className="p-4 sm:p-6 border-2 border-dashed rounded-lg text-center">
                  <Home className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium text-sm sm:text-base">
                    No vacant units available
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 px-2">
                    Create a property and add units first
                  </p>
                </div>
              ) : (
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 text-sm sm:text-base h-10 sm:h-11"
                >
                  <option value="">-- Select a unit --</option>
                  {Object.entries(unitsByProperty).map(
                    ([propertyName, propertyUnits]) => (
                      <optgroup key={propertyName} label={propertyName}>
                        {propertyUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            Unit {unit.unit_number}
                            {unit.bedrooms &&
                              ` - ${unit.bedrooms} bed, ${unit.bathrooms} bath`}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )}
                </select>
              )}

              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                Only showing vacant units • {units.length} available
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            type="submit"
            disabled={loading || !orgId || units.length === 0}
            className="gap-2 w-full sm:flex-1 text-sm sm:text-base"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="w-full sm:flex-1 text-sm sm:text-base"
          >
            Cancel
          </Button>
        </div>

        {!orgId && (
          <p className="text-xs sm:text-sm text-red-600 text-center">
            Could not determine organization. Please login again.
          </p>
        )}
      </form>
    </div>
  );
}
