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
        alert("You do not have permission to invite tenants");
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

      alert(
        `✅ Invitation sent to ${formData.full_name}!\n\nThey will receive ${
          invitationMethod === "magic_link"
            ? "a magic link"
            : "a password setup link"
        } via email.`
      );
      router.push("/dashboard/tenants");
    } catch (err) {
      console.error("Error inviting tenant:", err);
      alert(`❌ Error: ${err.message}`);
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Tenant</h1>
          <p className="text-muted-foreground mt-1">
            Send an invitation to a new tenant
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
              <p className="font-semibold mb-2">How tenant invitations work:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Tenant receives an email with a secure link</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    They set their password or use magic link (no password)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Once set up, they can submit requests immediately</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Information */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tenant Information</CardTitle>
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
                  placeholder="John Doe"
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
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Invitation link will be sent to this email
              </p>
            </div>

            {/* Invitation Method */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Invitation Method
              </label>
              <div className="space-y-3">
                <div
                  onClick={() => setInvitationMethod("magic_link")}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    invitationMethod === "magic_link"
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={invitationMethod === "magic_link"}
                      onChange={() => setInvitationMethod("magic_link")}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">
                        🔐 Magic Link (Recommended)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        One-click login - no password needed
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setInvitationMethod("password")}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    invitationMethod === "password"
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={invitationMethod === "password"}
                      onChange={() => setInvitationMethod("password")}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">🔑 Set Password</p>
                      <p className="text-sm text-muted-foreground">
                        Traditional method - tenant creates password
                      </p>
                    </div>
                  </div>
                </div>
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
              <p className="text-xs text-muted-foreground mt-1">
                For SMS notifications
              </p>
            </div>

            {/* SMS Toggle */}
            {formData.phone && (
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50 border-transparent hover:border-border transition-colors">
                <input
                  type="checkbox"
                  id="send-sms"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className="rounded h-5 w-5"
                />
                <label
                  htmlFor="send-sms"
                  className="text-sm cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
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
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              Assign Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Vacant Unit <span className="text-red-500">*</span>
              </label>

              {loadingUnits ? (
                <p className="text-sm text-muted-foreground">
                  Loading vacant units...
                </p>
              ) : units.length === 0 ? (
                <div className="p-6 border-2 border-dashed rounded-lg text-center">
                  <Home className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">
                    No vacant units available
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a property and add units first
                  </p>
                </div>
              ) : (
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
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

              <p className="text-xs text-muted-foreground mt-2">
                Only showing vacant units • {units.length} available
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !orgId || units.length === 0}
            className="gap-2"
          >
            {loading ? "Sending Invitation..." : "Send Invitation"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>

        {!orgId && (
          <p className="text-sm text-red-600">
            Could not determine organization. Please login again.
          </p>
        )}
      </form>
    </div>
  );
}
