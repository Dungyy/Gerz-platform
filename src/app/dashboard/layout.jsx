"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // Listen for profile updates from settings page
    const handleProfileUpdate = () => {
      console.log("Profile update event received, reloading...");
      loadProfile();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await loadProfile(user.id);
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/login");
    }
  }

  async function loadProfile(userId) {
    try {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;

      if (!uid) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*, organization:organizations(*)")
        .eq("id", uid)
        .single();

      if (error) {
        console.error("Profile load error:", error);
        router.push("/login");
        return;
      }

      console.log("Profile loaded:", data);
      setProfile(data);
    } catch (error) {
      console.error("Load profile error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
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
    <div className="min-h-screen bg-background">
      <Sidebar profile={profile} currentPath={pathname} />
      
      <div className="lg:pl-64">
        <Header profile={profile} />
        
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <Footer profile={profile} />
      </div>
    </div>
  );
}
