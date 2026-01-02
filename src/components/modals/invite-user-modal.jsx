"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSubscriptionLimit } from "@/components/modals/upgrade-prompt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api-helper";
import { Mail, UserPlus, Copy, CheckCircle } from "lucide-react";

export function InviteUserModal({
  isOpen,
  onClose,
  onSuccess,
  properties = [],
}) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const { checkLimit, UpgradePrompt } = useSubscriptionLimit();
  const [formData, setFormData] = useState({
    email: "",
    role: "tenant",
    property_id: "",
    unit_id: "",
  });
  const [units, setUnits] = useState([]);

  useEffect(() => {
    if (formData.property_id) {
      loadUnits();
    } else {
      setUnits([]);
      setFormData((prev) => ({ ...prev, unit_id: "" }));
    }
  }, [formData.property_id]);

  async function loadUnits() {
    try {
      const response = await fetchWithAuth(
        `/api/units?property_id=${formData.property_id}`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out occupied units for tenant invites
        const availableUnits =
          formData.role === "tenant" ? data.filter((u) => !u.tenant_id) : data;
        setUnits(availableUnits);
      }
    } catch (error) {
      console.error("Error loading units:", error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // ✅ Check subscription limit based on role
    const resourceType = formData.role === "tenant" ? "tenants" : "workers";
    const canAdd = await checkLimit(resourceType);
    
    if (!canAdd) {
      return; // Upgrade prompt shows automatically
    }

    setLoading(true);
    setInviteUrl(null);

    try {
      const payload = {
        email: formData.email,
        role: formData.role,
      };

      if (
        formData.role === "tenant" &&
        formData.property_id &&
        formData.unit_id
      ) {
        payload.property_id = formData.property_id;
        payload.unit_id = formData.unit_id;
      }

      const response = await fetchWithAuth("/api/invitations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(`Invitation sent to ${formData.email}`);
      setInviteUrl(data.invite_url);

      // Reset form
      setFormData({
        email: "",
        role: "tenant",
        property_id: "",
        unit_id: "",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  function copyInviteUrl() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Invite User</span>
            </DialogTitle>
          </DialogHeader>

          {inviteUrl ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="flex items-center gap-2 text-green-900 dark:text-green-200 mb-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="font-semibold text-sm sm:text-base">
                    Invitation Sent!
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  An email has been sent to <strong>{formData.email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">
                  Invitation Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-[10px] sm:text-xs h-9 sm:h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyInviteUrl}
                    className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 p-0"
                    title={copied ? "Copied!" : "Copy link"}
                  >
                    {copied ? (
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                  You can also share this link directly
                </p>
              </div>

              <Button
                onClick={() => {
                  setInviteUrl(null);
                  onClose();
                }}
                className="w-full text-sm sm:text-base h-9 sm:h-10"
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    className="pl-9 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 text-sm sm:text-base h-9 sm:h-10"
                >
                  <option value="tenant">Tenant</option>
                  <option value="worker">Worker</option>
                </select>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {formData.role === "tenant"
                    ? "Tenants can submit maintenance requests"
                    : "Workers can be assigned to requests"}
                </p>
              </div>

              {formData.role === "tenant" && (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">
                      Property (Optional)
                    </label>
                    <select
                      value={formData.property_id}
                      onChange={(e) =>
                        setFormData({ ...formData, property_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 text-sm sm:text-base h-9 sm:h-10"
                    >
                      <option value="">-- Select Property --</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                    {properties.length === 0 && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        No properties available. Create a property first.
                      </p>
                    )}
                  </div>

                  {formData.property_id && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Unit (Optional)
                      </label>
                      <select
                        value={formData.unit_id}
                        onChange={(e) =>
                          setFormData({ ...formData, unit_id: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 text-sm sm:text-base h-9 sm:h-10"
                        disabled={units.length === 0}
                      >
                        <option value="">-- Select Unit --</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            Unit {unit.unit_number}
                            {unit.bedrooms
                              ? ` • ${unit.bedrooms} bed, ${unit.bathrooms} bath`
                              : ""}
                          </option>
                        ))}
                      </select>
                      {units.length === 0 && (
                        <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mt-1">
                          No vacant units available in this property
                        </p>
                      )}
                    </div>
                  )}

                  {!formData.property_id && (
                    <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                      <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                        💡 <strong>Tip:</strong> You can assign a property and
                        unit later, or let the tenant choose during setup.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 text-sm sm:text-base h-9 sm:h-10"
                >
                  {loading ? "Sending..." : "Send Invitation"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="sm:flex-none text-sm sm:text-base h-9 sm:h-10"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Add upgrade prompt */}
      <UpgradePrompt />
    </>
  );
}
