"use client";

import { useState } from "react";
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
import { Mail, UserPlus, Copy, CheckCircle, User } from "lucide-react";

export function InviteManagerModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [mode, setMode] = useState("invite"); // "invite" or "create"
  const { checkLimit, UpgradePrompt } = useSubscriptionLimit();

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    confirm_password: "",
  });

  async function handleInvite(e) {
    e.preventDefault();

    // ✅ Check subscription limit for workers (managers count as workers)
    const canAdd = await checkLimit("workers");
    if (!canAdd) {
      return; // Upgrade prompt shows automatically
    }

    setLoading(true);
    setInviteUrl(null);
    setCopied(false);

    try {
      const response = await fetchWithAuth("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          role: "manager",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(`Manager invitation sent to ${formData.email}`);
      setInvitedEmail(formData.email);
      setInviteUrl(data.invite_url);

      // Reset form
      setFormData({
        email: "",
        full_name: "",
        password: "",
        confirm_password: "",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();

    // ✅ Check subscription limit for workers
    const canAdd = await checkLimit("workers");
    if (!canAdd) {
      return; // Upgrade prompt shows automatically
    }

    setLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirm_password) {
        throw new Error("Passwords do not match");
      }

      // Validate password length
      if (formData.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const response = await fetchWithAuth("/api/managers/create", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create manager");
      }

      toast.success(`Manager account created for ${formData.email}`);

      // Reset form
      setFormData({
        email: "",
        full_name: "",
        password: "",
        confirm_password: "",
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating manager:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    setInviteUrl(null);
    setCopied(false);
    setInvitedEmail("");
    setFormData({
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    });
    onClose();
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {mode === "invite" ? "Invite Manager" : "Create Manager"}
            </DialogTitle>
          </DialogHeader>

          {inviteUrl ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="flex items-center gap-2 text-green-900 dark:text-white-200 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Invitation Sent!</span>
                </div>
                <p className="text-sm text-green-700 dark:text-white-300">
                  An email has been sent to <strong>{invitedEmail}</strong>
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

              <Button onClick={handleDone} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Mode Toggle */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setMode("invite")}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "invite"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Send Invite
                </button>
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "create"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Now
                </button>
              </div>

              {mode === "invite" ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-muted-foreground">
                      Send an invitation email for the manager to set up their own
                      account.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="manager@example.com"
                        className="pl-9"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-800 dark:text-white-200">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      The manager will receive an email with a link to set their
                      password and join your organization.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
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
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-muted-foreground">
                      Create a manager account immediately with a password you
                      set.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="John Manager"
                        className="pl-9"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="manager@example.com"
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
                    <label className="block text-sm font-medium mb-2">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Min 8 characters"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Re-enter password"
                      value={formData.confirm_password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirm_password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-white-200">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      The account will be created immediately and the manager can
                      log in right away with the password you set.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? "Creating..." : "Create Manager"}
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Add upgrade prompt */}
      <UpgradePrompt />
    </>
  );
}
