import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          error: "Search query must be at least 2 characters",
        },
        { status: 400 }
      );
    }

    console.log("🔍 Searching organizations for:", query);

    // Search organizations by name or code
    const { data: organizations, error } = await supabaseAdmin
      .from("organizations")
      .select("id, name, organization_code, slug, plan")
      .or(`name.ilike.%${query}%,organization_code.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("❌ Search error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Found", organizations?.length || 0, "organizations");

    return NextResponse.json(organizations || []);
  } catch (error) {
    console.error("❌ Organization search error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search organizations" },
      { status: 500 }
    );
  }
}
