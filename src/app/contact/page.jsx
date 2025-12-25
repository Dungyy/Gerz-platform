"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      setStatus({ loading: false, ok: true, error: "" });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setStatus({ loading: false, ok: false, error: err.message || "Error" });
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
          <p className="mt-2 text-muted-foreground">
            Questions about dingy.app? Send us a message.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            Prefer product ideas?{" "}
            <Link
              className="text-blue-600 hover:underline"
              href="/feature-requests"
            >
              Submit a feature request
            </Link>
            .
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Send a message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, email: e.target.value }))
                    }
                    placeholder="you@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, subject: e.target.value }))
                  }
                  placeholder="What’s this about?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, message: e.target.value }))
                  }
                  placeholder="Tell us what you need..."
                  className="min-h-[140px]"
                  required
                />
              </div>

              {status.error ? (
                <p className="text-sm text-red-600">{status.error}</p>
              ) : null}
              {status.ok ? (
                <p className="text-sm text-green-600">
                  Message sent! We’ll get back to you soon.
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={status.loading}
                className="w-full"
              >
                {status.loading ? "Sending..." : "Send message"}
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
