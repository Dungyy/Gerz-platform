"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    checkSessionAndEmail();
  }, []);

  async function checkSessionAndEmail() {
    try {
      console.log("🔍 Checking for active session...");

      // Check for email in URL params first
      const emailParam = searchParams.get("email");
      if (emailParam) {
        setEmail(emailParam);
      }

      // Check for active session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("❌ Session error:", sessionError);
        setError(
          "Invalid or expired link. Please contact your property manager for a new invitation."
        );
        setChecking(false);
        return;
      }

      if (session) {
        console.log("✅ Active session found for:", session.user.email);
        setEmail(session.user.email);
        setSessionActive(true);
      } else {
        console.log("⚠️ No active session");

        // Check URL hash for auth token
        const hash = window.location.hash;
        if (hash) {
          console.log("🔗 Hash detected, Supabase will handle authentication");
          // Give Supabase a moment to process the hash
          setTimeout(() => checkSessionAndEmail(), 1000);
          return;
        }

        setError(
          "Please use the link from your invitation email to access this page."
        );
      }
    } catch (err) {
      console.error("❌ Error checking session:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!sessionActive) {
      setError("No active session. Please use the link from your email.");
      return;
    }

    setLoading(true);
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      console.log("🔐 Setting password...");

      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) throw updateError;

      console.log("✅ Password set successfully!");
      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      console.error("❌ Password setup error:", err);
      setError(err.message || "Failed to set password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Loading state - checking session
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Verifying your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - password set
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome Aboard! 🎉</h2>
            <p className="text-gray-600 mb-4">
              Your password has been set successfully.
              <br />
              Redirecting to your dashboard...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full animate-pulse"
                style={{ width: "75%" }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - expired/invalid link
  if (error && !sessionActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">
                  Invalid or Expired Link
                </h3>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    If you need a new invitation, please contact your property
                    manager.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/login")}
                    className="mt-3"
                  >
                    Go to Login
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state - password setup
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Dingy.app</span>
          </div>
          <CardTitle>Set Your Password</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Welcome! Create a secure password to access your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Display */}
            {email && (
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
                disabled={!sessionActive}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                minLength={6}
                disabled={!sessionActive}
              />
            </div>

            {/* Error Message */}
            {error && sessionActive && (
              <div className="flex items-start gap-2 text-red-700 text-sm bg-red-50 p-3 rounded border border-red-200">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !sessionActive}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Password...
                </>
              ) : (
                "Set Password & Continue"
              )}
            </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900">
              💡 <strong>Tip:</strong> After setting your password, you can
              login anytime at <span className="font-mono">/login</span> to
              submit maintenance requests.
            </p>
          </div>

          {/* Security Note */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              🔒 Your password is encrypted and secure
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component with Suspense wrapper
export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
