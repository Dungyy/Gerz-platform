"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite User
          </DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-900 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Invitation Sent!</span>
              </div>
              <p className="text-sm text-green-700">
                An email has been sent to <strong>{formData.email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Invitation Link
              </label>
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyInviteUrl}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                You can also share this link directly
              </p>
            </div>

            <Button
              onClick={() => {
                setInviteUrl(null);
                onClose();
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="user@example.com"
                  className="pl-9"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="tenant">Tenant</option>
                <option value="worker">Worker</option>
              </select>
            </div>

            {formData.role === "tenant" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Property (Optional)
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) =>
                      setFormData({ ...formData, property_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Select Property --</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.property_id && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Unit (Optional)
                    </label>
                    <select
                      value={formData.unit_id}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">-- Select Unit --</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unit_number}
                        </option>
                      ))}
                    </select>
                    {units.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        No vacant units available in this property
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
