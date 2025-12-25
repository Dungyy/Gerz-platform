"use client"

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Wrench,
  Building2,
  MessageSquare,
  FileText,
  Video,
  Mail,
  Search,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
<Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-500/5 to-background">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-700 text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find answers, guides, and support for dingy.app
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-4 py-4 text-base border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </section>

      {/* Quick Links by Role */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Get Started
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RoleCard
              icon={Users}
              title="For Tenants"
              description="Learn how to submit and track maintenance requests"
              href="/help/tenants"
              color="blue"
            />
            <RoleCard
              icon={Wrench}
              title="For Workers"
              description="Manage assignments and complete maintenance tasks"
              href="/help/workers"
              color="green"
            />
            <RoleCard
              icon={Building2}
              title="For Managers"
              description="Organize properties, assign tasks, and track progress"
              href="/help/managers"
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Popular Topics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TopicCard
              icon={FileText}
              title="Submitting a Request"
              items={[
                "How to create a maintenance request",
                "Adding photos to requests",
                "Setting request priority",
                "Tracking request status",
              ]}
            />
            <TopicCard
              icon={MessageSquare}
              title="Communication"
              items={[
                "Using the message thread",
                "Receiving notifications",
                "Contacting maintenance staff",
                "Update preferences",
              ]}
            />
            <TopicCard
              icon={Building2}
              title="Account Management"
              items={[
                "Creating an account",
                "Updating your profile",
                "Managing notifications",
                "Security settings",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Video Tutorials */}
      {/* <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Video Tutorials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VideoCard
              title="Getting Started with dingy.app"
              duration="3:45"
              thumbnail="🎥"
            />
            <VideoCard
              title="How to Submit Your First Request"
              duration="2:30"
              thumbnail="📱"
            />
          </div>
        </div>
      </section> */}

      {/* Contact Support */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="shadow-sm border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
            <CardContent className="pt-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-blue-500/10 mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Still need help?</h3>
              <p className="text-muted-foreground mb-6">
                Our support team is here to assist you
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="mailto:support@dingy.app">
                  <Button size="lg">
                    <Mail className="h-5 w-5 mr-2" />
                    Email Support
                  </Button>
                </a>
                <Link href="/contact">
                  <Button variant="outline" size="lg">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function RoleCard({ icon: Icon, title, description, href, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    green: "bg-green-500/10 text-green-600 border-green-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  return (
    <Link href={href}>
      <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
        <CardContent className="pt-6">
          <div
            className={`grid h-12 w-12 place-items-center rounded-xl ${colors[color]} mb-4`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
            Learn more <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TopicCard({ icon: Icon, title, items }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function VideoCard({ title, duration, thumbnail }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="pt-6">
        <div className="aspect-video bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center mb-4">
          <div className="text-center">
            <div className="text-6xl mb-2">{thumbnail}</div>
            <Badge variant="secondary" className="gap-1">
              <Video className="h-3 w-3" />
              {duration}
            </Badge>
          </div>
        </div>
        <h3 className="font-semibold">{title}</h3>
      </CardContent>
    </Card>
  );
}
