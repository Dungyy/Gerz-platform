"use client";

import { useState } from "react";
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
import { Mail, UserPlus, Phone, CheckCircle } from "lucide-react";

export function InviteManagerModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    send_sms: false,
  });

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
      if (!formData.full_name.trim()) {
        throw new Error("Full name is required");
      }

      const response = await fetchWithAuth("/api/managers", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to invite manager");
      }

      toast.success(`Manager invite sent to ${formData.email}`);

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        send_sms: false,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error sending manager invite:", error);
      toast.error(error.message || "Failed to invite manager");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Manager
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="full_name"
                placeholder="Jane Manager"
                className="pl-9"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                name="email"
                placeholder="manager@example.com"
                className="pl-9"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone (optional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                name="phone"
                placeholder="(555) 123-4567"
                className="pl-9"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Used for contact and optional SMS notifications.
            </p>
          </div>

          {/* SMS toggle */}
          <div className="flex items-center gap-2">
            <input
              id="send_sms"
              name="send_sms"
              type="checkbox"
              checked={formData.send_sms}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <label htmlFor="send_sms" className="text-sm text-muted-foreground">
              Send SMS welcome message (if phone is provided)
            </label>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <CheckCircle className="h-4 w-4 mt-0.5" />
            <p>
              The manager will receive an email to set their password and join
              your organization as a manager. Only owners can send manager
              invites.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Sending..." : "Send Manager Invite"}
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
      </DialogContent>
    </Dialog>
  );
}
