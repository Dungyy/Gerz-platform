"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
  });

  useEffect(() => {
    // Check if user has a valid recovery token
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidToken(true);
      }
    });
  }, []);

  useEffect(() => {
    // Update password strength indicators
    const password = formData.password;
    setPasswordStrength({
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    });
  }, [formData.password]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleResetPassword(e) {
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
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      setPasswordReset(true);
      toast.success("Password reset successfully!");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(`Failed to reset password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isValidToken) {
    return (
      <main>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                Invalid or Expired Link
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired. Please
                request a new one.
              </p>
              <Button onClick={() => router.push("/login")} className="w-full">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </main>
    );
  }

  if (passwordReset) {
    return (
      <main>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">
                Password Reset Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your password has been successfully reset. You can now sign in
                with your new password.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to login in 3 seconds...
              </p>
              <Button onClick={() => router.push("/login")} className="w-full">
                Go to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 py-20">
        {/* Background accents */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute right-[-140px] top-[180px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <Card className="w-full max-w-md shadow-sm border-border/50">
          <CardHeader className="text-center space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 justify-center mb-2 hover:opacity-80 transition-opacity"
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
            <CardTitle className="text-3xl tracking-tight">
              Create New Password
            </CardTitle>
            <p className="text-muted-foreground">
              Please enter your new password below
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter new password"
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
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

              {/* Password Requirements */}
              <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                <p className="text-sm font-medium mb-2">
                  Password Requirements:
                </p>
                <div className="space-y-1.5">
                  <PasswordRequirement
                    met={passwordStrength.hasLength}
                    text="At least 8 characters"
                  />
                  <PasswordRequirement
                    met={passwordStrength.hasUpper}
                    text="One uppercase letter"
                  />
                  <PasswordRequirement
                    met={passwordStrength.hasLower}
                    text="One lowercase letter"
                  />
                  <PasswordRequirement
                    met={passwordStrength.hasNumber}
                    text="One number"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="mr-2">Resetting Password...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  );
}

function PasswordRequirement({ met, text }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`h-4 w-4 rounded-full flex items-center justify-center ${
          met ? "bg-green-500/20" : "bg-muted"
        }`}
      >
        {met && <CheckCircle2 className="h-3 w-3 text-green-600" />}
      </div>
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );
}
