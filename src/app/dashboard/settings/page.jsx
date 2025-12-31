// app/dashboard/settings/page.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api-helper";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  CreditCard,
  Shield,
  Bell,
  LogOut,
  Mail,
  MessageSquare,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    sms_notifications: false,
    avatar_url: "",
  });

  // Organization form state
  const [orgForm, setOrgForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  // Notification preferences form state
  const [preferencesForm, setPreferencesForm] = useState({
    email_new_request: false,
    email_status_update: false,
    email_assignment: false,
    email_comment: false,
    sms_status_update: false,
    sms_emergency: false,
    sms_new_request: false,
    sms_assignment: false,
  });

  useEffect(() => {
    loadProfileAndSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfileAndSettings() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Load profile + organization
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, organization:organizations(*)")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        toast.error("Error loading profile");
        router.push("/login");
        return;
      }

      setProfile(profileData);
      setProfileForm({
        full_name: profileData.full_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        sms_notifications: !!profileData.sms_notifications,
        avatar_url: profileData.avatar_url || "",
      });

      if (profileData.organization) {
        setOrgForm({
          name: profileData.organization.name || "",
          phone: profileData.organization.phone || "",
          email: profileData.organization.email || "",
          address: profileData.organization.address || "",
        });
      }

      // Load notification preferences
      let { data: prefs, error: prefsError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (prefsError || !prefs) {
        // Create default row if none exists
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error("Notification prefs insert error:", insertError);
          toast.error("Error loading notification preferences");
        } else {
          prefs = newPrefs;
        }
      }

      if (prefs) {
        setPreferencesForm({
          email_new_request: !!prefs.email_new_request,
          email_status_update: !!prefs.email_status_update,
          email_assignment: !!prefs.email_assignment,
          email_comment: !!prefs.email_comment,
          sms_status_update: !!prefs.sms_status_update,
          sms_emergency: !!prefs.sms_emergency,
          sms_new_request: !!prefs.sms_new_request,
          sms_assignment: !!prefs.sms_assignment,
        });
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      toast.error("There was a problem loading your settings");
    } finally {
      setLoading(false);
    }
  }

  // ---------- AVATAR UPLOAD ----------
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    try {
      setUploadingAvatar(true);

      // Delete old avatar if exists
      if (profileForm.avatar_url) {
        const oldPath = profileForm.avatar_url.split("/").pop();
        await supabase.storage
          .from("avatars")
          .remove([`${profile.id}/${oldPath}`]);
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload avatar");
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Update error:", updateError);
        toast.error("Failed to update profile");
        return;
      }

      // Update local state
      setProfileForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));

      // Trigger global profile refresh for sidebar
      window.dispatchEvent(new CustomEvent("profile-updated"));

      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Error uploading avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profileForm.avatar_url) return;

    try {
      setUploadingAvatar(true);

      // Delete from storage
      const oldPath = profileForm.avatar_url.split("/").pop();
      await supabase.storage
        .from("avatars")
        .remove([`${profile.id}/${oldPath}`]);

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);

      if (error) {
        toast.error("Failed to remove avatar");
        return;
      }

      setProfileForm((prev) => ({ ...prev, avatar_url: "" }));
      setProfile((prev) => ({ ...prev, avatar_url: null }));
      setAvatarPreview(null);

      // Trigger global profile refresh for sidebar
      window.dispatchEvent(new CustomEvent("profile-updated"));

      toast.success("Avatar removed successfully!");
    } catch (error) {
      console.error("Remove avatar error:", error);
      toast.error("Error removing avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  // ---------- PROFILE ----------
  async function handleProfileUpdate(e) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          sms_notifications: profileForm.sms_notifications,
        })
        .eq("id", profile.id);

      if (!error) {
        toast.success("Profile updated successfully!");
        await loadProfileAndSettings();
        
        // Trigger global profile refresh for sidebar
        window.dispatchEvent(new CustomEvent("profile-updated"));
      } else {
        toast.error("Error updating profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  }

  // ---------- ORGANIZATION ----------
  async function handleOrgUpdate(e) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetchWithAuth("/api/organizations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(orgForm),
      });

      if (response.ok) {
        toast.success("Organization updated successfully!");
        await loadProfileAndSettings();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.error || "Error updating organization");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating organization");
    } finally {
      setSaving(false);
    }
  }

  // ---------- SECURITY / PASSWORD ----------
  async function handlePasswordChange(e) {
    e.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (!passwordForm.new_password || passwordForm.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password,
      });

      if (!error) {
        toast.success("Password updated successfully!");
        setPasswordForm({
          new_password: "",
          confirm_password: "",
        });
      } else {
        toast.error("Error updating password: " + error.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating password");
    } finally {
      setSaving(false);
    }
  }

  // ---------- NOTIFICATIONS ----------
  async function handleNotificationSave(e) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: profileForm.phone,
          sms_notifications: profileForm.sms_notifications,
        })
        .eq("id", profile.id);

      if (profileError) {
        console.error(profileError);
        toast.error("Error saving phone / SMS settings");
        setSaving(false);
        return;
      }

      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .update({
          email_new_request: preferencesForm.email_new_request,
          email_status_update: preferencesForm.email_status_update,
          email_assignment: preferencesForm.email_assignment,
          email_comment: preferencesForm.email_comment,
          sms_status_update: preferencesForm.sms_status_update,
          sms_emergency: preferencesForm.sms_emergency,
          sms_new_request: preferencesForm.sms_new_request,
          sms_assignment: preferencesForm.sms_assignment,
        })
        .eq("user_id", profile.id);

      if (prefsError) {
        console.error(prefsError);
        toast.error("Error saving notification preferences");
        setSaving(false);
        return;
      }

      toast.success("Notification settings saved!");
      await loadProfileAndSettings();
    } catch (err) {
      console.error(err);
      toast.error("Error saving notification settings");
    } finally {
      setSaving(false);
    }
  }

  // ---------- LOGOUT ----------
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center py-16">
        <span className="text-muted-foreground">
          Unable to load profile. Please log in again.
        </span>
      </div>
    );
  }

  const canManageOrg = profile.role === "owner" || profile.role === "manager";

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0 pb-8">
      {/* Header */}
      <div className="mt-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your account and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-3 sm:gap-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabButton
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            icon={User}
            label="Profile"
          />

          {canManageOrg && (
            <TabButton
              active={activeTab === "organization"}
              onClick={() => setActiveTab("organization")}
              icon={Building2}
              label="Organization"
            />
          )}

          <TabButton
            active={activeTab === "security"}
            onClick={() => setActiveTab("security")}
            icon={Shield}
            label="Security"
          />

          {canManageOrg && (
            <TabButton
              active={activeTab === "billing"}
              onClick={() => setActiveTab("billing")}
              icon={CreditCard}
              label="Billing"
            />
          )}

          <TabButton
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
            icon={Bell}
            label="Notifications"
          />
        </div>
      </div>

      {/* PROFILE TAB */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Avatar Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Display */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                    {avatarPreview || profileForm.avatar_url ? (
                      <Image
                        src={avatarPreview || profileForm.avatar_url}
                        alt="Avatar"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>

                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>

                    {(profileForm.avatar_url || avatarPreview) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <Input
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact support to change your email address.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <Badge className="capitalize">{profile.role}</Badge>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ORGANIZATION TAB */}
      {activeTab === "organization" && canManageOrg && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrgUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Organization Name
                  </label>
                  <Input
                    value={orgForm.name}
                    onChange={(e) =>
                      setOrgForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Acme Property Management"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={orgForm.phone}
                    onChange={(e) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={orgForm.email}
                    onChange={(e) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="contact@acme.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Address
                  </label>
                  <Input
                    value={orgForm.address}
                    onChange={(e) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Share this code with team members to invite them to your
                  organization
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono bg-muted px-4 py-2 rounded border flex-1">
                    {profile.organization?.organization_code || "N/A"}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        profile.organization?.organization_code || ""
                      );
                      toast.success("Code copied to clipboard!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {profile.organization?.plan || "Free"}
                  </p>
                </div>
                <Badge className="capitalize w-fit">
                  {profile.organization?.subscription_status || "Active"}
                </Badge>
              </div>

              {profile.organization?.trial_ends_at && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                  Trial ends on{" "}
                  {new Date(
                    profile.organization.trial_ends_at
                  ).toLocaleDateString()}
                </div>
              )}

              <Button variant="outline" className="w-full">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === "security" && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirm_password: e.target.value,
                    }))
                  }
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* BILLING TAB */}
      {activeTab === "billing" && canManageOrg && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No payment method on file
                </p>
                <Button>Add Payment Method</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No billing history</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === "notifications" && (
        <form
          onSubmit={handleNotificationSave}
          className="space-y-6"
          autoComplete="off"
        >
          {/* SMS Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for SMS notifications.
                </p>
              </div>

              {/* Master SMS toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-t">
                <div>
                  <p className="font-medium">Enable SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive text message updates
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={profileForm.sms_notifications}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      sms_notifications: e.target.checked,
                    }))
                  }
                  disabled={!profileForm.phone}
                  className="h-5 w-5 rounded"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationToggle
                label="New Request"
                description="Notify when a new request is submitted"
                checked={preferencesForm.email_new_request}
                onChange={(v) =>
                  setPreferencesForm((prev) => ({
                    ...prev,
                    email_new_request: v,
                  }))
                }
              />
              <NotificationToggle
                label="Status Updates"
                description="Notify when request status changes"
                checked={preferencesForm.email_status_update}
                onChange={(v) =>
                  setPreferencesForm((prev) => ({
                    ...prev,
                    email_status_update: v,
                  }))
                }
              />
              <NotificationToggle
                label="Assignments"
                description="Notify when requests are assigned"
                checked={preferencesForm.email_assignment}
                onChange={(v) =>
                  setPreferencesForm((prev) => ({
                    ...prev,
                    email_assignment: v,
                  }))
                }
              />
              <NotificationToggle
                label="Comments"
                description="Notify about new comments"
                checked={preferencesForm.email_comment}
                onChange={(v) =>
                  setPreferencesForm((prev) => ({
                    ...prev,
                    email_comment: v,
                  }))
                }
              />
            </CardContent>
          </Card>

          {/* SMS Notifications */}
          {profileForm.phone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  SMS Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotificationToggle
                  label="Status Updates"
                  description="Text when request status changes"
                  checked={preferencesForm.sms_status_update}
                  onChange={(v) =>
                    setPreferencesForm((prev) => ({
                      ...prev,
                      sms_status_update: v,
                    }))
                  }
                  disabled={!profileForm.sms_notifications}
                />
                <NotificationToggle
                  label="Emergency Alerts"
                  description="Text for urgent requests"
                  checked={preferencesForm.sms_emergency}
                  onChange={(v) =>
                    setPreferencesForm((prev) => ({
                      ...prev,
                      sms_emergency: v,
                    }))
                  }
                  disabled={!profileForm.sms_notifications}
                />
                {profile.role !== "tenant" && (
                  <>
                    <NotificationToggle
                      label="New Requests"
                      description="Text when new request submitted"
                      checked={preferencesForm.sms_new_request}
                      onChange={(v) =>
                        setPreferencesForm((prev) => ({
                          ...prev,
                          sms_new_request: v,
                        }))
                      }
                      disabled={!profileForm.sms_notifications}
                    />
                    <NotificationToggle
                      label="Assignments"
                      description="Text when request is assigned to you"
                      checked={preferencesForm.sms_assignment}
                      onChange={(v) =>
                        setPreferencesForm((prev) => ({
                          ...prev,
                          sms_assignment: v,
                        }))
                      }
                      disabled={!profileForm.sms_notifications}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Notification Settings"}
            </Button>
          </div>
        </form>
      )}

      {/* Logout */}
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your account
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-3 px-1 border-b-2 font-medium text-sm sm:text-base flex items-center gap-2 whitespace-nowrap transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      <span>{label}</span>
    </button>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b last:border-0">
      <div>
        <p
          className={`font-medium ${
            disabled ? "text-muted-foreground/70" : ""
          }`}
        >
          {label}
        </p>
        <p
          className={`text-sm ${
            disabled ? "text-muted-foreground/60" : "text-muted-foreground"
          }`}
        >
          {description}
        </p>
      </div>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-5 w-5 rounded"
      />
    </div>
  );
}