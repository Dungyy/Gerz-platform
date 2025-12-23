import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Wrench,
  Building2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-140px] top-[180px] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[35%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background font-bold">
              d
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">dingy.app</div>
              <div className="text-xs text-muted-foreground">
                Maintenance Requests
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Built for apartments & rentals
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Document everything
              </Badge>
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Stop losing maintenance requests in calls & texts.
            </h1>

            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              dingy.app is a simple hub for tenants to submit issues and message staff.
              Managers get status tracking, assignment, and a clean history for every unit.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create account <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Tenant requests + photos
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Staff messaging
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Status & accountability
              </span>
            </div>
          </div>

          {/* Hero mock */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">New Request</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Unit 204 • Plumbing • 2 photos
                  </p>
                </div>
                <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                  Open
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="font-medium">Sink leaking under cabinet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tenant note: “Water pools after 2 minutes of running.”
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="Assigned to" value="Maintenance" icon={Wrench} />
                <MiniStat label="Priority" value="Normal" icon={ClipboardList} />
                <MiniStat label="ETA" value="Today" icon={CheckCircle2} />
              </div>

              {/* <Separator /> */}

              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Message thread</p>
                  <p className="text-sm text-muted-foreground">
                    “We can stop by between 2–4pm. Please confirm access.”
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Logos / trust bar */}
      <section className="mx-auto max-w-6xl px-6 pb-6">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Made for property teams that want <span className="text-foreground font-medium">simple</span>, not complicated.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3.5 w-3.5" /> Apartments
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Wrench className="h-3.5 w-3.5" /> Maintenance
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Communication
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Everything in one place</h2>
            <p className="mt-2 text-muted-foreground">
              A clear workflow from “submitted” to “completed”, with a paper trail.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={ClipboardList}
            title="Requests with context"
            desc="Unit, category, priority, photos, notes—captured the first time."
          />
          <FeatureCard
            icon={MessageSquare}
            title="Threaded messaging"
            desc="Keep tenants and staff aligned. No more scattered texts."
          />
          <FeatureCard
            icon={Wrench}
            title="Assignments & status"
            desc="Open → Assigned → In Progress → Completed, with timestamps."
          />
          <FeatureCard
            icon={Building2}
            title="Unit history"
            desc="See every past issue for a unit—great for recurring problems."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Accountability"
            desc="Who changed what, and when—clean audit trail for managers."
          />
          <FeatureCard
            icon={CheckCircle2}
            title="Faster resolutions"
            desc="Clear info + quick comms = fewer back-and-forth calls."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border bg-card p-8">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-muted-foreground">
            Simple flow your tenants and staff can actually use.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Step
              n="1"
              title="Tenant submits request"
              desc="Pick unit + category, add notes, upload photos."
            />
            <Step
              n="2"
              title="Manager assigns & replies"
              desc="Assign maintenance, message tenant, set expectations."
            />
            <Step
              n="3"
              title="Resolve & close it out"
              desc="Track progress and keep a permanent record per unit."
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <Quote
            quote="We stopped missing requests. Everything is documented now."
            who="Property Manager"
          />
          <Quote
            quote="Tenants love the messaging—less calling the office."
            who="Leasing Office"
          />
          <Quote
            quote="Assignments and status make my day way easier."
            who="Maintenance Tech"
          />
        </div>
      </section>

      {/* Pricing (simple placeholder) */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border bg-card p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Simple pricing</h2>
              <p className="mt-2 text-muted-foreground">
                Start small. Upgrade when you’re ready.
              </p>
            </div>
            <Button asChild>
              <Link href="/signup">Start free</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Plan
              name="Starter"
              price="$0"
              note="For testing and small properties"
              items={["Unlimited requests", "Tenant messaging", "Basic statuses"]}
            />
            <Plan
              name="Pro"
              price="$49/mo"
              note="For growing complexes"
              highlight
              items={[
                "Everything in Starter",
                "Staff roles & assignments",
                "Unit history + reporting",
              ]}
            />
            <Plan
              name="Team"
              price="Custom"
              note="For larger operations"
              items={[
                "Multi-property",
                "Advanced permissions",
                "Priority support",
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
        <div className="rounded-3xl border bg-gradient-to-b from-blue-600/10 to-transparent p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to clean up maintenance requests?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Launch dingy.app for your property in minutes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="lg">
                <Link href="/signup">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="font-semibold">dingy.app</span>{" "}
            <span className="text-muted-foreground">
              — Maintenance Request Management
            </span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* --- Small components --- */

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
    </Card>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background font-bold">
          {n}
        </div>
        <div className="font-semibold">{title}</div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Quote({ quote, who }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <p className="text-sm leading-relaxed">“{quote}”</p>
      <p className="mt-3 text-sm font-semibold">{who}</p>
      <p className="text-xs text-muted-foreground">dingy.app user</p>
    </div>
  );
}

function Plan({ name, price, note, items, highlight }) {
  return (
    <div
      className={`rounded-2xl border bg-background p-6 ${
        highlight ? "ring-1 ring-blue-600/40" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        {highlight ? (
          <Badge className="bg-blue-600/15 text-blue-700 hover:bg-blue-600/15">
            Popular
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 text-3xl font-bold">{price}</div>

      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <span>{it}</span>
          </li>
        ))}
      </ul>

      <Button className="mt-6 w-full" variant={highlight ? "default" : "outline"} asChild>
        <Link href="/signup">Choose {name}</Link>
      </Button>
    </div>
  );
}
