/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Login failed. Please try again.";
      if (error.message.includes("Invalid login credentials")) {
        errorMessage =
          "Invalid email or password. Please check your credentials.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address before signing in.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const redirectTo = `${siteUrl}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(`Failed to send reset email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function closeForgotPasswordModal() {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setResetEmail("");
  }

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 py-20">
        {/* Background accents */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-[-140px] top-[180px] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
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
            <CardTitle className="text-3xl tracking-tight">Sign In</CardTitle>
            <p className="text-muted-foreground">
              Welcome back! Please enter your credentials
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">
                  Email Address
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
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    autoComplete="current-password"
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
                    <span className="mr-2">Signing in...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  New to dingy.app?
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={closeForgotPasswordModal}>
        <DialogContent className="sm:max-w-md">
          {!resetEmailSent ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Reset Password</DialogTitle>
                <DialogDescription>
                  Enter your email address and we'll send you a link to reset
                  your password.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-medium"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForgotPasswordModal}
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <DialogTitle className="text-2xl text-center">
                  Check Your Email
                </DialogTitle>
                <DialogDescription className="text-center">
                  We've sent a password reset link to:
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <Badge
                  variant="secondary"
                  className="text-base px-4 py-2 w-full justify-center"
                >
                  {resetEmail}
                </Badge>

                <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 space-y-2">
                  <p className="text-sm font-medium flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span>
                      Click the link in your email to create a new password
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground pl-6">
                    The link will expire in 1 hour. Check your spam folder if
                    you don't see it.
                  </p>
                </div>

                <Button
                  onClick={closeForgotPasswordModal}
                  className="w-full"
                  variant="outline"
                >
                  Back to Login
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  );
}
