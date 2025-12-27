"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Lock, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      console.log("✅ Logged in:", data.user.email);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(`❌ Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dingy.app";

      const redirectTo = `${siteUrl}/auth/callback`;

      console.log("✨ Sending magic link redirectTo:", redirectTo);

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (error) {
      console.error("Magic link error:", error);
      toast.error(`❌ Failed to send magic link: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Background accents */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute right-[-140px] bottom-[-160px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-green-500/10 mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Check Your Email!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">We've sent a magic link to:</p>
            <Badge variant="secondary" className="text-base px-4 py-2">
              {formData.email}
            </Badge>
            <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 text-left space-y-2">
              <p className="text-sm font-medium flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600" />
                Click the link in your email to sign in
              </p>
              <p className="text-xs text-muted-foreground pl-6">
                The link will expire in 1 hour. Check your spam folder if you
                don't see it.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setMagicLinkSent(false);
                setUseMagicLink(false);
              }}
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Background accents */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-[-140px] top-[180px] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 justify-center mb-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background font-bold">
                d
              </div>
              <div className="leading-tight text-left">
                <div className="font-semibold">dingy.app</div>
                <div className="text-xs text-muted-foreground">
                  Maintenance Requests
                </div>
              </div>
            </Link>
            <CardTitle className="text-3xl tracking-tight">Sign In</CardTitle>
            <p className="text-muted-foreground mt-2">
              Welcome back! Sign in to your account
            </p>
          </CardHeader>

          <CardContent>
            {/* Toggle Between Password and Magic Link */}
            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                variant={!useMagicLink ? "default" : "outline"}
                onClick={() => setUseMagicLink(false)}
                className="flex-1"
                size="sm"
              >
                <Lock className="h-4 w-4 mr-2" />
                Password
              </Button>
              <Button
                type="button"
                variant={useMagicLink ? "default" : "outline"}
                onClick={() => setUseMagicLink(true)}
                className="flex-1"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Magic Link
              </Button>
            </div>

            {/* Password Login Form */}
            {!useMagicLink && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <Input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <div className="text-center text-sm">
                  <Link
                    href="/forgot-password"
                    className="text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </form>
            )}

            {/* Magic Link Form */}
            {useMagicLink && (
              <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                <div className="p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 mb-4">
                  <p className="text-sm flex items-start gap-2">
                    <Sparkles className="h-4 w-4 mt-0.5 text-blue-600" />
                    <span>
                      Enter your email and we'll send you a magic link to sign
                      in - no password needed!
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Magic Link"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            )}

            <div className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-600 hover:underline font-semibold"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  );
}
