import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Scale, AlertTriangle, Mail } from "lucide-react";
import Footer from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navbar />

      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-500/5 to-background">
        <div className="mx-auto max-w-4xl text-center">
          <div className="grid h-16 w-16 place-items-center rounded-xl bg-blue-500/10 mx-auto mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground">
            Last updated: December 25, 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="prose prose-slate max-w-none">
            {/* Agreement to Terms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Scale className="h-6 w-6 text-blue-600" />
                Agreement to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using dingy.app, you agree to be bound by these
                Terms of Service and all applicable laws and regulations. If you
                do not agree with any of these terms, you are prohibited from
                using or accessing this service.
              </p>
            </div>

            {/* Description of Service */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">
                Description of Service
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                dingy.app provides a maintenance request management platform
                that enables:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Tenants to submit and track maintenance requests</li>
                <li>
                  Property managers to organize and assign maintenance tasks
                </li>
                <li>Maintenance workers to manage and complete work orders</li>
                <li>Communication between all parties through messaging</li>
              </ul>
            </div>

            {/* User Accounts */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">User Accounts</h2>

              <h3 className="text-xl font-semibold mb-3 mt-6">
                Account Creation
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use certain features of dingy.app, you must create an
                account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password</li>
                <li>
                  Accept responsibility for all activities under your account
                </li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">Account Types</h3>
              <p className="text-muted-foreground leading-relaxed">
                Different account types (Property Owner, Manager, Worker,
                Tenant) have different access levels and permissions. You must
                use the appropriate account type for your role.
              </p>
            </div>

            {/* Acceptable Use */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                Acceptable Use Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree NOT to use dingy.app to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful or malicious code</li>
                <li>Harass, abuse, or harm others</li>
                <li>Spam or send unsolicited communications</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with the service's operation</li>
                <li>Access or attempt to access other users' accounts</li>
              </ul>
            </div>

            {/* Content */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">User Content</h2>

              <h3 className="text-xl font-semibold mb-3 mt-6">Your Content</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You retain all rights to content you submit to dingy.app
                (maintenance requests, photos, messages, etc.). By submitting
                content, you grant us a license to use, store, and display that
                content as necessary to provide the service.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">
                Content Standards
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                All content must:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Be accurate and truthful</li>
                <li>
                  Not contain illegal, offensive, or inappropriate material
                </li>
                <li>Not violate any third-party rights</li>
                <li>Comply with applicable laws and regulations</li>
              </ul>
            </div>

            {/* Payment Terms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Payment and Billing</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                For paid subscription plans:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  Subscriptions are billed in advance on a monthly or annual
                  basis
                </li>
                <li>All fees are non-refundable except as required by law</li>
                <li>
                  You authorize us to charge your payment method automatically
                </li>
                <li>Prices are subject to change with 30 days notice</li>
                <li>
                  Failure to pay may result in service suspension or termination
                </li>
              </ul>
            </div>

            {/* Intellectual Property */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The dingy.app platform, including all software, designs, text,
                graphics, and other content, is owned by dingy.app and protected
                by copyright, trademark, and other intellectual property laws.
                You may not copy, modify, distribute, or create derivative works
                without our express written permission.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">
                Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                dingy.app is provided "as is" without warranties of any kind. To
                the maximum extent permitted by law:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  We are not liable for any indirect, incidental, or
                  consequential damages
                </li>
                <li>
                  Our total liability shall not exceed the amount you paid in
                  the last 12 months
                </li>
                <li>We do not guarantee uninterrupted or error-free service</li>
                <li>We are not responsible for user-generated content</li>
              </ul>
            </div>

            {/* Indemnification */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless dingy.app and its
                affiliates from any claims, damages, or expenses arising from
                your use of the service, violation of these terms, or
                infringement of any rights.
              </p>
            </div>

            {/* Termination */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Termination</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may terminate or suspend your account and access to the
                service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>For violation of these Terms</li>
                <li>For non-payment of fees</li>
                <li>At our discretion with or without notice</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You may cancel your account at any time through your account
                settings.
              </p>
            </div>

            {/* Dispute Resolution */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                Any disputes arising from these Terms or your use of dingy.app
                will be resolved through binding arbitration, except where
                prohibited by law. You waive any right to participate in class
                action lawsuits.
              </p>
            </div>

            {/* Changes to Terms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will
                notify users of material changes via email or through the
                service. Continued use of dingy.app after changes constitutes
                acceptance of the new Terms.
              </p>
            </div>

            {/* Governing Law */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by and construed in accordance with the
                laws of [Your Jurisdiction], without regard to conflict of law
                principles.
              </p>
            </div>

            {/* Contact */}
            <div className="mb-12 p-6 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Mail className="h-6 w-6 text-blue-600" />
                Contact Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have questions about these Terms of Service, please
                contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Email:</strong> legal@dingy.app
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
