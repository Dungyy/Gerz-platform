"use client";

import { Suspense } from "react";
import SignupForm from "./signup-form";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense
          fallback={
            <div className="w-full max-w-md flex flex-col items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground text-center">Loading...</p>
            </div>
          }
        >
          <SignupForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
