"use client";

import { Suspense } from "react";
import SignupForm from "./signup-form";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function SignupPage() {
  return (
    <div>
      <Navbar />
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        }
      >
        <SignupForm />
      </Suspense>
      <Footer />
    </div>
  );
}
