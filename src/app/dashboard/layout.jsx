"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  async function checkUser() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No user found:", userError);
        router.push("/login");
        return;
      }

      console.log("User found:", user.id);

      // Get profile with organization
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          *,
          organization:organizations(*)
        `
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        setLoading(false);
        return;
      }

      console.log("Profile loaded:", profileData);

      setUser(user);
      setProfile(profileData);
      setLoading(false);
    } catch (error) {
      console.error("Check user error:", error);
      setLoading(false);
    }
  }

  useEffect(() => {
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <p className="text-gray-600 mb-4">Please contact support</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sidebar */}
      <Sidebar profile={profile} currentPath={pathname} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Header */}
        <Header profile={profile} />

        {/* Main Content - Add top padding on mobile for fixed navbar */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-20 lg:pt-6 pb-6">
          {children}
        </main>

        {/* Footer */}
        <Footer profile={profile} />
      </div>
    </div>
  );
}
