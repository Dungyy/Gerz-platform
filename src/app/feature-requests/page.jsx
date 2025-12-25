"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function FeatureRequestsPage() {
  const [form, setForm] = useState({
    title: "",
    details: "",
    priority: "medium",
    name: "",
    email: "",
  });
  const [status, setStatus] = useState({
    loading: false,
    ok: false,
    error: "",
  });

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ loading: true, ok: false, error: "" });

    try {
      const res = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      setStatus({ loading: false, ok: true, error: "" });
      setForm({
        title: "",
        details: "",
        priority: "medium",
        name: "",
        email: "",
      });
    } catch (err) {
      setStatus({ loading: false, ok: false, error: err.message || "Error" });
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Feature Requests
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tell us what would make dingy.app better.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            Need support?{" "}
            <Link className="text-blue-600 hover:underline" href="/contact">
              Contact us
            </Link>
            .
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Submit a request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, title: e.target.value }))
                  }
                  placeholder="Example: Add photo annotations"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  value={form.details}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, details: e.target.value }))
                  }
                  placeholder="Describe the feature and why it helps..."
                  className="min-h-[140px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, priority: e.target.value }))
                  }
                  className="w-full border rounded-md bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, email: e.target.value }))
                    }
                    placeholder="you@email.com"
                  />
                </div>
              </div>

              {status.error ? (
                <p className="text-sm text-red-600">{status.error}</p>
              ) : null}
              {status.ok ? (
                <p className="text-sm text-green-600">
                  Submitted! Thanks—this helps a lot.
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={status.loading}
                className="w-full"
              >
                {status.loading ? "Submitting..." : "Submit feature request"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                By submitting, you agree to our{" "}
                <Link href="/terms" className="hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
                .
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  );
}
