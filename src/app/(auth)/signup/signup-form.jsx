/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [verifyingInvite, setVerifyingInvite] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    organization_name: "",
    phone: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
  });

  // Check for invitation token on mount
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyInvitation(token);
    }
  }, [searchParams]);

  // Update password strength indicators
  useEffect(() => {
    const password = formData.password;
    setPasswordStrength({
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    });
  }, [formData.password]);

  async function verifyInvitation(token) {
    setVerifyingInvite(true);
    try {
      // Fetch invitation from database
      const { data: invitation, error } = await supabase
        .from("invitations")
        .select(
          `
          *,
          organizations (name),
          properties (name, address),
          units (unit_number)
        `
        )
        .eq("token", token)
        .is("accepted_at", null)
        .single();

      if (error || !invitation) {
        throw new Error("Invalid or expired invitation");
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error("This invitation has expired");
      }

      setInvitationData(invitation);
      setFormData((prev) => ({ ...prev, email: invitation.email }));
      toast.success(
        "Invitation verified! Complete your profile to get started."
      );
    } catch (error) {
      console.error("Invitation verification error:", error);
      toast.error(error.message || "Invalid or expired invitation link");
      // Redirect to signup after 2 seconds
      setTimeout(() => router.push("/signup"), 2000);
    } finally {
      setVerifyingInvite(false);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password strength
    const allRequirementsMet = Object.values(passwordStrength).every(Boolean);
    if (!allRequirementsMet) {
      toast.error("Please meet all password requirements");
      return;
    }

    setLoading(true);

    try {
      // If invited user, use invitation flow
      if (invitationData) {
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.full_name,
              },
            },
          }
        );

        if (authError) throw authError;

        const userId = authData.user.id;

        // Create profile with organization from invitation
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          organization_id: invitationData.organization_id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          role: invitationData.role,
          sms_notifications: !!formData.phone,
        });

        if (profileError) throw profileError;

        // Create notification preferences
        await supabase.from("notification_preferences").insert({
          user_id: userId,
          sms_new_request: !!formData.phone,
          sms_status_update: !!formData.phone,
          sms_assignment: !!formData.phone,
          sms_emergency: true,
        });

        // If tenant invitation, update unit tenant_id
        if (invitationData.role === "tenant" && invitationData.unit_id) {
          await supabase
            .from("units")
            .update({ tenant_id: userId })
            .eq("id", invitationData.unit_id);
        }

        // Mark invitation as accepted
        await supabase
          .from("invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("token", searchParams.get("token"));

        toast.success("Account created successfully!");
        router.push("/dashboard");
        return;
      }

      // Standard owner signup (no invitation required)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // Create organization slug
      const slug = formData.organization_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Create organization (organization_code will be auto-generated by trigger)
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.organization_name,
          slug,
          plan: "free",
          subscription_status: "trialing",
          trial_ends_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        organization_id: orgData.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        role: "owner",
        sms_notifications: !!formData.phone,
      });

      if (profileError) throw profileError;

      // Create notification preferences
      await supabase.from("notification_preferences").insert({
        user_id: userId,
        sms_new_request: !!formData.phone,
        sms_status_update: !!formData.phone,
        sms_assignment: !!formData.phone,
        sms_emergency: true,
      });

      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(`Signup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Loading state for invitation verification
  if (verifyingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="text-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">
              Verifying your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-20">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-140px] top-[180px] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background font-bold text-lg">
              d
            </div>
            <div className="leading-tight text-left">
              <div className="font-semibold text-lg">dingy.app</div>
              <div className="text-xs text-muted-foreground">
                Maintenance Requests
              </div>
            </div>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mt-6">
            {invitationData ? "Complete Your Profile" : "Create Your Account"}
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            {invitationData
              ? `Join ${invitationData.organizations.name} as a ${invitationData.role}`
              : "Start managing maintenance requests today"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Signup Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="text-center space-y-3 pb-6">
                {invitationData ? (
                  <>
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-500/10 mx-auto">
                      <Mail className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-2xl">
                      You've Been Invited!
                    </CardTitle>
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <div className="space-y-1.5 text-left">
                        <p className="text-sm">
                          <span className="font-medium">Organization:</span>{" "}
                          {invitationData.organizations.name}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Role:</span>{" "}
                          <span className="capitalize">
                            {invitationData.role}
                          </span>
                        </p>
                        {invitationData.properties && (
                          <p className="text-sm">
                            <span className="font-medium">Property:</span>{" "}
                            {invitationData.properties.name}
                          </p>
                        )}
                        {invitationData.units && (
                          <p className="text-sm">
                            <span className="font-medium">Unit:</span>{" "}
                            {invitationData.units.unit_number}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 mx-auto">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">
                      Create Your Owner Account
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Create your organization and invite your team
                    </p>
                  </>
                )}
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="full_name"
                        className="block text-sm font-medium"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="full_name"
                          name="full_name"
                          placeholder="John Smith"
                          value={formData.full_name}
                          onChange={handleChange}
                          className="pl-10"
                          required
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium"
                      >
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          name="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          className="pl-10"
                          required
                          disabled={!!invitationData}
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  </div>

                  {!invitationData && (
                    <div className="space-y-2">
                      <label
                        htmlFor="organization_name"
                        className="block text-sm font-medium"
                      >
                        Organization Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="organization_name"
                          name="organization_name"
                          placeholder="My Property Management LLC"
                          value={formData.organization_name}
                          onChange={handleChange}
                          className="pl-10"
                          required
                          autoComplete="organization"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A unique organization code will be generated
                        automatically
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium"
                      >
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Create password"
                          value={formData.password}
                          onChange={handleChange}
                          className="pl-10 pr-10"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium"
                      >
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="pl-10 pr-10"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  <div className="p-3 rounded-lg border bg-muted/50 space-y-1.5">
                    <p className="text-xs font-medium mb-1.5">
                      Password must have:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <PasswordRequirement
                        met={passwordStrength.hasLength}
                        text="8+ characters"
                      />
                      <PasswordRequirement
                        met={passwordStrength.hasUpper}
                        text="Uppercase letter"
                      />
                      <PasswordRequirement
                        met={passwordStrength.hasLower}
                        text="Lowercase letter"
                      />
                      <PasswordRequirement
                        met={passwordStrength.hasNumber}
                        text="Number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium"
                    >
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        name="phone"
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10"
                        autoComplete="tel"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enable SMS notifications for urgent requests
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-6"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="mr-2">Creating Account...</span>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          {!invitationData && (
            <div className="space-y-4">
              {/* What You Get */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">What You Get</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Create unlimited properties</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Invite tenants and workers</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Track maintenance requests</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Real-time SMS & email alerts</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>14-day free trial included</span>
                  </div>
                </CardContent>
              </Card>

              {/* Workers/Tenants Info */}
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Tenants & Workers</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Tenants and maintenance workers need an invitation from
                      their property manager to join.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border">
                    <p className="text-xs font-medium mb-1.5">To join:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Check your email for an invitation</li>
                      <li>Click the signup link</li>
                      <li>Complete your profile</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>No invitation?</strong> Ask your property manager
                    to send you one.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordRequirement({ met, text }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div
        className={`h-3.5 w-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
          met ? "bg-green-500/20" : "bg-muted"
        }`}
      >
        {met && <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />}
      </div>
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );
}
