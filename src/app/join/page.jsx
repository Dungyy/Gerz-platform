"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // used in handleSubmit, keep it
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setError("No invitation token provided");
      setLoading(false);
    }
  }, [token]);

  async function validateInvitation() {
    try {
      const response = await fetch(`/api/invitations/accept?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid invitation");
      }

      setInvitation(data);
      setFormData((prev) => ({ ...prev, email: data.email }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);

    try {
      // Accept invitation and create account
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-red-100 mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link href="/login">
                <Button>Go to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Render the join form if invitation is valid
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-2">Join Gerz Platform</h2>
              <p className="text-gray-600">Set your account details to join.</p>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="full_name"
              >
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full border rounded px-3 py-2 bg-gray-100"
                value={formData.email}
                disabled
                readOnly
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="confirm_password"
              >
                Confirm Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.confirm_password}
                onChange={(e) =>
                  setFormData({ ...formData, confirm_password: e.target.value })
                }
              />
            </div>
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Joining..." : "Join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default JoinPageContent;
