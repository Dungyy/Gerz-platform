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
  Camera,
  Users,
  Timer,
  BadgeCheck,
  ChevronRight,
  Mail,
  Zap,
  Crown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

/** tiny helper (no deps) */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ----------------------------- */
/* DATA (easy to move later)     */
/* ----------------------------- */

const FEATURE_LIST = [
  {
    icon: ClipboardList,
    title: "Requests with context",
    desc: "Unit, category, priority, photos, and notes—captured the first time.",
  },
  {
    icon: MessageSquare,
    title: "Threaded messaging",
    desc: "Keep tenants and staff aligned inside each request thread.",
  },
  {
    icon: Wrench,
    title: "Assignments & status",
    desc: "Open → Assigned → In Progress → Completed with timestamps.",
  },
  {
    icon: Building2,
    title: "Unit history",
    desc: "See every past issue per unit—perfect for recurring problems.",
  },
  {
    icon: ShieldCheck,
    title: "Accountability",
    desc: "A clean audit trail for managers: who updated what and when.",
  },
  {
    icon: Timer,
    title: "Faster resolutions",
    desc: "Less phone-tag. More clarity. Fewer repeat visits.",
  },
];

const ROLE_VALUE = [
  {
    icon: Users,
    title: "For Tenants",
    bullets: ["Submit issues in seconds", "Add photos + notes", "Get updates in one thread"],
  },
  {
    icon: Building2,
    title: "For Managers",
    bullets: ["Track requests by unit", "Assign staff instantly", "Keep a documented history"],
  },
  {
    icon: Wrench,
    title: "For Maintenance",
    bullets: ["See priorities clearly", "Know what to bring", "Close out with notes/photos"],
  },
];

const STEPS = [
  { n: "1", title: "Tenant submits", desc: "Choose category, add details, upload photos." },
  { n: "2", title: "Manager assigns", desc: "Route to staff, set priority, message tenant." },
  { n: "3", title: "Resolve & close", desc: "Update status, log work, keep unit history." },
];

const TESTIMONIALS = [
  { quote: "We stopped missing requests. Everything is documented now.", who: "Property Manager" },
  { quote: "Tenants love the messaging—less calling the office.", who: "Leasing Office" },
  { quote: "Assignments and status make my day way easier.", who: "Maintenance Tech" },
];

// ✅ UPDATED PLANS WITH REAL SUBSCRIPTION TIERS
const PLANS = [
  {
    name: "Free",
    price: "$0",
    note: "Perfect for getting started",
    items: [
      "1 property",
      "5 units",
      "Unlimited requests",
      "Email notifications",
      "Mobile access",
    ],
    highlight: false,
    badge: null,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    note: "For small property managers",
    items: [
      "3 properties",
      "50 units",
      "Unlimited requests",
      "Email notifications",
      "Priority support",
      "Custom branding",
    ],
    highlight: false,
    badge: null,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    note: "For growing portfolios",
    highlight: true,
    badge: "Most Popular",
    items: [
      "10 properties",
      "200 units",
      "Unlimited requests",
      "SMS notifications (2000/month)",
      "Advanced analytics",
      "API access",
      "Phone support",
    ],
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    note: "For large companies",
    items: [
      "Unlimited properties",
      "Unlimited units",
      "Unlimited requests",
      "Unlimited SMS",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "White label option",
    ],
    highlight: false,
    badge: null,
  },
];

/* ----------------------------- */
/* PAGE                          */
/* ----------------------------- */

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <BackgroundAccents />
      <Navbar />

      <Hero />
      <TrustBar />
      <RoleValue />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}

/* ----------------------------- */
/* SECTIONS                       */
/* ----------------------------- */

function BackgroundAccents() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute right-[-140px] top-[180px] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-[-160px] left-[35%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-3xl" />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-14 pb-10">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Built for rentals & apartments
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Keep a paper trail
            </Badge>
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Maintenance requests, organized—without the chaos.
          </h1>

          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Tenants submit issues with photos. Managers assign and track progress.
            Maintenance stays on the same page. Everything is documented per unit.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>

            <Button asChild size="lg" variant="ghost" className="justify-start">
              <a href="#how" className="inline-flex items-center">
                See how it works <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <InlineCheck icon={Camera}>Photos + notes</InlineCheck>
            <InlineCheck icon={MessageSquare}>Messaging</InlineCheck>
            <InlineCheck icon={BadgeCheck}>Status tracking</InlineCheck>
          </div>
        </div>

        <HeroMock />
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-6">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Made for teams that want <span className="text-foreground font-medium">simple</span>, not complicated.
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
  );
}

function RoleValue() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-6">
      <div className="grid gap-4 md:grid-cols-3">
        {ROLE_VALUE.map((r) => (
          <Card key={r.title} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                  <r.icon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">{r.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {r.bullets.map((b) => (
                <div key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <span>{b}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-12">
      <SectionHeading
        title="Everything in one place"
        subtitle="A clean workflow from 'submitted' to 'completed', with a paper trail per unit."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {FEATURE_LIST.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-3xl border bg-card p-8">
        <SectionHeading
          title="How it works"
          subtitle="A flow your tenants and staff will actually use."
          flush
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <Step key={s.n} n={s.n} title={s.title} desc={s.desc} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <Quote key={t.who} quote={t.quote} who={t.who} />
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-3xl border bg-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            title="Simple, transparent pricing"
            subtitle="Start free. Scale as you grow. No hidden fees."
            flush
          />
          <Button asChild size="lg">
            <Link href="/signup">
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <Plan
              key={p.name}
              name={p.name}
              price={p.price}
              period={p.period}
              note={p.note}
              items={p.items}
              highlight={p.highlight}
              badge={p.badge}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
      <div className="rounded-3xl border bg-gradient-to-b from-blue-600/10 to-transparent p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Ready to clean up maintenance requests?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start with the Free plan. Upgrade anytime as you grow.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- */
/* UI building blocks            */
/* ----------------------------- */

function SectionHeading({ title, subtitle, flush }) {
  return (
    <div className={cn(flush ? "" : "")}>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function InlineCheck({ children, icon: Icon = CheckCircle2 }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4" /> {children}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
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
      <p className="text-sm leading-relaxed">"{quote}"</p>
      <p className="mt-3 text-sm font-semibold">{who}</p>
      <p className="text-xs text-muted-foreground">dingy.app user</p>
    </div>
  );
}

function Plan({ name, price, period, note, items, highlight, badge }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-background p-6 relative",
        highlight && "ring-2 ring-blue-600/40 shadow-lg"
      )}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1">
            <Crown className="h-3 w-3 mr-1 inline" />
            {badge}
          </Badge>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        {name === "Professional" && !badge && (
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            SMS
          </Badge>
        )}
        {name === "Free" && (
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3 w-3" />
            Email
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        {period && <span className="text-muted-foreground text-sm">{period}</span>}
      </div>

      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>

      <Button className="mt-6 w-full" variant={highlight ? "default" : "outline"} asChild>
        <Link href="/signup">
          {name === "Free" ? "Start free" : `Choose ${name}`}
        </Link>
      </Button>
    </div>
  );
}

function HeroMock() {
  return (
    <Card className="shadow-sm overflow-hidden">
      <div className="border-b bg-muted/20 px-5 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Requests</div>
        <Badge variant="secondary" className="gap-1">
          <ClipboardList className="h-3.5 w-3.5" />
          Live
        </Badge>
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">New Request</p>
            <p className="text-sm text-muted-foreground">
              Unit 204 • Plumbing • 2 photos
            </p>
          </div>
          <StatusPill label="Open" tone="amber" />
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="font-medium">Sink leaking under cabinet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tenant note: "Water pools after 2 minutes of running."
          </p>
          <div className="mt-3 flex gap-2">
            <Badge variant="secondary" className="gap-1">
              <Camera className="h-3.5 w-3.5" /> Photos
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Thread
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label="Assigned to" value="Maintenance" icon={Wrench} />
          <MiniStat label="Priority" value="Normal" icon={ClipboardList} />
          <MiniStat label="ETA" value="Today" icon={CheckCircle2} />
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm font-semibold">Timeline</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <TimelineRow label="Submitted" value="Just now" />
            <TimelineRow label="Assigned" value="2 minutes" />
            <TimelineRow label="In progress" value="Today 2–4pm" />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-muted">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Message thread</p>
            <p className="text-sm text-muted-foreground">
              "We can stop by between 2–4pm. Please confirm access."
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="text-foreground/80">{value}</span>
    </div>
  );
}

function StatusPill({ label, tone }) {
  const tones = {
    amber: "bg-amber-500/15 text-amber-700",
    blue: "bg-blue-600/15 text-blue-700",
    green: "bg-green-600/15 text-green-700",
  };

  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tones[tone] || tones.blue)}>
      {label}
    </span>
  );
}

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
